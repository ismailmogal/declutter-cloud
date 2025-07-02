import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine
from models import Base, User
from sqlalchemy.orm import Session
from auth import get_password_hash

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Recreate tables for each test run
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_register_success():
    resp = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "name": "Test User"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data

def test_register_duplicate():
    client.post("/auth/register", json={
        "email": "dup@example.com",
        "password": "testpass123",
        "name": "Dup User"
    })
    resp = client.post("/auth/register", json={
        "email": "dup@example.com",
        "password": "testpass123",
        "name": "Dup User"
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Email already registered"

def test_login_success():
    client.post("/auth/register", json={
        "email": "login@example.com",
        "password": "testpass123",
        "name": "Login User"
    })
    resp = client.post("/auth/token", data={
        "username": "login@example.com",
        "password": "testpass123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password():
    client.post("/auth/register", json={
        "email": "wrongpw@example.com",
        "password": "testpass123",
        "name": "WrongPW User"
    })
    resp = client.post("/auth/token", data={
        "username": "wrongpw@example.com",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Incorrect email or password"

def test_login_nonexistent_user():
    resp = client.post("/auth/token", data={
        "username": "nouser@example.com",
        "password": "irrelevant"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Incorrect email or password"

def test_jwt_protected_me():
    # Register and login
    client.post("/auth/register", json={
        "email": "jwtuser@example.com",
        "password": "testpass123",
        "name": "JWT User"
    })
    login = client.post("/auth/token", data={
        "username": "jwtuser@example.com",
        "password": "testpass123"
    })
    token = login.json()["access_token"]
    # Access protected endpoint
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "jwtuser@example.com"
    assert data["name"] == "JWT User"

def test_jwt_protected_me_no_token():
    resp = client.get("/auth/me")
    assert resp.status_code == 401 