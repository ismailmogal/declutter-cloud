from backend.routers.ai import router as ai
from backend.routers.analytics import router as analytics
from backend.routers.auth_router import router as auth_router
from backend.routers.cloud import router as cloud
from backend.routers.files import router as files
from backend.routers.google import router as google
from backend.routers.images import router as images
from backend.routers.onedrive import router as onedrive
from backend.routers.rules import router as rules
from backend.routers.user import router as user
from backend.routers.subscription import router as subscription
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.models import User
from backend.database import get_db
from backend.routers.auth_router import get_current_user
from backend.services.feature_gate_service import FeatureGateService, UsageTrackingService
from backend.services.subscription_service import SubscriptionService

router = APIRouter()

subscription_service = SubscriptionService()
usage_tracking_service = UsageTrackingService()
feature_gate_service = FeatureGateService(subscription_service, usage_tracking_service)

@router.get("/api/features/{feature}/access")
def check_feature_access(feature: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if the current user has access to a feature (for feature gating)"""
    return feature_gate_service.check_feature_access(current_user.id, feature, db, current_user_id=current_user.id) 