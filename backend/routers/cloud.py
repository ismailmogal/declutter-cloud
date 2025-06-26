from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from services.cloud_service import get_cloud_connections_service, disconnect_cloud_provider_service, move_file_to_cloud_service, copy_file_to_cloud_service
from database import get_db
from auth import get_current_user
from models import User

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