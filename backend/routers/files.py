from fastapi import APIRouter, Depends, Body, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from database import get_db
from auth import get_current_user
from models import User, File
from services.file_service import auto_tag_file_service, search_files_by_tags_service, cleanup_recommendations_service
from services.duplicates_service import get_duplicate_files_service, get_similar_files_service

router = APIRouter()

@router.post("/api/files/auto-tag")
def auto_tag_file(
    file_id: int = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return auto_tag_file_service(current_user, db, file_id)

@router.get("/api/files/search")
def search_files(
    tags: Optional[str] = Query(None, description="Comma-separated tags to search for"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return search_files_by_tags_service(current_user, db, tags)

@router.get("/api/files/cleanup-recommendations")
def cleanup_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return cleanup_recommendations_service(current_user, db)

@router.get("/api/files/tags")
def get_tags(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    files = db.query(File).filter_by(user_id=current_user.id).all()
    tag_set = set()
    for f in files:
        if f.tags:
            tag_set.update(tag.strip() for tag in f.tags.split(',') if tag.strip())
    return {"tags": sorted(tag_set)}

@router.get("/api/files/duplicates")
def get_duplicate_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_duplicate_files_service(current_user, db)

@router.get("/api/files/similar")
def get_similar_files(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_similar_files_service(current_user, db) 