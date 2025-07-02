import uuid
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from backend.auth import decode_access_token
from backend.models import CloudConnection, User
import requests
import os
from backend.config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI, sessions
from backend.helpers import debug_log
from fastapi import HTTPException
from backend.onedrive_api import get_onedrive_folder_contents, get_all_files_recursively, create_folder_if_not_exists, move_file, delete_file_batch, get_all_files_recursively_with_depth
from collections import defaultdict
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import threading
import time

# In-memory job store for scan jobs (for demo; replace with persistent store for production)
SCAN_JOBS = {}

def get_onedrive_duplicates_service(current_user: User, db: Session, folder_ids: List[str], recursive: bool):
    """
    Finds duplicate files in specific OneDrive folders.
    If 'recursive' is True, it will be handled by the delta query.
    """
    debug_log(f"Starting duplicate scan for user: {current_user.id} in folders: {folder_ids}")

    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()

    if not connection or not connection.access_token:
        raise HTTPException(status_code=403, detail="Active OneDrive connection not found for this user.")

    try:
        # The 'recursive' flag is implicitly handled by the delta query starting from a folder
        all_files = get_all_files_recursively(connection, db, folder_ids)
    except HTTPException as e:
        if e.status_code == 401:
            # A 401 from the API layer after a refresh attempt means the refresh token is invalid.
            # Trigger a re-auth on the frontend by sending a 403.
            raise HTTPException(status_code=403, detail="OneDrive refresh token is invalid. Please reconnect your account.")
        raise e

    # Step 1: Group files by size
    files_by_size = defaultdict(list)
    for f in all_files:
        if f['size'] > 0: # Optionally ignore empty files
            files_by_size[f['size']].append(f)
            
    # Step 2: From size-groups, group by hash
    duplicates = []
    for size_group in files_by_size.values():
        if len(size_group) < 2:
            continue # Not enough files of the same size to have a duplicate

        hashes_in_group = defaultdict(list)
        for f in size_group:
            # A file might not have a hash
            if f.get('hash'):
                hashes_in_group[f['hash']].append(f)
        
        # Step 3: Collect actual duplicates (groups with more than one file)
        for hash_group in hashes_in_group.values():
            if len(hash_group) > 1:
                duplicates.append(hash_group)
    
    debug_log(f"Found {len(duplicates)} groups of duplicate files for user {current_user.id}")
    return {"duplicates": duplicates}

FILE_TYPE_MAPPINGS = {
    "Documents": [".pdf", ".docx", ".doc", ".txt", ".pptx", ".xlsx", ".md"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".heic"],
    "Videos": [".mp4", ".mov", ".avi", ".mkv"],
    "Audio": [".mp3", ".wav", ".aac"],
    "Archives": [".zip", ".rar", ".7z", ".tar", ".gz"],
}

def get_file_category(filename: str) -> str:
    extension = os.path.splitext(filename)[1].lower()
    for category, extensions in FILE_TYPE_MAPPINGS.items():
        if extension in extensions:
            return category
    return "Others"

def delete_files_service(current_user: User, db: Session, file_ids: List[str]):
    """
    Deletes a list of files for the given user using batch processing.
    """
    debug_log(f"Service deleting files {file_ids} for user {current_user.id}")
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()

    if not connection or not connection.access_token:
        raise HTTPException(status_code=403, detail="Active OneDrive connection not found.")

    try:
        results = delete_file_batch(connection, db, file_ids)
        
        successful_deletes = [res for res in results if res["success"]]
        failed_deletes = [res for res in results if not res["success"]]
        
        if failed_deletes:
            return {"status": "partial_success", "deleted": len(successful_deletes), "errors": failed_deletes}
            
        return {"status": "success", "deleted": len(successful_deletes)}

    except HTTPException as e:
        # The exception from the API layer is already well-formed.
        raise e
    except Exception as e:
        debug_log(f"An unexpected error occurred during batch delete: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during file deletion.")

def smart_organise_service(current_user: User, db: Session, options: Dict[str, Any]):
    strategy = options.get("strategy")
    
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    
    if not connection or not connection.access_token:
        raise HTTPException(status_code=403, detail="Active OneDrive connection not found.")
        
    if strategy == "by_file_type":
        try:
            # 1. Get all files from the root of the drive
            all_files = get_all_files_recursively(connection, db, folder_ids=["root"])
            
            # 2. Create base folder
            base_folder_id = create_folder_if_not_exists(connection, db, "root", "Smartly Organized")
            
            summary = {"moved": 0, "errors": 0, "details": []}
            category_folders = {}
            
            for file in all_files:
                category = get_file_category(file["name"])
                
                if category not in category_folders:
                    category_folder_id = create_folder_if_not_exists(connection, db, base_folder_id, category)
                    category_folders[category] = category_folder_id
                
                try:
                    move_file(connection, db, file["id"], category_folders[category])
                    summary["moved"] += 1
                    summary["details"].append(f"Moved {file['name']} to {category}")
                except HTTPException as move_error:
                    summary["errors"] += 1
                    summary["details"].append(f"Failed to move {file['name']}: {move_error.detail}")
            
            return summary
            
        except Exception as e:
            debug_log(f"An unexpected error occurred during smart organisation: {e}")
            raise HTTPException(status_code=500, detail="An unexpected error occurred.")
            
    else:
        raise HTTPException(status_code=400, detail="Invalid organisation strategy")

def start_onedrive_login(session_id, authorization, db, user_id_param=None):
    debug_log(f"start_onedrive_login called with session_id: {session_id}, authorization: {authorization[:50] if authorization else 'None'}..., user_id_param: {user_id_param}")
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        debug_log(f"Extracted token: {token[:20]}...")
        payload = decode_access_token(token)
        debug_log(f"Decoded payload: {payload}")
        user_id = int(payload["sub"]) if payload and "sub" in payload else None
        debug_log(f"Extracted user_id from token: {user_id}")
    
    # If we couldn't get user_id from token, use the query parameter
    if not user_id and user_id_param:
        user_id = int(user_id_param)
        debug_log(f"Using user_id from query parameter: {user_id}")
    
    if not session_id or session_id not in sessions:
        session_id = f"session_{uuid.uuid4()}"
        sessions[session_id] = {"provider": "onedrive", "created": str(datetime.now(timezone.utc))}
        debug_log(f"Created new session: {session_id}")
    if user_id:
        sessions[session_id]["user_id"] = user_id
        debug_log(f"Stored user_id {user_id} in session {session_id}")
    debug_log(f"Final session state: {sessions[session_id]}")
    debug_log("Generated new session_id:", session_id)
    params = {
        "client_id": MICROSOFT_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "response_mode": "query",
        "scope": "Files.ReadWrite.All offline_access",
        "state": session_id
    }
    url = f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" + "&".join(f"{k}={v}" for k, v in params.items())
    debug_log("Redirecting to:", url)
    return RedirectResponse(url)

def handle_onedrive_callback(request, code, state, db):
    debug_log("/auth/onedrive/callback called, code:", code, "state:", state)
    debug_log("Current sessions keys:", list(sessions.keys()))
    if not code or not state or state not in sessions:
        debug_log("Missing code or invalid session. code:", code, "state:", state)
        raise HTTPException(status_code=400, detail="Missing code or invalid session")

    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    data = {
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "code": code,
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    token_resp = requests.post(token_url, data=data, headers=headers)

    if token_resp.status_code != 200:
        debug_log("Token request failed:", token_resp.text)
        raise HTTPException(status_code=400, detail="Failed to get access token from Microsoft")
    
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token in response")

    userinfo_resp = requests.get("https://graph.microsoft.com/v1.0/me", headers={"Authorization": f"Bearer {access_token}"})
    userinfo = userinfo_resp.json()
    provider_user_email = userinfo.get("mail") or userinfo.get("userPrincipalName")
    provider_user_id = userinfo.get("id")
    debug_log(f"Microsoft user info: id={provider_user_id}, email={provider_user_email}")
    
    user = None
    user_id_from_session = sessions[state].get("user_id")
    debug_log(f"Session state '{state}' contains user_id: {user_id_from_session}")

    if user_id_from_session:
        # User is already logged in, connecting their drive
        user = db.query(User).filter(User.id == user_id_from_session).first()
        debug_log(f"Found existing logged-in user: {user.email if user else 'None'}")
    else:
        # This is a social login flow
        debug_log("No user_id in session, treating as social login flow.")
        user = db.query(User).filter_by(provider="microsoft", provider_id=provider_user_id).first()
        if not user:
            debug_log(f"No existing user found for provider_id {provider_user_id}. Creating new user.")
            user = User()
            user.email = provider_user_email
            user.name = userinfo.get("displayName")
            user.provider = "microsoft"
            user.provider_id = provider_user_id
            user.is_active = True
            db.add(user)
            db.commit()
            db.refresh(user)
            debug_log(f"New user created with id: {user.id}")
        else:
            debug_log(f"Found existing user by provider_id: {user.email}")
        # Add user_id to session to log them in
        sessions[state]["user_id"] = user.id
        debug_log(f"Set user_id in session: {user.id}")

    if user:
        debug_log(f"Proceeding to create/update CloudConnection for user_id: {user.id}")
        # Now, for this user, create/update their CloudConnection
        connection = db.query(CloudConnection).filter_by(user_id=user.id, provider="onedrive").first()
        if not connection:
            debug_log("No existing OneDrive connection found for this user. Creating new one.")
            connection = CloudConnection()
            connection.user_id = user.id
            connection.provider = "onedrive"
            connection.access_token = access_token
            connection.refresh_token = refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
            db.add(connection)
        else:
            debug_log("Existing OneDrive connection found. Updating tokens.")
            connection.access_token = access_token
            connection.refresh_token = refresh_token or connection.refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
        db.commit()
        debug_log("Successfully committed CloudConnection to the database.")

    sessions[state]["onedrive_token"] = access_token
    if refresh_token:
        sessions[state]["onedrive_refresh_token"] = refresh_token
        
    debug_log("Token response:", token_json)
    frontend_url = f"http://localhost:5173/?session_id={state}"
    return RedirectResponse(url=frontend_url)

def get_onedrive_files_service(current_user: User, db: Session, folder_id: str = None):
    debug_log(f"get_onedrive_files_service: user_id={current_user.id}, folder_id={folder_id}")
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Active OneDrive connection not found.")

    try:
        # Use folder_id, not the old 'path' variable
        files = get_onedrive_folder_contents(connection, db, folder_id)
        debug_log(f"Files retrieved: {files}")
        return {"files": files}
    except HTTPException as e:
        debug_log(f"Error retrieving files: {e.status_code}: {e.detail}")
        # Re-raise the original exception to see the real error details on the frontend/logs
        raise e
    except Exception as e:
        debug_log(f"An unexpected error occurred during file fetch: {e}")
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")

def get_onedrive_files_recursive_service(current_user: User, db: Session, folder_ids: List[str], max_depth: int = 5, concurrent: bool = True):
    """
    Recursively fetch all files under the given folders, up to max_depth, using async/concurrent requests if enabled.
    """
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Active OneDrive connection not found.")
    all_files = get_all_files_recursively_with_depth(connection, db, folder_ids, max_depth, concurrent)
    return {"files": all_files, "note": f"Depth={max_depth}, concurrent={concurrent}"}

def start_onedrive_scan_job_service(current_user: User, db: Session, folder_ids: List[str], max_depth: int = 5):
    """
    Starts a background job to recursively scan for files. Returns a job_id.
    Tracks progress as folders are traversed. Supports cancellation and improved progress reporting.
    """
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Active OneDrive connection not found.")
    job_id = str(uuid.uuid4())
    SCAN_JOBS[job_id] = {
        "status": "pending",
        "progress": 0,
        "result": None,
        "error": None,
        "folders_visited": 0,
        "files_found": 0,
        "cancelled": False
    }
    def job():
        try:
            SCAN_JOBS[job_id]["status"] = "running"
            folders_visited = set()
            files_found = []
            def progress_traverse(folder_id: str, depth: int):
                if SCAN_JOBS[job_id]["cancelled"]:
                    raise Exception("Job cancelled by user.")
                if depth > max_depth or folder_id in folders_visited:
                    return []
                folders_visited.add(folder_id)
                items = get_onedrive_folder_contents(connection, db, folder_id)
                files = [item for item in items if item["type"] == "file"]
                folders = [item for item in items if item["type"] == "folder"]
                files_found.extend(files)
                # Update progress
                SCAN_JOBS[job_id]["folders_visited"] = len(folders_visited)
                SCAN_JOBS[job_id]["files_found"] = len(files_found)
                SCAN_JOBS[job_id]["progress"] = min(99, int(100 * len(folders_visited) / (len(folders_visited) + len(folders) + 1)))
                sub_results = []
                for folder in folders:
                    sub_results.extend(progress_traverse(folder["id"], depth + 1))
                return files + sub_results
            all_files = []
            for folder_id in folder_ids:
                all_files.extend(progress_traverse(folder_id, 1))
            SCAN_JOBS[job_id]["result"] = all_files
            SCAN_JOBS[job_id]["status"] = "complete"
            SCAN_JOBS[job_id]["progress"] = 100
        except Exception as e:
            if str(e) == "Job cancelled by user.":
                SCAN_JOBS[job_id]["status"] = "cancelled"
                SCAN_JOBS[job_id]["error"] = "Job was cancelled by user."
            else:
                SCAN_JOBS[job_id]["status"] = "error"
                SCAN_JOBS[job_id]["error"] = str(e)
    threading.Thread(target=job, daemon=True).start()
    return {"job_id": job_id}

def get_scan_job_status_service(current_user: User, db: Session, job_id: str):
    """
    Returns the status and result of a scan job.
    """
    job = SCAN_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job 