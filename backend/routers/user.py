from fastapi import APIRouter, Request
from services.user_service import get_me_service

router = APIRouter()

@router.get("/me")
def get_me(request: Request):
    return get_me_service(request) 