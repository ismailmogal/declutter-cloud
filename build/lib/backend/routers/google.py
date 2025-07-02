from fastapi import APIRouter, Request, Depends, Header
from backend.services.google_service import google_login_service, google_callback_service
from typing import Optional
from sqlalchemy.orm import Session
from backend.database import get_db

router = APIRouter()

@router.get("/auth/google/login")
def google_login(session_id: Optional[str] = None, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return google_login_service(session_id, authorization, db)

@router.get("/auth/google/callback")
def google_callback(request: Request, code: Optional[str] = None, db: Session = Depends(get_db)):
    return google_callback_service(request, code, db)

@router.get("/auth/googledrive/login")
def googledrive_login(session_id: Optional[str] = None, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return google_login_service(session_id, authorization, db)

@router.get("/auth/googledrive/callback")
def googledrive_callback(request: Request, code: Optional[str] = None, db: Session = Depends(get_db)):
    return google_callback_service(request, code, db) 