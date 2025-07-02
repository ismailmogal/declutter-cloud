from backend.models import File, User, CloudConnection
from sqlalchemy.orm import Session
from collections import defaultdict
import requests
from backend.onedrive_api import _make_graph_api_request

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.heic'}

def get_onedrive_access_token(user_id, db):
    conn = db.query(CloudConnection).filter(
        CloudConnection.user_id == user_id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    if conn and conn.access_token:
        return conn.access_token
    return None

def fetch_onedrive_download_url(cloud_id, db, user_id):
    """Fetch download URL from OneDrive Graph API with robust token refresh and DB update"""
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == user_id,
        CloudConnection.provider == 'onedrive',
        CloudConnection.is_active == True
    ).first()
    if not connection:
        print(f"[DEBUG] No active OneDrive connection for user_id={user_id}")
        return None
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{cloud_id}"
    resp = _make_graph_api_request("GET", url, connection, db)
    if resp.status_code == 200:
        data = resp.json()
        return data.get("@microsoft.graph.downloadUrl")
    else:
        print(f"[DEBUG] Failed to fetch download URL for cloud_id={cloud_id}. Status: {resp.status_code}, Response: {resp.text}")
    return None

def get_duplicate_images_service(current_user: User, db: Session):
    """Get duplicate images with on-demand URL fetching and caching"""
    files = db.query(File).filter_by(user_id=current_user.id).all()
    image_files = [f for f in files if any(f.name.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)]
    groups = defaultdict(list)
    
    for f in image_files:
        key = (f.name, f.size)
        groups[key].append({
            "id": f.id,
            "cloud_id": f.cloud_id,
            "provider": f.provider,
            "name": f.name,
            "size": f.size,
            "path": getattr(f, 'path', None),
            "last_modified": f.last_modified.isoformat() if f.last_modified is not None else None,
            "has_cached_url": f.url is not None  # Indicate if URL is already cached
        })
    
    duplicates = [group for group in groups.values() if len(group) > 1]
    return {"duplicates": duplicates}

def get_image_download_urls_service(file_ids: list, current_user: User, db: Session):
    """Fetch download URLs for specific image files on-demand"""
    files = db.query(File).filter(
        File.id.in_(file_ids),
        File.user_id == current_user.id
    ).all()
    
    results = []
    for f in files:
        # Check if we already have a cached URL
        if f.url:
            results.append({
                "id": f.id,
                "url": f.url,
                "cached": True
            })
            continue
        
        # Fetch new URL if needed
        if f.provider == 'onedrive':
            download_url = fetch_onedrive_download_url(f.cloud_id, db, current_user.id)
            if download_url:
                # Cache the URL in the database
                f.url = download_url
                db.add(f)
                results.append({
                    "id": f.id,
                    "url": download_url,
                    "cached": False
                })
            else:
                results.append({
                    "id": f.id,
                    "url": None,
                    "error": "Failed to fetch download URL"
                })
        else:
            results.append({
                "id": f.id,
                "url": None,
                "error": f"Provider {f.provider} not supported for URL fetching"
            })
    
    # Commit any cached URLs
    db.commit()
    
    return {"urls": results} 