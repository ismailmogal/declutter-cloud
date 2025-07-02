import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid
import sys
import os

# Use a test-only SQLite DB
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models and routers
from backend.models import Base as DBBase, User
from backend.auth import get_password_hash, create_access_token, get_current_user
from backend.routers import (
    ai, analytics, auth_router, cloud, files, google, images, onedrive, rules, user, subscription
)

# Create a test FastAPI app and register all routers
@pytest.fixture(scope="session")
def test_app():
    app = FastAPI()
    app.include_router(ai.router)
    app.include_router(analytics.router)
    app.include_router(auth_router.router)
    app.include_router(cloud.router)
    app.include_router(files.router)
    app.include_router(google.router)
    app.include_router(images.router)
    app.include_router(onedrive.router)
    app.include_router(rules.router)
    app.include_router(user.router)
    app.include_router(subscription.router)
    return app

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    DBBase.metadata.create_all(bind=engine)
    yield
    DBBase.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="function")
def client(test_app):
    return TestClient(test_app)

@pytest.fixture(scope="function")
def test_user(db_session):
    db_session.query(User).filter(User.email.like("testuser+%@example.com")).delete(synchronize_session=False)
    db_session.commit()
    unique_email = f"testuser+{uuid.uuid4().hex[:8]}@example.com"
    user = User()
    user.email = unique_email
    user.provider = "email"
    user.provider_id = None
    user.name = "Test User"
    user.is_active = True
    user.hashed_password = get_password_hash("password123")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def user_token(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    return token

@pytest.fixture(scope="function", autouse=True)
def override_dependencies(test_app, test_user, db_session):
    # Override get_db
    def _get_db_override():
        yield db_session
    test_app.dependency_overrides[get_current_user] = lambda: test_user
    from backend.database import get_db
    test_app.dependency_overrides[get_db] = _get_db_override
    yield
    test_app.dependency_overrides.clear() 