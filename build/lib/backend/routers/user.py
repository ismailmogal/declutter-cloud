from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.services.user_service import get_me_service, change_password_service, ChangePasswordRequest, update_preferences_service
from backend.models import User, UserSchema
from backend.auth import get_current_user
from backend.database import get_db
from typing import Dict, Any

router = APIRouter(
    prefix="/api/user",
    tags=["user"]
)

@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the profile of the currently authenticated user.
    """
    return get_me_service(current_user)

@router.post("/change-password")
def change_password(
    passwords: ChangePasswordRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the password for the currently authenticated user.
    """
    return change_password_service(db, current_user.id, passwords)

@router.put("/preferences", response_model=Dict[str, Any])
def update_preferences(
    preferences: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update preferences for the currently authenticated user.
    """
    return update_preferences_service(db, current_user.id, preferences) 