from fastapi import APIRouter, Depends, Request, Header, Body, HTTPException
from sqlalchemy.orm import Session
from services.onedrive_service import (
    start_onedrive_login,
    handle_onedrive_callback,
    get_onedrive_files_service,
    get_onedrive_duplicates_service,
    smart_organise_service,
    delete_files_service,
    get_onedrive_files_recursive_service,
    start_onedrive_scan_job_service,
    get_scan_job_status_service,
    SCAN_JOBS
)
from database import get_db
from typing import Optional, Dict, Any, List
from config import debug_log
from auth import get_current_user
from models import User, CloudConnection
from onedrive_api import get_onedrive_storage_quota

router = APIRouter()

@router.get("/api/onedrive/files")
def get_files(
    folder_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    debug_log(f"Getting OneDrive files for user {current_user.id}, folder_id: {folder_id}")
    return get_onedrive_files_service(current_user, db, folder_id)

@router.post("/api/onedrive/duplicates")
def get_duplicates(
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder_ids = payload.get("folder_ids", [])
    recursive = payload.get("recursive", False)
    debug_log(f"Getting OneDrive duplicates for user {current_user.id} in folders {folder_ids}")
    return get_onedrive_duplicates_service(current_user, db, folder_ids, recursive)

@router.post("/api/onedrive/delete_files")
def delete_files(
    payload: Dict[str, List[str]] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_ids = payload.get("file_ids", [])
    if not file_ids:
        raise HTTPException(status_code=400, detail="No file_ids provided for deletion.")
    
    debug_log(f"Deleting files {file_ids} for user {current_user.id}")
    return delete_files_service(current_user, db, file_ids)

@router.post("/api/onedrive/smart_organise")
def smart_organise(
    options: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    debug_log(f"Starting smart organise for user {current_user.id} with options: {options}")
    return smart_organise_service(current_user, db, options)

@router.get("/auth/onedrive/login")
def onedrive_login(session_id: Optional[str] = None, authorization: Optional[str] = Header(None), user_id: Optional[int] = None, db: Session = Depends(get_db)):
    debug_log(f"onedrive_login router called with session_id: {session_id}, authorization header present: {authorization is not None}, user_id: {user_id}")
    return start_onedrive_login(session_id, authorization, db, user_id)

@router.get("/auth/microsoft/login")
def microsoft_login(session_id: Optional[str] = None, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return start_onedrive_login(session_id, authorization, db)

@router.get("/auth/onedrive/callback")
def onedrive_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    return handle_onedrive_callback(request, code, state, db)

@router.post("/api/onedrive/recursive_files")
def get_files_recursive(
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder_ids = payload.get("folder_ids", [])
    max_depth = payload.get("max_depth", 5)
    concurrent = payload.get("concurrent", True)
    return get_onedrive_files_recursive_service(current_user, db, folder_ids, max_depth, concurrent)

@router.post("/api/onedrive/scan_job")
def start_scan_job(
    payload: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folder_ids = payload.get("folder_ids", [])
    max_depth = payload.get("max_depth", 5)
    return start_onedrive_scan_job_service(current_user, db, folder_ids, max_depth)

@router.get("/api/onedrive/scan_job/{job_id}/status")
def get_scan_job_status(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_scan_job_status_service(current_user, db, job_id)

@router.post("/api/onedrive/scan_job/{job_id}/cancel")
def cancel_scan_job(job_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if job_id not in SCAN_JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    SCAN_JOBS[job_id]["cancelled"] = True
    return {"status": "cancelling", "job_id": job_id}

@router.get("/api/onedrive/storage_quota")
def get_storage_quota(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the user's OneDrive storage quota (total, used, remaining)"""
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Active OneDrive connection not found.")
    return get_onedrive_storage_quota(connection, db) 