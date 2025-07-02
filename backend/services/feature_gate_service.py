from typing import Optional
import logging
from backend.models import UsageTracking
from sqlalchemy.orm import Session

class FeatureGateService:
    def __init__(self, subscription_service, usage_tracking_service):
        self.subscription_service = subscription_service
        self.usage_tracking_service = usage_tracking_service
        self.logger = logging.getLogger("feature_gate")

    def check_feature_access(self, user_id: int, feature: str, db, current_user_id: Optional[int] = None, increment: bool = False):
        # Security: Only allow the current authenticated user to check their own access
        if current_user_id is not None and user_id != current_user_id:
            self.logger.warning(f"SECURITY: User {current_user_id} tried to check feature access for user {user_id}")
            return {'access': False, 'reason': 'unauthorized'}
        subscription = self.subscription_service.get_user_subscription(db, user_id)
        feature_limits = {
            'storage_analysis': {
                'free': {'enabled': True, 'limit': 5 * 1024**3},  # 5GB
                'pro': {'enabled': True, 'limit': 100 * 1024**3},  # 100GB
                'business': {'enabled': True, 'limit': 1024 * 1024**3},  # 1TB
                'enterprise': {'enabled': True, 'limit': None}
            },
            'cross_cloud_deduplication': {
                'free': {'enabled': True, 'limit': 100},  # 100 files/month
                'pro': {'enabled': True, 'limit': None},
                'business': {'enabled': True, 'limit': None},
                'enterprise': {'enabled': True, 'limit': None}
            },
            'advanced_analytics': {
                'free': {'enabled': False},
                'pro': {'enabled': True},
                'business': {'enabled': True},
                'enterprise': {'enabled': True}
            }
        }
        plan = subscription.plan_type if subscription else 'free'
        feature_config = feature_limits.get(feature, {}).get(plan, {})
        usage = None
        limit = feature_config.get('limit')
        if not feature_config.get('enabled', False):
            return {'access': False, 'reason': 'feature_not_available'}
        if limit is not None:
            usage = self.usage_tracking_service.get_current_usage(user_id, feature, db)
            if usage >= limit:
                return {'access': False, 'reason': 'usage_limit_exceeded', 'usage': usage, 'limit': limit}
        if increment:
            self.usage_tracking_service.increment_usage(user_id, feature, db)
            usage = self.usage_tracking_service.get_current_usage(user_id, feature, db)
        return {'access': True, 'usage': usage, 'limit': limit}

class UsageTrackingService:
    def get_current_usage(self, user_id: int, feature: str, db: Session):
        usage = db.query(UsageTracking).filter_by(user_id=user_id, feature=feature).first()
        return usage.usage_amount if usage else 0

    def increment_usage(self, user_id: int, feature: str, db: Session):
        usage = db.query(UsageTracking).filter_by(user_id=user_id, feature=feature).first()
        if usage:
            usage.usage_amount += 1
        else:
            usage = UsageTracking(user_id=user_id, feature=feature, usage_amount=1)
            db.add(usage)
        db.commit() 