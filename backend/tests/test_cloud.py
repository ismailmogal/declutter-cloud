from unittest.mock import patch
import pytest
from models import CloudConnection

def test_get_cloud_connections_empty(client, user_token):
    response = client.get("/api/cloud/connections", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    assert response.json() == []

def test_get_cloud_connections_with_data(client, user_token, db_session):
    # Create test connections
    connections = [
        CloudConnection(
            user_id=1,
            provider="onedrive",
            access_token="test_token_1",
            provider_user_email="test1@example.com",
            is_active=True
        ),
        CloudConnection(
            user_id=1,
            provider="googledrive",
            access_token="test_token_2",
            provider_user_email="test2@example.com",
            is_active=True
        ),
        # Inactive connection should not be returned
        CloudConnection(
            user_id=1,
            provider="onedrive",
            access_token="test_token_3",
            provider_user_email="test3@example.com",
            is_active=False
        )
    ]
    for conn in connections:
        db_session.add(conn)
    db_session.commit()

    response = client.get("/api/cloud/connections", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    data = response.json()
    
    # Should only return active connections
    assert len(data) == 2
    assert all(conn["is_active"] for conn in data)
    
    # Verify connection details
    providers = {conn["provider"] for conn in data}
    assert "onedrive" in providers
    assert "googledrive" in providers

def test_disconnect_cloud_provider(client, user_token, db_session):
    # Create test connection
    connection = CloudConnection(
        user_id=1,
        provider="onedrive",
        access_token="test_token",
        provider_user_email="test@example.com",
        is_active=True
    )
    db_session.add(connection)
    db_session.commit()

    # Disconnect the provider
    response = client.post(
        "/api/cloud/disconnect",
        json={"provider": "onedrive"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert "Disconnected from onedrive" in response.json()["message"]

    # Verify connection is marked as inactive
    updated_conn = db_session.query(CloudConnection).first()
    assert not updated_conn.is_active

def test_disconnect_cloud_provider_not_found(client, user_token):
    response = client.post(
        "/api/cloud/disconnect",
        json={"provider": "onedrive"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 404

def test_disconnect_cloud_provider_invalid_request(client, user_token):
    # Missing provider in request
    response = client.post(
        "/api/cloud/disconnect",
        json={},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 400
    assert "Provider is required" in response.json()["detail"]

def test_cloud_connections_require_auth(client):
    # Get connections without auth
    response = client.get("/api/cloud/connections")
    assert response.status_code == 401

    # Disconnect without auth
    response = client.post("/api/cloud/disconnect", json={"provider": "onedrive"})
    assert response.status_code == 401 