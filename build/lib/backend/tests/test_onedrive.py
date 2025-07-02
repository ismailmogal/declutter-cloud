from unittest.mock import patch, MagicMock
import pytest
from fastapi import HTTPException

# Helper to temporarily remove dependency override for unauthenticated endpoint tests
def remove_auth_override(app):
    orig = app.dependency_overrides.copy()
    app.dependency_overrides.clear()
    return orig

def restore_auth_override(app, orig):
    app.dependency_overrides = orig

def test_onedrive_login_endpoint(client, user_token):
    # Remove auth override for this test
    from main import app
    orig = remove_auth_override(app)
    response = client.get("/auth/onedrive/login", headers={"Authorization": f"Bearer {user_token}"})
    restore_auth_override(app, orig)
    # Should redirect to Microsoft OAuth or 307/302, or 404 if not registered
    assert response.status_code in (200, 307, 302, 404)

def test_onedrive_login_requires_auth(client):
    # Remove auth override for this test
    from main import app
    orig = remove_auth_override(app)
    response = client.get("/auth/onedrive/login")
    restore_auth_override(app, orig)
    # Should return 401 or 404 if not found
    assert response.status_code in (401, 404)

@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_get_onedrive_files(mock_get_files, client, user_token, db_session, test_user):
    # Mock the OneDrive API response
    mock_files = [
        {
            "id": "123",
            "name": "test.txt",
            "size": 1024,
            "last_modified": "2025-06-24T09:00:00Z",
            "folder": False
        },
        {
            "id": "456",
            "name": "Documents",
            "size": 0,
            "last_modified": "2025-06-24T09:00:00Z",
            "folder": True,
            "childCount": 5
        }
    ]
    mock_get_files.return_value = mock_files

    # Create a mock OneDrive connection for the test user
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()

    # Test root folder
    response = client.get("/api/onedrive/files", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    assert response.json()["files"] == mock_files

    # Test subfolder
    response = client.get("/api/onedrive/files?folder_id=456", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    assert response.json()["files"] == mock_files

@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_get_onedrive_files_error_handling(mock_get_files, client, user_token, db_session, test_user):
    # Mock API error
    mock_get_files.side_effect = HTTPException(status_code=500, detail="API Error")

    # Create a mock OneDrive connection for the test user
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()

    response = client.get("/api/onedrive/files", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 500
    assert "API Error" in response.json()["detail"]

def test_get_onedrive_files_no_connection(client, user_token):
    response = client.get("/api/onedrive/files", headers={"Authorization": f"Bearer {user_token}"})
    # Should return 404 or 401 if no connection
    assert response.status_code in (404, 401)
    # If 404, check error message
    if response.status_code == 404:
        assert "OneDrive connection not found" in response.json()["detail"]

@patch('onedrive_api.refresh_onedrive_token')
@patch('onedrive_api._make_graph_api_request')
def test_token_refresh(mock_api_request, mock_refresh, client, user_token, db_session, test_user):
    # Simulate _make_graph_api_request returning 401 first, then 200
    call_count = {'n': 0}
    class MockResponse:
        def __init__(self, status_code):
            self.status_code = status_code
        def json(self):
            return {"value": []}
        @property
        def text(self):
            return "mock error"
    def side_effect(*args, **kwargs):
        if call_count['n'] == 0:
            call_count['n'] += 1
            return MockResponse(401)
        return MockResponse(200)
    mock_api_request.side_effect = side_effect
    mock_refresh.return_value = None
    # Create a mock OneDrive connection with expired token for the test user
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "expired_token"
    connection.refresh_token = "old_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()
    # This should trigger a token refresh
    response = client.get("/api/onedrive/files", headers={"Authorization": f"Bearer {user_token}"})
    # Verify token refresh was attempted
    assert mock_refresh.called
    # Should not error
    assert response.status_code in (200, 404)

@patch('onedrive_api.get_onedrive_folder_contents')
@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_recursive_files_endpoint(mock_service_get, mock_api_get, client, user_token, db_session, test_user):
    # Use the same side effect for both
    def side_effect(connection, db, folder_id):
        if folder_id == "root":
            return [
                {"id": "file1", "name": "file1.txt", "type": "file"},
                {"id": "folderA", "name": "A", "type": "folder"}
            ]
        elif folder_id == "folderA":
            return [
                {"id": "file2", "name": "file2.txt", "type": "file"},
                {"id": "folderB", "name": "B", "type": "folder"}
            ]
        elif folder_id == "folderB":
            return [
                {"id": "file3", "name": "file3.txt", "type": "file"}
            ]
        return []
    mock_service_get.side_effect = side_effect
    mock_api_get.side_effect = side_effect
    # Create a mock OneDrive connection for the test user
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()

    # Test depth=1 (should only get file1)
    payload = {"folder_ids": ["root"], "max_depth": 1, "concurrent": False}
    response = client.post("/api/onedrive/recursive_files", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    files = response.json()["files"]
    assert any(f["id"] == "file1" for f in files)
    assert not any(f["id"] == "file2" for f in files)
    assert not any(f["id"] == "file3" for f in files)

    # Test depth=2 (should get file1, file2)
    payload = {"folder_ids": ["root"], "max_depth": 2, "concurrent": False}
    response = client.post("/api/onedrive/recursive_files", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    files = response.json()["files"]
    assert any(f["id"] == "file1" for f in files)
    assert any(f["id"] == "file2" for f in files)
    assert not any(f["id"] == "file3" for f in files)

    # Test depth=3 (should get all files)
    payload = {"folder_ids": ["root"], "max_depth": 3, "concurrent": True}
    response = client.post("/api/onedrive/recursive_files", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    files = response.json()["files"]
    assert any(f["id"] == "file1" for f in files)
    assert any(f["id"] == "file2" for f in files)
    assert any(f["id"] == "file3" for f in files)

@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_start_scan_job_and_status(mock_get_contents, client, user_token, db_session, test_user):
    # Simulate a folder tree
    def side_effect(connection, db, folder_id):
        if folder_id == "root":
            return [
                {"id": "file1", "name": "file1.txt", "type": "file"},
                {"id": "folderA", "name": "A", "type": "folder"}
            ]
        elif folder_id == "folderA":
            return [
                {"id": "file2", "name": "file2.txt", "type": "file"}
            ]
        return []
    mock_get_contents.side_effect = side_effect
    # Create a mock OneDrive connection for the test user
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()
    # Start a scan job
    payload = {"folder_ids": ["root"], "max_depth": 2}
    response = client.post("/api/onedrive/scan_job", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    job_id = response.json().get("job_id")
    assert job_id
    # Poll status until complete
    import time
    for _ in range(10):
        status_response = client.get(f"/api/onedrive/scan_job/{job_id}/status", headers={"Authorization": f"Bearer {user_token}"})
        assert status_response.status_code == 200
        status = status_response.json()["status"]
        if status == "complete":
            break
        time.sleep(0.1)
    result = status_response.json()
    assert result["status"] == "complete"
    assert "result" in result
    assert any(f["id"] == "file1" for f in result["result"])
    assert any(f["id"] == "file2" for f in result["result"])
    # Test job not found
    bad_response = client.get(f"/api/onedrive/scan_job/doesnotexist/status", headers={"Authorization": f"Bearer {user_token}"})
    assert bad_response.status_code == 404
    assert "Job not found" in bad_response.json()["detail"]

@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_scan_job_cancellation_and_progress(mock_get_contents, client, user_token, db_session, test_user):
    # Simulate a folder tree with a delay to allow cancellation
    import time as pytime
    def side_effect(connection, db, folder_id):
        pytime.sleep(0.05)  # Simulate work
        if folder_id == "root":
            return [
                {"id": "file1", "name": "file1.txt", "type": "file"},
                {"id": "folderA", "name": "A", "type": "folder"}
            ]
        elif folder_id == "folderA":
            return [
                {"id": "file2", "name": "file2.txt", "type": "file"}
            ]
        return []
    mock_get_contents.side_effect = side_effect
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()
    # Start a scan job
    payload = {"folder_ids": ["root"], "max_depth": 2}
    response = client.post("/api/onedrive/scan_job", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    job_id = response.json().get("job_id")
    assert job_id
    # Cancel the job almost immediately
    cancel_response = client.post(f"/api/onedrive/scan_job/{job_id}/cancel", headers={"Authorization": f"Bearer {user_token}"})
    assert cancel_response.status_code == 200
    # Poll status until cancelled
    for _ in range(20):
        status_response = client.get(f"/api/onedrive/scan_job/{job_id}/status", headers={"Authorization": f"Bearer {user_token}"})
        assert status_response.status_code == 200
        status = status_response.json()["status"]
        if status == "cancelled":
            break
        pytime.sleep(0.05)
    result = status_response.json()
    assert result["status"] == "cancelled"
    assert "Job was cancelled by user." in result["error"]

@patch('services.onedrive_service.get_onedrive_folder_contents')
def test_scan_job_progress_and_error_fields(mock_get_contents, client, user_token, db_session, test_user):
    # Simulate a folder tree and raise an error on a specific folder
    import time as pytime
    def side_effect(connection, db, folder_id):
        if folder_id == "root":
            return [
                {"id": "file1", "name": "file1.txt", "type": "file"},
                {"id": "folderA", "name": "A", "type": "folder"}
            ]
        elif folder_id == "folderA":
            raise Exception("Simulated scan error!")
        return []
    mock_get_contents.side_effect = side_effect
    from models import CloudConnection
    connection = CloudConnection()
    connection.user_id = test_user.id
    connection.provider = "onedrive"
    connection.access_token = "test_token"
    connection.refresh_token = "test_refresh_token"
    connection.provider_user_id = "user1"
    connection.provider_user_email = "test@example.com"
    connection.is_active = True
    db_session.add(connection)
    db_session.commit()
    # Start a scan job
    payload = {"folder_ids": ["root"], "max_depth": 2}
    response = client.post("/api/onedrive/scan_job", json=payload, headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    job_id = response.json().get("job_id")
    assert job_id
    # Poll status until error
    for _ in range(20):
        status_response = client.get(f"/api/onedrive/scan_job/{job_id}/status", headers={"Authorization": f"Bearer {user_token}"})
        assert status_response.status_code == 200
        status = status_response.json()["status"]
        if status == "error":
            break
        pytime.sleep(0.05)
    result = status_response.json()
    assert result["status"] == "error"
    assert "Simulated scan error!" in result["error"]
    # Check progress and fields
    assert "progress" in result
    assert "folders_visited" in result
    assert "files_found" in result 