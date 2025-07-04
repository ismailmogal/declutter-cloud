from fastapi import HTTPException, status
from backend.models import User
from backend.auth import get_password_hash, verify_password, create_access_token
from sqlalchemy.orm import Session
from pydantic import EmailStr

def register_user_service(user, db: Session):
    existing = db.query(User).filter(User.email == user.email).first() # type: ignore
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(user.password)
    db_user = User()
    db_user.email = user.email
    db_user.provider = "email"
    db_user.provider_id = None
    db_user.name = user.name
    db_user.is_active = True
    db_user.hashed_password = hashed_pw

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def login_for_access_token_service(form_data, db: Session):
    username = form_data.get("username")
    password = form_data.get("password")
    user = db.query(User).filter(User.email == username).first() # type: ignore
    if not user or not verify_password(password, getattr(user, 'hashed_password', '')):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

def read_users_me_service(current_user):
    return current_user 