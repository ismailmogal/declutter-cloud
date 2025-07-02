from fastapi.responses import RedirectResponse
from fastapi import HTTPException, Request
from backend.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, sessions
from backend.helpers import debug_log
from urllib.parse import urlencode
import requests
from backend.models import CloudConnection, User
from sqlalchemy.orm import Session
from backend.auth import decode_access_token
import uuid
from datetime import datetime, timezone
import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def google_login_service(session_id, authorization, db: Session):
    debug_log("/auth/google/login called")
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        payload = decode_access_token(token)
        user_id = int(payload["sub"]) if payload and "sub" in payload else None

    if not session_id or session_id not in sessions:
        session_id = f"session_{uuid.uuid4()}"
        sessions[session_id] = {"provider": "googledrive", "created": str(datetime.now(timezone.utc))}
    if user_id:
        sessions[session_id]["user_id"] = user_id
    debug_log("Using session_id:", session_id)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/drive.readonly",
        "access_type": "offline",
        "prompt": "consent",
        "state": session_id
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    debug_log("Redirecting to:", url)
    return RedirectResponse(url)

def google_callback_service(request: Request, code, db: Session):
    debug_log("/auth/google/callback called, code:", code)
    state = request.query_params.get("state")
    if not code or not state or state not in sessions:
        raise HTTPException(status_code=400, detail="Missing code or invalid session")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    token_resp = requests.post(token_url, data=data)
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get access token from Google")
    
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token in response")

    userinfo_resp = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
    userinfo = userinfo_resp.json()
    provider_user_email = userinfo.get("email")
    provider_user_id = userinfo.get("id")

    user = None
    user_id_from_session = sessions[state].get("user_id")

    if user_id_from_session:
        user = db.query(User).filter(User.id == user_id_from_session).first()
    else:
        user = db.query(User).filter_by(provider="google", provider_id=provider_user_id).first()
        if not user:
            user = User()
            user.email = provider_user_email
            user.name = userinfo.get("name")
            user.provider = "google"
            user.provider_id = provider_user_id
            user.is_active = True
            db.add(user)
            db.commit()
        sessions[state]["user_id"] = user.id

    if user:
        connection = db.query(CloudConnection).filter_by(user_id=user.id, provider="googledrive").first()
        if not connection:
            connection = CloudConnection()
            connection.user_id = user.id
            connection.provider = "googledrive"
            connection.access_token = access_token
            connection.refresh_token = refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
            db.add(connection)
        else:
            connection.access_token = access_token
            connection.refresh_token = refresh_token or connection.refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
        db.commit()

    sessions[state]["googledrive_token"] = access_token
    if refresh_token:
        sessions[state]["googledrive_refresh_token"] = refresh_token

    debug_log("Google login successful for user:", provider_user_email)
    frontend_url = f"http://localhost:5173/?session_id={state}"
    return RedirectResponse(url=frontend_url)

def start_google_login(request: Request, db: Session, user_id: int):
    state = f"{user_id}:{os.urandom(8).hex()}"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return RedirectResponse(url=url)

def handle_google_callback(request: Request, db: Session):
    params = dict(request.query_params)
    code = params.get("code")
    state = params.get("state")
    if not code:
        return {"error": "No code in callback"}
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    resp = requests.post(token_url, data=data)
    if resp.status_code != 200:
        return {"error": "Failed to get tokens", "details": resp.text}
    tokens = resp.json()
    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token")
    # Get user info
    userinfo_resp = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    userinfo = userinfo_resp.json()
    provider_user_email = userinfo.get("email")
    provider_user_id = userinfo.get("id")
    # Parse user_id from state
    user_id = int(state.split(":")[0])
    # Store in CloudConnection
    connection = db.query(CloudConnection).filter_by(user_id=user_id, provider="googledrive").first()
    if not connection:
        connection = CloudConnection(
            user_id=user_id,
            provider="googledrive",
            access_token=access_token,
            refresh_token=refresh_token,
            provider_user_id=provider_user_id,
            provider_user_email=provider_user_email,
            is_active=True
        )
        db.add(connection)
    else:
        connection.access_token = access_token
        connection.refresh_token = refresh_token or connection.refresh_token
        connection.provider_user_id = provider_user_id
        connection.provider_user_email = provider_user_email
        connection.is_active = True
    db.commit()
    # Redirect to frontend
    frontend_url = f"http://localhost:5173/settings?cloud=googledrive&status=success"
    return RedirectResponse(url=frontend_url)

def get_google_files_service(current_user, db, folder_id):
    # 1. Get the user's Google CloudConnection
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'googledrive',
        CloudConnection.is_active == True
    ).first()

    if not connection or not connection.access_token:
        raise HTTPException(status_code=404, detail="Active Google Drive connection not found.")

    # 2. Build Google Drive API client
    creds = Credentials(
        token=connection.access_token,
        refresh_token=connection.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    service = build('drive', 'v3', credentials=creds)

    # 3. List files in the folder (with pagination)
    files = []
    page_token = None
    while True:
        query = f"'{folder_id}' in parents and trashed = false"
        results = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, parents)",
            pageToken=page_token
        ).execute()
        files.extend(results.get('files', []))
        page_token = results.get('nextPageToken')
        if not page_token:
            break

    # 4. Format files to match your frontend expectations
    formatted_files = []
    for f in files:
        formatted_files.append({
            "id": f["id"],
            "name": f["name"],
            "type": "folder" if f["mimeType"] == "application/vnd.google-apps.folder" else "file",
            "size": int(f.get("size", 0)),
            "modified": f.get("modifiedTime"),
            "icon": f.get("iconLink"),
            "webUrl": f.get("webViewLink"),
        })

    # 5. Optional: Build breadcrumbs (folder path)
    path = []
    current_id = folder_id
    visited = set()
    while current_id and current_id != 'root' and current_id not in visited:
        visited.add(current_id)
        meta = service.files().get(fileId=current_id, fields="id, name, parents").execute()
        path.insert(0, {"id": meta["id"], "name": meta["name"]})
        parents = meta.get("parents")
        if parents:
            current_id = parents[0]
        else:
            break
    if folder_id == 'root':
        path = []

    return {
        "files": formatted_files,
        "folder_details": {"id": folder_id, "name": path[-1]["name"] if path else "Root", "path": path}
    }

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
] 