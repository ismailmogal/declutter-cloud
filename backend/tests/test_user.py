from models import User
from auth import get_password_hash

def test_me_requires_session_id(client):
    response = client.get("/me")
    assert response.status_code == 401 

def test_get_user_profile(client, user_token, db_session):
    """
    Test fetching a user's profile information.
    """
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "password" not in data
    assert "hashed_password" not in data

def test_email_user_has_password(db_session):
    """
    Test that a user created with email/password has a hashed password.
    """
    user = User()
    user.email="emailuser@example.com"
    user.name="Email User"
    user.provider="email"
    user.hashed_password=get_password_hash("a-secure-password")

    db_session.add(user)
    db_session.commit()

    retrieved_user = db_session.query(User).filter_by(email="emailuser@example.com").first()
    assert retrieved_user
    assert retrieved_user.hashed_password is not None
    assert retrieved_user.hashed_password != "a-secure-password"

def test_social_user_no_password(client, user_token, db_session):
    """
    Test that a user created via social login does not have a password.
    """
    user = db_session.query(User).filter_by(email="testuser@example.com").first()
    assert user.provider == "test_provider"
    assert user.hashed_password is None 