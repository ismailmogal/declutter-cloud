from unittest.mock import patch

def test_google_login_endpoint(client, user_token):
    """
    Test the Google Drive login endpoint. It should return a redirect response.
    """
    response = client.get("/auth/googledrive/login", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code in (200, 307, 302)
    # The response should contain the Google OAuth URL
    assert "accounts.google.com/o/oauth2/v2/auth" in response.text

def test_google_login_requires_auth(client):
    """
    Test that the Google Drive login endpoint requires authentication.
    """
    response = client.get("/auth/googledrive/login")
    assert response.status_code == 401

@patch('services.google_service.Flow')
def test_google_callback(mock_flow, client, db_session):
    """
    Test the Google Drive OAuth callback with a mocked Google Flow.
    """
    # Mock the flow to simulate a successful authentication
    mock_instance = mock_flow.from_client_secrets_file.return_value
    mock_instance.fetch_token.return_value = {
        "access_token": "fake_google_token",
        "refresh_token": "fake_google_refresh_token",
        "expires_in": 3600,
    }

    # Mock the user info response from Google
    with patch('requests.get') as mock_get:
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {
            "id": "12345",
            "email": "googleuser@example.com",
            "name": "Google User",
            "picture": "http://example.com/avatar.jpg"
        }

        # Simulate the callback from Google
        response = client.get("/auth/googledrive/callback?code=fake_code&state=fake_state")
        
        # Should redirect to the frontend
        assert response.status_code == 307  # Redirect
        assert "http://localhost:5173" in response.headers["location"] 