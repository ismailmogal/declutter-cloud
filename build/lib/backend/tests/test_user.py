import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import User
from auth import get_password_hash, create_access_token

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

# Test for the /api/user/me endpoint
def test_get_me_unauthenticated(client: TestClient):
    """
    Test that accessing /me without authentication fails.
    """
    response = client.get("/api/user/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_get_me_authenticated(client: TestClient, user_token: str):
    """
    Test fetching the current user's profile when authenticated.
    """
    response = client.get("/api/user/me", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "hashed_password" not in data

# Tests for the /api/user/change-password endpoint
def test_change_password_success(client: TestClient, db_session: Session):
    """
    Test successfully changing a password for a user with an existing password.
    """
    # Create a user with a password
    email = "passworduser@example.com"
    current_password = "old_secure_password"
    new_password = "new_very_secure_password"
    
    user = User()
    user.email = email
    user.provider = "email"
    user.hashed_password = get_password_hash(current_password)

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Generate a token for this user
    token = create_access_token(data={"sub": user.email})

    # Perform the password change
    response = client.post(
        "/api/user/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": current_password, "new_password": new_password}
    )
    
    assert response.status_code == 200
    assert response.json()["message"] == "Password updated successfully"

    # Verify the password was actually changed in the DB
    db_user = db_session.query(User).filter(User.email == email).first() # type: ignore
    from auth import verify_password
    assert verify_password(new_password, db_user.hashed_password) # type: ignore
    assert not verify_password(current_password, db_user.hashed_password) # type: ignore


def test_change_password_incorrect_current(client: TestClient, db_session: Session):
    """
    Test failing to change a password with an incorrect current password.
    """
    email = "wrongpassuser@example.com"
    user = User()
    user.email = email
    user.provider = "email"
    user.hashed_password = get_password_hash("correct_password")

    db_session.add(user)
    db_session.commit()
    token = create_access_token(data={"sub": user.email})

    response = client.post(
        "/api/user/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "wrong_password", "new_password": "new_password"}
    )
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect current password"

def test_change_password_for_oauth_user(client: TestClient, user_token: str):
    """
    Test that a user authenticated via OAuth cannot change their password.
    """
    response = client.post(
        "/api/user/change-password",
        headers={"Authorization": f"Bearer {user_token}"}, # This user_token is for an OAuth user
        json={"current_password": "any", "new_password": "new_password"}
    )
    assert response.status_code == 400
    assert "User does not have a password set" in response.json()["detail"]

def test_change_password_new_password_too_short(client: TestClient, db_session: Session):
    """
    Test that the new password must meet length requirements.
    """
    email = "shortpassuser@example.com"
    user = User()
    user.email = email
    user.provider = "email"
    user.hashed_password = get_password_hash("correct_password")
    
    db_session.add(user)
    db_session.commit()
    token = create_access_token(data={"sub": user.email})

    response = client.post(
        "/api/user/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "correct_password", "new_password": "short"}
    )
    assert response.status_code == 400
    assert "New password must be at least 8 characters long" in response.json()["detail"]

def test_change_password_unauthenticated(client: TestClient):
    """
    Test that changing a password without authentication fails.
    """
    response = client.post(
        "/api/user/change-password",
        json={"current_password": "a", "new_password": "b"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_create_subscription_and_usage(db_session, test_user):
    from backend.services.subscription_service import SubscriptionService
    service = SubscriptionService(db_session)
    
    # Create a subscription
    subscription = service.create_subscription(user_id=test_user.id, plan_type="pro")
    assert subscription.plan_type == "pro"
    assert subscription.status == "active"
    
    # Record usage
    usage = service.record_usage(test_user.id, storage_used_gb=5.0, files_processed=10, api_calls=2)
    assert usage.storage_used_gb >= 5.0
    assert usage.files_processed >= 10
    assert usage.api_calls >= 2
    
    # Check limits
    assert service.check_user_limits(test_user.id, "storage", storage_gb=1)
    assert service.check_user_limits(test_user.id, "files", files_count=5)
    assert service.check_user_limits(test_user.id, "api_calls", api_calls=5)
    
    # Create billing event
    billing_event = service.create_billing_event(
        user_id=test_user.id,
        subscription_id=subscription.id,
        event_type="subscription_created",
        amount=9.99
    )
    assert billing_event.event_type == "subscription_created"
    assert billing_event.amount == 9.99 