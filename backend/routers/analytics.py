from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from services.analytics_service import get_file_analytics_service

router = APIRouter()

@router.get("/api/analytics/files")
def get_file_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_file_analytics_service(current_user, db) 