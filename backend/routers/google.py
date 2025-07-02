from fastapi import APIRouter, Request, Depends, Header, HTTPException
from fastapi.responses import RedirectResponse
from backend.services.google_service import google_login_service, google_callback_service
from typing import Optional
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import CloudConnection, User, OAuthState
from backend.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from backend.helpers import debug_log
from backend.routers.auth_router import get_current_user
import os, uuid
from urllib.parse import urlencode
import requests

router = APIRouter()

GOOGLE_PHOTOS_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/photoslibrary.readonly"
]

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

@router.get("/auth/googlephotos/login")
def google_photos_login(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    state = str(uuid.uuid4())
    db.add(OAuthState(state=state, user_id=current_user.id))
    db.commit()
    redirect_uri = os.getenv("GOOGLE_PHOTOS_REDIRECT_URI", "http://localhost:8000/auth/googlephotos/callback")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/photoslibrary.readonly",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"oauth_url": url}

@router.get("/auth/googlephotos/callback")
def google_photos_callback(code: str, state: str, db: Session = Depends(get_db)):
    oauth_state = db.query(OAuthState).filter(OAuthState.state == state).first()
    if not oauth_state:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")
    user_id = oauth_state.user_id
    db.delete(oauth_state)
    db.commit()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found for OAuth state.")
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = os.getenv("GOOGLE_PHOTOS_REDIRECT_URI", "http://localhost:8000/auth/googlephotos/callback")
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(token_url, data=data)
    if not resp.ok:
        raise HTTPException(status_code=400, detail="Failed to get token from Google Photos")
    token_data = resp.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    print("[DEBUG] Google Photos access_token:", access_token)
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received from Google Photos")

    # Save or update CloudConnection
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == user.id,
        CloudConnection.provider == "googlephotos"
    ).first()
    if not connection:
        connection = CloudConnection(
            user_id=user.id,
            provider="googlephotos",
            access_token=access_token,
            refresh_token=refresh_token,
            is_active=True
        )
        db.add(connection)
    else:
        connection.access_token = access_token
        if refresh_token:
            connection.refresh_token = refresh_token
        connection.is_active = True
    db.commit()
    return RedirectResponse("http://localhost:5173/settings?cloud=googlephotos&status=success") 