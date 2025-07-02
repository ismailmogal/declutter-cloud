import requests
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import os
from typing import List, Dict, Any, Optional
from backend.helpers import debug_log
from backend.config import MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI
from backend.models import CloudConnection
from sqlalchemy.orm import Session
import concurrent.futures

# Microsoft Graph API constants
GRAPH_API_BASE_URL = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
REQUIRED_SCOPES = "Files.ReadWrite.All User.Read offline_access"

def refresh_onedrive_token(connection: CloudConnection, db: Session) -> None:
    """
    Refreshes the OneDrive access token and updates the database.
    Raises HTTPException on failure.
    """
    debug_log("Attempting to refresh OneDrive token.")
    data = {
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": connection.refresh_token,
        "redirect_uri": MICROSOFT_REDIRECT_URI,
        "scope": REQUIRED_SCOPES,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    resp = requests.post(TOKEN_URL, data=data, headers=headers)

    if resp.status_code != 200:
        error_details = resp.json()
        debug_log(f"Failed to refresh OneDrive token. Status: {resp.status_code}, Response: {error_details}")
        raise HTTPException(
            status_code=401,
            detail=f"Token refresh failed: {error_details.get('error_description', 'No error description.')}"
        )

    new_token_data = resp.json()
    connection.access_token = new_token_data['access_token']
    if 'refresh_token' in new_token_data:
        # Microsoft may issue a new refresh token which should be used from now on
        connection.refresh_token = new_token_data['refresh_token']

    db.add(connection)
    db.commit()
    debug_log("Token refreshed and updated in DB successfully.")

def _make_graph_api_request(
    method: str,
    url: str,
    connection: CloudConnection,
    db: Session,
    **kwargs: Any
) -> requests.Response:
    """
    Makes a request to the Microsoft Graph API, handling token refresh robustly.
    On 401, always attempt a token refresh and retry once. If still 401, raise HTTPException.
    Returns the raw requests.Response object.
    """
    headers = {
        "Authorization": f"Bearer {connection.access_token}",
        **kwargs.pop("headers", {})
    }

    debug_log(f"Requesting ({method}): {url}")
    resp = requests.request(method, url, headers=headers, **kwargs)

    if resp.status_code == 401:
        try:
            refresh_onedrive_token(connection, db)
        except HTTPException as e:
            # Re-raise with a more user-friendly message
            raise HTTPException(status_code=401, detail=f"Failed to refresh token: {e.detail}. Please reconnect your account.")

        debug_log("Retrying API call with new token after refresh.")
        headers["Authorization"] = f"Bearer {connection.access_token}"
        resp = requests.request(method, url, headers=headers, **kwargs)

        if resp.status_code == 401:
            # If still unauthorized after refresh, raise immediately
            error_detail = resp.json().get('error', {}).get('message', resp.text)
            raise HTTPException(status_code=401, detail=f"Graph API 401 after refresh: {error_detail}. Please reconnect your account.")

    return resp

def get_onedrive_folder_contents(connection: CloudConnection, db: Session, folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetches the contents of a specific OneDrive folder.
    """
    folder_specifier = f"items/{folder_id}/children" if folder_id and folder_id != "root" else "root/children"
    graph_url = f"{GRAPH_API_BASE_URL}/me/drive/{folder_specifier}?$select=id,name,lastModifiedDateTime,size,file,folder,parentReference"

    resp = _make_graph_api_request("GET", graph_url, connection, db)

    if resp.status_code != 200:
        error_detail = resp.json().get('error', {}).get('message', resp.text)
        raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch folder contents: {error_detail}")

    data = resp.json()
    files = []
    for item in data.get("value", []):
        file_type = "folder" if "folder" in item else "file"
        files.append({
            "id": item["id"],
            "name": item["name"],
            "type": file_type,
            "last_modified": item.get("lastModifiedDateTime"),
            "size": item.get("size"),
            "path": item.get("parentReference", {}).get("path")
        })
    return files

def get_all_files_recursively(connection: CloudConnection, db: Session, folder_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Fetches a flat list of all files from the specified folders using the delta endpoint.
    """
    all_files = []
    select_fields = "id,name,size,file,parentReference,deleted,lastModifiedDateTime"

    for folder_id in folder_ids:
        delta_url = f"{GRAPH_API_BASE_URL}/me/drive/items/{folder_id}/delta?select={select_fields}"
        
        while delta_url:
            resp = _make_graph_api_request("GET", delta_url, connection, db)
            
            if resp.status_code != 200:
                error_detail = resp.json().get('error', {}).get('message', resp.text)
                raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch delta changes: {error_detail}")

            data = resp.json()
            for item in data.get("value", []):
                # We only care about files, not folders, and only existing files.
                if item.get("file") and not item.get("deleted"):
                    all_files.append({
                        "id": item["id"],
                        "name": item["name"],
                        "size": item.get("size", 0),
                        "hash": item.get("file", {}).get("hashes", {}).get("quickXorHash"),
                        "path": item.get("parentReference", {}).get("path"),
                        "last_modified": item.get("lastModifiedDateTime")
                    })

            delta_url = data.get("@odata.nextLink")

    return all_files

def get_all_files_recursively_with_depth(connection: CloudConnection, db: Session, folder_ids: List[str], max_depth: int = 5, use_concurrent: bool = True) -> List[Dict[str, Any]]:
    """
    Recursively fetch all files under the given folders, up to max_depth. Uses concurrency if enabled.
    Only files are returned; folders are traversed.
    """
    results = []
    visited = set()

    def _traverse(folder_id: str, depth: int):
        if depth > max_depth or folder_id in visited:
            return []
        visited.add(folder_id)
        items = get_onedrive_folder_contents(connection, db, folder_id)
        files = [item for item in items if item["type"] == "file"]
        folders = [item for item in items if item["type"] == "folder"]
        sub_results = []
        if use_concurrent and folders:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = [executor.submit(_traverse, f["id"], depth + 1) for f in folders]
                for fut in concurrent.futures.as_completed(futures):
                    sub_results.extend(fut.result())
        else:
            for folder in folders:
                sub_results.extend(_traverse(folder["id"], depth + 1))
        return files + sub_results

    for folder_id in folder_ids:
        results.extend(_traverse(folder_id, 1))
    return results

def create_folder_if_not_exists(connection: CloudConnection, db: Session, parent_id: str, folder_name: str) -> str:
    """
    Creates a folder if it doesn't already exist in the specified parent folder.
    Returns the ID of the existing or newly created folder.
    """
    # 1. Check if folder exists
    check_url = f"{GRAPH_API_BASE_URL}/me/drive/items/{parent_id}/children?$filter=name eq '{folder_name}'"
    resp_check = _make_graph_api_request("GET", check_url, connection, db)

    if resp_check.status_code == 200 and resp_check.json().get("value"):
        return resp_check.json()["value"][0]["id"]
    
    # 2. Create folder if not found
    create_url = f"{GRAPH_API_BASE_URL}/me/drive/items/{parent_id}/children"
    body = {
        "name": folder_name,
        "folder": {},
        "@microsoft.graph.conflictBehavior": "rename"
    }
    resp_create = _make_graph_api_request("POST", create_url, connection, db, json=body)

    if resp_create.status_code not in [200, 201]:
        raise HTTPException(status_code=resp_create.status_code, detail=f"Failed to create folder: {resp_create.text}")

    return resp_create.json()["id"]

def move_file(connection: CloudConnection, db: Session, file_id: str, target_folder_id: str) -> Dict[str, Any]:
    """
    Moves a file to a different folder.
    """
    move_url = f"{GRAPH_API_BASE_URL}/me/drive/items/{file_id}"
    body = {
        "parentReference": {
            "id": target_folder_id
        }
    }
    resp = _make_graph_api_request("PATCH", move_url, connection, db, json=body)

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Failed to move file {file_id}: {resp.text}")

    return resp.json()

def delete_file_batch(connection: CloudConnection, db: Session, file_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Deletes a list of files using the Graph API's batch endpoint.
    Returns a list of results for each deletion operation.
    """
    if not file_ids:
        return []

    batch_url = f"{GRAPH_API_BASE_URL}/$batch"
    
    # Batch requests are limited to 20 individual requests
    MAX_BATCH_SIZE = 20
    all_results = []
    
    for i in range(0, len(file_ids), MAX_BATCH_SIZE):
        chunk_ids = file_ids[i:i + MAX_BATCH_SIZE]
        
        batch_requests = []
        for j, file_id in enumerate(chunk_ids):
            batch_requests.append({
                "id": str(j + 1),
                "method": "DELETE",
                "url": f"/me/drive/items/{file_id}"
            })

        body = {"requests": batch_requests}
        resp = _make_graph_api_request("POST", batch_url, connection, db, json=body)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Batch delete request failed: {resp.text}")

        responses = resp.json().get("responses", [])
        for res in responses:
            original_request_index = int(res["id"]) - 1 + i
            original_file_id = file_ids[original_request_index]
            all_results.append({
                "id": original_file_id,
                "status": res["status"],
                "success": 200 <= res["status"] < 300
            })

    return all_results

def get_onedrive_storage_quota(connection: CloudConnection, db: Session) -> Dict[str, Any]:
    """
    Fetches the user's OneDrive storage quota (total, used, remaining) from Microsoft Graph API.
    """
    graph_url = f"{GRAPH_API_BASE_URL}/me/drive"
    resp = _make_graph_api_request("GET", graph_url, connection, db)
    if resp.status_code != 200:
        error_detail = resp.json().get('error', {}).get('message', resp.text)
        raise HTTPException(status_code=resp.status_code, detail=f"Failed to fetch storage quota: {error_detail}")
    data = resp.json()
    quota = data.get('quota', {})
    return {
        'total': quota.get('total', 0),
        'used': quota.get('used', 0),
        'remaining': quota.get('remaining', 0),
    } 