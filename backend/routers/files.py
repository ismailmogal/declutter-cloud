from fastapi import APIRouter, Depends, Body, Query, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from database import get_db
from auth import get_current_user
from models import User, File
from services.file_service import auto_tag_file_service, search_files_by_tags_service, cleanup_recommendations_service
from services.duplicates_service import get_duplicate_files_service, get_similar_files_service
from datetime import datetime
import requests

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

@router.get("/api/files/{file_id}/download")
def proxy_file_download(file_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Proxy endpoint for downloading cached files - only for duplicate images feature"""
    file = db.query(File).filter_by(id=file_id, user_id=current_user.id).first()
    if not file or not file.url:
        raise HTTPException(status_code=404, detail="File not found or no cached URL available")
    
    # Stream the file from the cached URL
    try:
        r = requests.get(file.url, stream=True, timeout=30)
        if r.status_code != 200:
            raise HTTPException(status_code=404, detail="Unable to fetch file from cached URL")
        
        # Try to detect content type from the response headers
        content_type = r.headers.get('Content-Type', 'application/octet-stream')
        return Response(r.content, media_type=content_type)
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch file: {str(e)}")

def parse_datetime(dt):
    if not dt:
        return None
    if isinstance(dt, datetime):
        return dt
    try:
        # Handles '2024-09-04T21:47:50Z' and similar
        return datetime.fromisoformat(dt.replace('Z', '+00:00'))
    except Exception:
        return None

@router.post("/api/files/upsert")
def upsert_files(
    files: List[Dict[str, Any]] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    for file_data in files:
        db_file = db.query(File).filter_by(user_id=current_user.id, cloud_id=file_data['cloud_id']).first()
        if not db_file:
            db_file = File()
            db_file.user_id = current_user.id
            db_file.cloud_id = file_data['cloud_id']
            db_file.provider = file_data.get('provider', 'onedrive')
            db_file.name = file_data['name']
        db_file.name = file_data['name']
        db_file.size = file_data.get('size')
        parsed_modified = parse_datetime(file_data.get('last_modified'))
        if parsed_modified:
            db_file.last_modified = parsed_modified
        parsed_accessed = parse_datetime(file_data.get('last_accessed'))
        if parsed_accessed:
            db_file.last_accessed = parsed_accessed
        db_file.provider = file_data.get('provider')
        db_file.path = file_data.get('path')
        db_file.tags = file_data.get('tags')
        db_file.extra = file_data.get('extra')
        # Cache URL if provided (for performance)
        if file_data.get('url'):
            db_file.url = file_data.get('url')
        # ... set other fields as needed ...
        db.add(db_file)
    db.commit()
    return {"status": "success"}

@router.post("/api/files/delete")
def delete_files(
    ids: List[int] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = db.query(File).filter(File.id.in_(ids), File.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted} 