from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
from models import User
from services.ai_service import get_folder_suggestions_service, accept_folder_suggestion_service, ignore_folder_suggestion_service

router = APIRouter()

@router.post("/api/ai/folder-suggestions")
def get_folder_suggestions(
    file_id: int = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_folder_suggestions_service(current_user, db, file_id)

@router.post("/api/ai/accept-suggestion")
def accept_folder_suggestion(
    file_id: int = Body(...),
    folder_id: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return accept_folder_suggestion_service(current_user, db, file_id, folder_id)

@router.post("/api/ai/ignore-suggestion")
def ignore_folder_suggestion(
    file_id: int = Body(...),
    folder_id: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ignore_folder_suggestion_service(current_user, db, file_id, folder_id) 