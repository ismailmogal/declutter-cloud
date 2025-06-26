from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from services.images_service import get_duplicate_images_service

router = APIRouter()

@router.get("/api/images/duplicates")
def get_duplicate_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_duplicate_images_service(current_user, db) 