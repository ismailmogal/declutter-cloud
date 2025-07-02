from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import stripe
import os
from backend.models import User, Subscription, Usage, BillingEvent
from backend import config

# Initialize Stripe
stripe.api_key = config.STRIPE_SECRET_KEY

class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_subscription(self, user_id: int, plan_type: str, stripe_customer_id: Optional[str] = None) -> Subscription:
        """Create a new subscription for a user"""
        # Check if user already has an active subscription
        existing_sub = self.db.query(Subscription).filter(
            and_(
                Subscription.user_id == user_id,
                Subscription.status == "active"
            )
        ).first()
        
        if existing_sub:
            raise ValueError("User already has an active subscription")
        
        subscription = Subscription(
            user_id=user_id,
            plan_type=plan_type,
            status="active",
            stripe_customer_id=stripe_customer_id,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30)
        )
        
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    def get_user_subscription(self, user_id: int) -> Optional[Subscription]:
        """Get the active subscription for a user"""
        return self.db.query(Subscription).filter(
            and_(
                Subscription.user_id == user_id,
                Subscription.status == "active"
            )
        ).first()
    
    def update_subscription(self, subscription_id: int, **kwargs) -> Subscription:
        """Update subscription details"""
        subscription = self.db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not subscription:
            raise ValueError("Subscription not found")
        
        for key, value in kwargs.items():
            if hasattr(subscription, key):
                setattr(subscription, key, value)
        
        subscription.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    def cancel_subscription(self, subscription_id: int) -> Subscription:
        """Cancel a subscription"""
        subscription = self.db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not subscription:
            raise ValueError("Subscription not found")
        
        subscription.status = "cancelled"
        subscription.updated_at = datetime.utcnow()
        
        # Cancel in Stripe if exists
        if subscription.stripe_subscription_id:
            try:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
            except stripe.error.StripeError as e:
                # Log error but don't fail the operation
                print(f"Stripe cancellation error: {e}")
        
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    def get_plan_limits(self, plan_type: str) -> Dict[str, Any]:
        """Get the limits for a specific plan"""
        limits = {
            "free": {
                "storage_limit_gb": 10,
                "cloud_providers": 2,
                "files_per_month": 1000,
                "api_calls_per_month": 1000,
                "retention_days": 30,
                "features": ["basic_deduplication", "simple_analytics"]
            },
            "pro": {
                "storage_limit_gb": 1000,
                "cloud_providers": -1,  # Unlimited
                "files_per_month": -1,  # Unlimited
                "api_calls_per_month": 10000,
                "retention_days": 365,
                "features": ["advanced_ai", "cross_cloud_deduplication", "priority_support"]
            },
            "business": {
                "storage_limit_gb": 10000,
                "cloud_providers": -1,
                "files_per_month": -1,
                "api_calls_per_month": 100000,
                "retention_days": 1095,
                "features": ["team_collaboration", "advanced_analytics", "custom_rules", "api_access"]
            },
            "enterprise": {
                "storage_limit_gb": -1,  # Unlimited
                "cloud_providers": -1,
                "files_per_month": -1,
                "api_calls_per_month": -1,
                "retention_days": -1,  # Unlimited
                "features": ["custom_ai_models", "advanced_security", "compliance_tools", "dedicated_support"]
            }
        }
        
        return limits.get(plan_type, limits["free"])
    
    def check_user_limits(self, user_id: int, operation: str, **kwargs) -> bool:
        """Check if a user can perform an operation based on their plan limits"""
        subscription = self.get_user_subscription(user_id)
        if not subscription:
            # Free tier limits
            plan_limits = self.get_plan_limits("free")
        else:
            plan_limits = self.get_plan_limits(subscription.plan_type)
        
        # Get current usage
        current_usage = self.get_current_usage(user_id)
        
        if operation == "storage":
            storage_needed = kwargs.get("storage_gb", 0)
            if plan_limits["storage_limit_gb"] != -1:
                return (current_usage.get("storage_used_gb", 0) + storage_needed) <= plan_limits["storage_limit_gb"]
            return True
        
        elif operation == "files":
            files_count = kwargs.get("files_count", 0)
            if plan_limits["files_per_month"] != -1:
                return (current_usage.get("files_processed", 0) + files_count) <= plan_limits["files_per_month"]
            return True
        
        elif operation == "api_calls":
            api_calls = kwargs.get("api_calls", 0)
            if plan_limits["api_calls_per_month"] != -1:
                return (current_usage.get("api_calls", 0) + api_calls) <= plan_limits["api_calls_per_month"]
            return True
        
        elif operation == "cloud_providers":
            providers_count = kwargs.get("providers_count", 0)
            if plan_limits["cloud_providers"] != -1:
                return providers_count <= plan_limits["cloud_providers"]
            return True
        
        return True
    
    def record_usage(self, user_id: int, **kwargs) -> Usage:
        """Record usage for a user"""
        today = date.today()
        
        # Get or create today's usage record
        usage = self.db.query(Usage).filter(
            and_(
                Usage.user_id == user_id,
                Usage.date == today
            )
        ).first()
        
        if not usage:
            usage = Usage(user_id=user_id, date=today)
            self.db.add(usage)
        
        # Update usage metrics
        for key, value in kwargs.items():
            if hasattr(usage, key):
                current_value = getattr(usage, key) or 0
                setattr(usage, key, current_value + value)
        
        self.db.commit()
        self.db.refresh(usage)
        
        return usage
    
    def get_current_usage(self, user_id: int) -> Dict[str, Any]:
        """Get current month usage for a user"""
        start_of_month = date.today().replace(day=1)
        
        usage_records = self.db.query(Usage).filter(
            and_(
                Usage.user_id == user_id,
                Usage.date >= start_of_month
            )
        ).all()
        
        total_usage = {
            "storage_used_gb": 0.0,
            "files_processed": 0,
            "duplicates_found": 0,
            "storage_saved_gb": 0.0,
            "api_calls": 0
        }
        
        for record in usage_records:
            total_usage["storage_used_gb"] += record.storage_used_gb or 0
            total_usage["files_processed"] += record.files_processed or 0
            total_usage["duplicates_found"] += record.duplicates_found or 0
            total_usage["storage_saved_gb"] += record.storage_saved_gb or 0
            total_usage["api_calls"] += record.api_calls or 0
        
        return total_usage
    
    def create_billing_event(self, user_id: int, subscription_id: int, event_type: str, 
                           amount: Optional[float] = None, stripe_event_id: Optional[str] = None,
                           metadata: Optional[Dict] = None) -> BillingEvent:
        """Create a billing event record"""
        billing_event = BillingEvent(
            user_id=user_id,
            subscription_id=subscription_id,
            event_type=event_type,
            amount=amount,
            stripe_event_id=stripe_event_id,
            event_metadata=metadata
        )
        
        self.db.add(billing_event)
        self.db.commit()
        self.db.refresh(billing_event)
        
        return billing_event
    
    def get_subscription_analytics(self, user_id: int) -> Dict[str, Any]:
        """Get subscription analytics for a user"""
        subscription = self.get_user_subscription(user_id)
        current_usage = self.get_current_usage(user_id)
        
        if subscription:
            plan_limits = self.get_plan_limits(subscription.plan_type)
        else:
            plan_limits = self.get_plan_limits("free")
        
        # Calculate usage percentages
        usage_percentages = {}
        for key in ["storage_used_gb", "files_processed", "api_calls"]:
            if plan_limits.get(f"{key.split('_')[0]}_limit_gb" if "storage" in key else f"{key.split('_')[0]}s_per_month"):
                limit = plan_limits.get(f"{key.split('_')[0]}_limit_gb" if "storage" in key else f"{key.split('_')[0]}s_per_month")
                if limit != -1:
                    usage_percentages[key] = min(100, (current_usage.get(key, 0) / limit) * 100)
                else:
                    usage_percentages[key] = 0
            else:
                usage_percentages[key] = 0
        
        return {
            "subscription": subscription,
            "current_usage": current_usage,
            "plan_limits": plan_limits,
            "usage_percentages": usage_percentages,
            "storage_savings": current_usage.get("storage_saved_gb", 0),
            "cost_savings": current_usage.get("storage_saved_gb", 0) * 0.02  # Estimate $0.02/GB/month
        } 