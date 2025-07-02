from fastapi import APIRouter, Depends, Body, status, Request
from sqlalchemy.orm import Session
from backend.services.auth_service import register_user_service, login_for_access_token_service, read_users_me_service
from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User, UserSchema
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_user(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    return register_user_service(user, db)

@router.post("/auth/token")
@limiter.limit("10/minute")
def login_for_access_token(request: Request, form_data: dict = Body(...), db: Session = Depends(get_db)):
    return login_for_access_token_service(form_data, db)

@router.get("/auth/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_user)):
    return read_users_me_service(current_user) 