from backend.models import CloudConnection
from fastapi import HTTPException
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from backend.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
import logging
import requests

DISCOVERY_URL = "https://photoslibrary.googleapis.com/$discovery/rest?version=v1"

def get_google_photos_files_service(current_user, db, folder_id):
    try:
        # 1. Get the user's Google Photos CloudConnection
        connection = db.query(CloudConnection).filter(
            CloudConnection.user_id == current_user.id,
            CloudConnection.provider == 'googlephotos',
            CloudConnection.is_active == True
        ).first()

        if not connection or not connection.access_token:
            raise HTTPException(status_code=401, detail="Google Photos account not connected.")

        creds = Credentials(
            token=connection.access_token,
            refresh_token=connection.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/photoslibrary.readonly"]
        )

        # Optionally refresh token if expired
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                connection.access_token = creds.token
                db.commit()
            except Exception as e:
                logging.exception("Google Photos token refresh failed")
                # If token is invalid_grant, remove the connection and prompt user to reconnect
                error_str = str(e)
                if 'invalid_grant' in error_str or 'Token has been expired or revoked' in error_str:
                    db.delete(connection)
                    db.commit()
                    raise HTTPException(status_code=401, detail="Google Photos token expired or revoked. Please reconnect your account.")
                raise HTTPException(status_code=401, detail="Google Photos token refresh failed. Please reconnect your account.")

        # Debug: Print access token and its scopes using tokeninfo endpoint
        try:
            print("[DEBUG] Google Photos access token:", creds.token)
            r = requests.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={creds.token}")
            print("[DEBUG] tokeninfo response:", r.json())
        except Exception as e:
            print("[DEBUG] Failed to fetch tokeninfo:", e)

        service = build('photoslibrary', 'v1', credentials=creds, discoveryServiceUrl=DISCOVERY_URL)
        results = service.mediaItems().list(pageSize=100).execute()
        items = results.get('mediaItems', [])
        logging.info(f"[Google Photos] Returned {len(items)} items for user_id={current_user.id}")
        if items:
            logging.info(f"[Google Photos] First 3 items: {[{'id': i['id'], 'name': i.get('filename', '')} for i in items[:3]]}")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Failed to fetch Google Photos")
        raise HTTPException(status_code=502, detail="Failed to fetch Google Photos. Please reconnect your account.")

    files = [
        {
            "id": item["id"],
            "name": item.get("filename", ""),
            "mimeType": item.get("mimeType", ""),
            "thumbnail": item["baseUrl"] + "=w200-h200",  # for preview
            "url": item["baseUrl"],  # original
            "createdTime": item.get("mediaMetadata", {}).get("creationTime", "")
        }
        for item in items
    ]

    return {
        "files": files,
        "folder_details": {"id": folder_id, "name": "Google Photos", "path": []}
    } 