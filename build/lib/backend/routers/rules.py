from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Any
from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User
from backend.services.rules_service import get_rules_service, create_rule_service, update_rule_service, delete_rule_service, apply_rules_service

router = APIRouter()

@router.get("/api/rules")
def get_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_rules_service(current_user, db)

@router.post("/api/rules")
def create_rule(
    rule: Any = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_rule_service(current_user, db, rule)

@router.put("/api/rules/{rule_id}")
def update_rule(
    rule_id: int,
    rule: Any = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return update_rule_service(current_user, db, rule_id, rule)

@router.delete("/api/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return delete_rule_service(current_user, db, rule_id)

@router.post("/api/rules/apply")
def apply_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return apply_rules_service(current_user, db) 