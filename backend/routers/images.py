from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
from models import User
from services.images_service import get_duplicate_images_service, get_image_download_urls_service

router = APIRouter()

@router.get("/api/images/duplicates")
def get_duplicate_images(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get duplicate images with metadata (no URLs initially)"""
    return get_duplicate_images_service(current_user, db)

@router.post("/api/images/download-urls")
def get_image_download_urls(
    file_ids: List[int] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch download URLs for specific image files on-demand"""
    return get_image_download_urls_service(file_ids, current_user, db) 