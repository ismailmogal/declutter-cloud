import pytest
from fastapi.testclient import TestClient
from main import app, sessions

client = TestClient(app)

def test_onedrive_files_unauthenticated():
    response = client.get("/onedrive/files")
    assert response.status_code == 401
    assert response.json()["error"] == "Not authenticated"

def test_onedrive_files_not_connected():
    sessions["session_testuser"] = {"id": "testuser"}
    response = client.get("/onedrive/files?session_id=session_testuser")
    assert response.status_code == 403
    assert response.json()["error"] == "OneDrive not connected"

def test_onedrive_files_connected():
    sessions["session_testuser"] = {"id": "testuser", "onedrive_token": "demo-token"}
    response = client.get("/onedrive/files?session_id=session_testuser")
    assert response.status_code == 200
    data = response.json()
    assert "files" in data
    assert isinstance(data["files"], list)
    assert len(data["files"]) > 0 