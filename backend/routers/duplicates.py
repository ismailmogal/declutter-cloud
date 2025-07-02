from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.models import User
from backend.routers.auth_router import get_current_user
from backend.services.enhanced_duplicates_service import EnhancedDuplicatesService
from backend.services.merge_strategy_service import MergeStrategyService
from backend.services.batch_processing_service import BatchProcessingService
from backend.routers.__init__ import feature_gate_service

router = APIRouter()

duplicates_service = EnhancedDuplicatesService()
merge_strategy_service = MergeStrategyService()
batch_processing_service = BatchProcessingService(merge_strategy_service)

@router.get("/api/duplicates/cross-cloud")
def get_cross_cloud_duplicates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get cross-cloud duplicate files for the current user"""
    return duplicates_service.find_cross_cloud_duplicates(current_user.id, db)

@router.post("/api/duplicates/merge")
def merge_duplicates(
    duplicate_group: dict,
    strategy: str = 'keep_largest',
    target_cloud: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Merge a duplicate group using the specified strategy"""
    # Feature gating and usage increment
    access = feature_gate_service.check_feature_access(current_user.id, 'cross_cloud_deduplication', db, current_user_id=current_user.id, increment=True)
    if not access.get('access'):
        raise HTTPException(status_code=402, detail=access.get('reason', 'Feature not available'))
    # Determine strategy function
    strategy_func = getattr(merge_strategy_service, strategy, None)
    if not strategy_func:
        raise HTTPException(status_code=400, detail="Invalid merge strategy")
    # Execute merge (placeholder logic)
    result = strategy_func(duplicate_group)
    # Optionally, call merge_duplicates on the service
    # duplicates_service.merge_duplicates(duplicate_group, target_cloud, db)
    return result

@router.post("/api/duplicates/batch-merge")
def batch_merge_duplicates(
    duplicate_groups: list,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch merge multiple duplicate groups"""
    return batch_processing_service.process_duplicates_batch(current_user.id, duplicate_groups, db) 