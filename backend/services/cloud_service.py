from fastapi import HTTPException
from models import CloudConnection

def get_cloud_connections_service(current_user, db):
    print(f"[DEBUG] Fetching cloud connections for user_id: {current_user.id}")
    connections = db.query(CloudConnection).filter(
        CloudConnection.user_id == current_user.id,
        CloudConnection.is_active == True
    ).all()
    print(f"[DEBUG] Found {len(connections)} active connections in the database.")
    
    result = [
        {
            "id": conn.id,
            "provider": conn.provider,
            "provider_user_email": conn.provider_user_email,
            "created_at": conn.created_at.isoformat() if conn.created_at else None,
            "is_active": conn.is_active
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