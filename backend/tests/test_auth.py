def test_register_and_login(client, db_session):
    # Register a new user
    response = client.post("/auth/register", json={
        "email": "newuser@example.com",
        "password": "newpassword",
        "name": "New User"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    # Login with the new user
    response = client.post("/auth/token", json={
        "username": "newuser@example.com",
        "password": "newpassword"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    # Get user info with token
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "newuser@example.com"

def test_auth_me_requires_auth(client):
    response = client.get("/auth/me")
    assert response.status_code == 401 