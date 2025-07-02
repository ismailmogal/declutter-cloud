from fastapi import HTTPException
from backend.models import CloudConnection, File, User
from sqlalchemy.orm import Session
from backend.services.onedrive_service import get_onedrive_files_service
from backend.services.google_service import get_google_files_service
from backend.services.google_photos_service import get_google_photos_files_service

def get_cloud_connections_service(current_user, db):
    print(f"[DEBUG] Fetching cloud connections for user_id: {current_user.id}")
    connections = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.is_active == True
    ).all()
    print(f"[DEBUG] Found {len(connections)} active connections in the database.")
    
    def has_write_scope(scopes, provider):
        if not scopes:
            return False
        scopes = scopes.lower()
        if provider == 'onedrive':
            return 'readwrite' in scopes or 'files.readwrite.all' in scopes
        elif provider == 'googledrive':
            return 'drive' in scopes and 'readonly' not in scopes
        return False
    
    result = [
        {
            "id": conn.id,
            "provider": conn.provider,
            "provider_user_email": conn.provider_user_email,
            "email": conn.provider_user_email,  # For frontend consistency
            "created_at": conn.created_at.isoformat() if conn.created_at else None,
            "is_active": conn.is_active,
            "can_write": has_write_scope(conn.scopes, conn.provider)
        }
        for conn in connections
    ]
    print(f"[DEBUG] Returning connection data to frontend: {result}")
    return result

def disconnect_cloud_provider_service(provider_data, current_user, db):
    provider = provider_data.get("provider")
    if not provider:
        raise HTTPException(status_code=400, detail="Provider is required")
    connection = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.provider == provider,
        CloudConnection.is_active == True
    ).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    connection.is_active = False
    db.commit()
    return {"message": f"Disconnected from {provider}"}

def move_file_to_cloud_service(current_user: User, db: Session, file_id: int, target_cloud: str):
    # TODO: Implement logic to move file to another cloud
    return {"status": "moved", "file_id": file_id, "target_cloud": target_cloud}

def copy_file_to_cloud_service(current_user: User, db: Session, file_id: int, target_cloud: str):
    # TODO: Implement logic to copy file to another cloud
    return {"status": "copied", "file_id": file_id, "target_cloud": target_cloud}

def get_files_for_provider(provider: str, current_user, db, folder_id: str, request=None):
    from backend.services.onedrive_service import get_onedrive_files_service
    from backend.services.google_service import get_google_files_service
    if provider == "onedrive":
        return get_onedrive_files_service(current_user, db, folder_id)
    elif provider == "google":
        return get_google_files_service(current_user, db, folder_id)
    elif provider == "googlephotos":
        from backend.services.google_photos_service import get_google_photos_files_service
        return get_google_photos_files_service(current_user, db, folder_id)
    else:
        raise NotImplementedError(f"Provider '{provider}' not implemented") 