import pytest
from fastapi.testclient import TestClient
import sys
import os
import uuid
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app
from database import SessionLocal, Base as DBBase, engine
from models import User
from auth import get_password_hash, create_access_token

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
def client():
    return TestClient(app)

@pytest.fixture(scope="function")
def test_user(db_session):
    # Clean up only test users before each test
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
def override_auth_dependency(test_user):
    from auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield
    app.dependency_overrides.clear() 