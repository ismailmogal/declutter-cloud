from fastapi.responses import RedirectResponse
from fastapi import HTTPException, Request
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, sessions, debug_log
from urllib.parse import urlencode
import requests
from models import CloudConnection, User
from sqlalchemy.orm import Session
from auth import decode_access_token
import uuid
from datetime import datetime, timezone

def google_login_service(session_id, authorization, db: Session):
    debug_log("/auth/google/login called")
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        payload = decode_access_token(token)
        user_id = int(payload["sub"]) if payload and "sub" in payload else None

    if not session_id or session_id not in sessions:
        session_id = f"session_{uuid.uuid4()}"
        sessions[session_id] = {"provider": "googledrive", "created": str(datetime.now(timezone.utc))}
    if user_id:
        sessions[session_id]["user_id"] = user_id
    debug_log("Using session_id:", session_id)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/drive.readonly",
        "access_type": "offline",
        "prompt": "consent",
        "state": session_id
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    debug_log("Redirecting to:", url)
    return RedirectResponse(url)

def google_callback_service(request: Request, code, db: Session):
    debug_log("/auth/google/callback called, code:", code)
    state = request.query_params.get("state")
    if not code or not state or state not in sessions:
        raise HTTPException(status_code=400, detail="Missing code or invalid session")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    token_resp = requests.post(token_url, data=data)
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get access token from Google")
    
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token in response")

    userinfo_resp = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
    userinfo = userinfo_resp.json()
    provider_user_email = userinfo.get("email")
    provider_user_id = userinfo.get("id")

    user = None
    user_id_from_session = sessions[state].get("user_id")

    if user_id_from_session:
        user = db.query(User).filter(User.id == user_id_from_session).first()
    else:
        user = db.query(User).filter_by(provider="google", provider_id=provider_user_id).first()
        if not user:
            user = User()
            user.email = provider_user_email
            user.name = userinfo.get("name")
            user.provider = "google"
            user.provider_id = provider_user_id
            user.is_active = True
            db.add(user)
            db.commit()
        sessions[state]["user_id"] = user.id

    if user:
        connection = db.query(CloudConnection).filter_by(user_id=user.id, provider="googledrive").first()
        if not connection:
            connection = CloudConnection()
            connection.user_id = user.id
            connection.provider = "googledrive"
            connection.access_token = access_token
            connection.refresh_token = refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
            db.add(connection)
        else:
            connection.access_token = access_token
            connection.refresh_token = refresh_token or connection.refresh_token
            connection.provider_user_id = provider_user_id
            connection.provider_user_email = provider_user_email
            connection.is_active = True
        db.commit()

    sessions[state]["googledrive_token"] = access_token
    if refresh_token:
        sessions[state]["googledrive_refresh_token"] = refresh_token

    debug_log("Google login successful for user:", provider_user_email)
    frontend_url = f"http://localhost:5173/?session_id={state}"
    return RedirectResponse(url=frontend_url) 