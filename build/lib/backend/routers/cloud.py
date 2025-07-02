from fastapi import APIRouter, Depends, Body, HTTPException, Request
from sqlalchemy.orm import Session
from backend.services.cloud_service import get_cloud_connections_service, disconnect_cloud_provider_service, move_file_to_cloud_service, copy_file_to_cloud_service, get_files_for_provider
from backend.database import get_db
from backend.auth import get_current_user, get_current_user_optional
from backend.models import User
from backend.services.cloud_provider_registry import get_provider_service
from typing import Optional

router = APIRouter()

@router.get("/api/cloud/connections")
def get_cloud_connections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_cloud_connections_service(current_user, db)

@router.post("/api/cloud/disconnect")
def disconnect_cloud_provider(
    provider_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return disconnect_cloud_provider_service(provider_data, current_user, db)

@router.post("/api/cloud/move")
def move_file_to_cloud(
    file_id: int = Body(...),
    target_cloud: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return move_file_to_cloud_service(current_user, db, file_id, target_cloud)

@router.post("/api/cloud/copy")
def copy_file_to_cloud(
    file_id: int = Body(...),
    target_cloud: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return copy_file_to_cloud_service(current_user, db, file_id, target_cloud)

# --- Generic connect/callback endpoints ---
@router.get("/api/cloud/connect/{provider}")
def connect_cloud_provider(provider: str, request: Request, db: Session = Depends(get_db)):
    current_user = get_current_user_optional(request, db)
    service = get_provider_service(provider)
    if not service or not service.get("start_login"):
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    return service["start_login"](request=request, db=db, user_id=current_user.id)

@router.get("/api/cloud/callback/{provider}")
def cloud_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    service = get_provider_service(provider)
    if not service or not service.get("handle_callback"):
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    return service["handle_callback"](request=request, db=db)

@router.get("/api/{provider}/files")
def get_files(provider: str, folder_id: str = "root", current_user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    try:
        return get_files_for_provider(provider, current_user, db, folder_id, request)
    except NotImplementedError:
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' not supported")

@router.get("/api/googlephotos/files")
def get_google_photos_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Optional[Request] = None):
    return get_files_for_provider('googlephotos', current_user, db, folder_id='root', request=request) 