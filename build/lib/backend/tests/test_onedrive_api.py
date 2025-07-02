import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from backend.onedrive_api import _make_graph_api_request, refresh_onedrive_token
from backend.models import CloudConnection

class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code
        self.text = str(json_data)

    def json(self):
        return self.json_data

def test_make_graph_api_request_handles_token_refresh(mocker):
    """
    Tests that _make_graph_api_request successfully refreshes the token on a 401
    and retries the original request.
    """
    mock_db_session = MagicMock()
    mock_connection = CloudConnection()
    mock_connection.access_token="expired_token"
    mock_connection.refresh_token="valid_refresh_token"

    mocker.patch('requests.get', side_effect=[
        MockResponse({"error": "token expired"}, 401),
        MockResponse({"value": [{"name": "file1.txt"}]}, 200),
    ])

    mocker.patch('backend.onedrive_api.refresh_onedrive_token', return_value={
        "access_token": "new_shiny_token",
        "refresh_token": "new_refresh_token"
    })

    result = _make_graph_api_request("https://graph.microsoft.com/v1.0/me/drive/root/children", mock_connection, mock_db_session)

    assert result == {"value": [{"name": "file1.txt"}]}
    assert mock_connection.access_token == "new_shiny_token"
    mock_db_session.commit.assert_called_once()


def test_make_graph_api_request_fails_on_refresh_failure(mocker):
    """
    Tests that _make_graph_api_request raises an HTTPException if token refresh fails.
    """
    mock_db_session = MagicMock()
    mock_connection = CloudConnection()
    mock_connection.access_token="expired_token"
    mock_connection.refresh_token="invalid_refresh_token"
    
    mocker.patch('requests.get', return_value=MockResponse({"error": "token expired"}, 401))
    
    mocker.patch('backend.onedrive_api.refresh_onedrive_token', return_value=None)
    
    with pytest.raises(HTTPException) as excinfo:
        _make_graph_api_request("https://graph.microsoft.com/v1.0/me/drive/root/children", mock_connection, mock_db_session)
    
    assert excinfo.value.status_code == 401
    assert "Token refresh failed" in excinfo.value.detail 