from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.database import get_db
from backend.services.subscription_service import SubscriptionService
from backend.auth import get_current_user
from backend.models import User

router = APIRouter(prefix="/subscription", tags=["subscription"])

@router.get("/current")
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current subscription and usage information"""
    subscription_service = SubscriptionService(db)
    
    try:
        analytics = subscription_service.get_subscription_analytics(current_user.id)
        return {
            "success": True,
            "data": analytics
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription data: {str(e)}"
        )

@router.get("/plans")
async def get_available_plans():
    """Get available subscription plans and their features"""
    plans = {
        "free": {
            "name": "Free",
            "price": 0,
            "billing_cycle": "monthly",
            "features": [
                "10GB storage optimization",
                "Basic deduplication (100 files/month)",
                "Simple analytics",
                "2 cloud provider connections",
                "30 days file history",
                "Community support"
            ],
            "limits": {
                "storage_limit_gb": 10,
                "cloud_providers": 2,
                "files_per_month": 1000,
                "api_calls_per_month": 1000,
                "retention_days": 30
            }
        },
        "pro": {
            "name": "Pro",
            "price": 9.99,
            "billing_cycle": "monthly",
            "features": [
                "1TB storage optimization",
                "Unlimited deduplication",
                "Advanced analytics",
                "Unlimited cloud providers",
                "AI-powered organization",
                "Cross-cloud deduplication",
                "1 year file history",
                "Priority email support"
            ],
            "limits": {
                "storage_limit_gb": 1000,
                "cloud_providers": -1,
                "files_per_month": -1,
                "api_calls_per_month": 10000,
                "retention_days": 365
            }
        },
        "business": {
            "name": "Business",
            "price": 29.99,
            "billing_cycle": "monthly",
            "features": [
                "10TB storage optimization per user",
                "Team collaboration (up to 10 users)",
                "Advanced analytics",
                "Custom rules and automation",
                "API access",
                "Compliance features",
                "3 years file history",
                "Priority phone support"
            ],
            "limits": {
                "storage_limit_gb": 10000,
                "cloud_providers": -1,
                "files_per_month": -1,
                "api_calls_per_month": 100000,
                "retention_days": 1095
            }
        },
        "enterprise": {
            "name": "Enterprise",
            "price": "Custom",
            "billing_cycle": "custom",
            "features": [
                "Unlimited storage optimization",
                "Unlimited team members",
                "Custom AI models",
                "Advanced security features",
                "Compliance tools",
                "White-label options",
                "Unlimited file history",
                "24/7 dedicated support",
                "Custom training and onboarding"
            ],
            "limits": {
                "storage_limit_gb": -1,
                "cloud_providers": -1,
                "files_per_month": -1,
                "api_calls_per_month": -1,
                "retention_days": -1
            }
        }
    }
    
    return {
        "success": True,
        "data": plans
    }

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe checkout session for subscription"""
    if plan_type not in ["pro", "business"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan type. Must be 'pro' or 'business'"
        )
    
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user already has an active subscription
        existing_sub = subscription_service.get_user_subscription(current_user.id)
        if existing_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )
        
        # Create Stripe checkout session
        import stripe
        stripe.api_key = "sk_test_..."  # Replace with actual Stripe key
        
        prices = {
            "pro": "price_1OqX2X2X2X2X2X2X2X2X2X2X",  # Replace with actual price IDs
            "business": "price_1OqX2X2X2X2X2X2X2X2X2X2X"
        }
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price": prices[plan_type],
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url="http://localhost:5173/settings?success=true",
            cancel_url="http://localhost:5173/settings?canceled=true",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "plan_type": plan_type
            }
        )
        
        return {
            "success": True,
            "data": {
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription"""
    subscription_service = SubscriptionService(db)
    
    try:
        subscription = subscription_service.get_user_subscription(current_user.id)
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        cancelled_sub = subscription_service.cancel_subscription(subscription.id)
        
        return {
            "success": True,
            "message": "Subscription cancelled successfully",
            "data": {
                "subscription_id": cancelled_sub.id,
                "status": cancelled_sub.status
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )

@router.get("/usage")
async def get_usage_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get usage history for the current user"""
    subscription_service = SubscriptionService(db)
    
    try:
        current_usage = subscription_service.get_current_usage(current_user.id)
        
        return {
            "success": True,
            "data": current_usage
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage data: {str(e)}"
        )

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks for subscription events"""
    from fastapi import Request
    import stripe
    
    stripe.api_key = "sk_test_..."  # Replace with actual Stripe key
    webhook_secret = "whsec_..."  # Replace with actual webhook secret
    
    try:
        body = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        event = stripe.Webhook.construct_event(
            body, sig_header, webhook_secret
        )
        
        subscription_service = SubscriptionService(db)
        
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = int(session["metadata"]["user_id"])
            plan_type = session["metadata"]["plan_type"]
            
            # Create subscription
            subscription = subscription_service.create_subscription(
                user_id=user_id,
                plan_type=plan_type,
                stripe_customer_id=session["customer"]
            )
            
            # Record billing event
            subscription_service.create_billing_event(
                user_id=user_id,
                subscription_id=subscription.id,
                event_type="subscription_created",
                amount=session["amount_total"] / 100,  # Convert from cents
                stripe_event_id=event["id"]
            )
            
        elif event["type"] == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            # Handle successful payment
            pass
            
        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]
            # Handle failed payment
            pass
            
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook error: {str(e)}"
        ) 