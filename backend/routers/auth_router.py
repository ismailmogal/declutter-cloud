from fastapi import APIRouter, Depends, Body, status
from sqlalchemy.orm import Session
from services.auth_service import register_user_service, login_for_access_token_service, read_users_me_service
from database import get_db
from auth import get_current_user
from models import User, UserSchema
from pydantic import BaseModel, EmailStr

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    return register_user_service(user, db)

@router.post("/auth/token")
def login_for_access_token(form_data: dict = Body(...), db: Session = Depends(get_db)):
    return login_for_access_token_service(form_data, db)

@router.get("/auth/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_user)):
    return read_users_me_service(current_user) 