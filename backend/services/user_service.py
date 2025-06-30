from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from models import User
from auth import get_password_hash, verify_password, get_current_user
from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

def get_me_service(current_user: User = Depends(get_current_user)):
    """
    Service to get the current user's profile.
    Relies on the get_current_user dependency to identify the user.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return current_user

def change_password_service(
    db: Session, 
    user_id: int, 
    passwords: ChangePasswordRequest
):
    """
    Service to change the password for a user.
    """
    user = db.query(User).filter(User.id == user_id).first() # type: ignore
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )

    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a password set (likely uses OAuth)."
        )

    if not verify_password(passwords.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Incorrect current password"
        )
    
    if len(passwords.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    user.hashed_password = get_password_hash(passwords.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

def update_preferences_service(db: Session, user_id: int, preferences: dict):
    """
    Service to update a user's preferences.
    """
    user = db.query(User).filter(User.id == user_id).first() # type: ignore
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    
    # Merge new preferences with existing ones
    existing_prefs = user.preferences or {}
    existing_prefs.update(preferences)
    user.preferences = existing_prefs
    
    db.commit()
    db.refresh(user)
    
    return user.preferences 