from fastapi import APIRouter, Depends, Body, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Any
from backend.database import get_db
from backend.services.ai_service import AIService
from backend.services.subscription_service import SubscriptionService
from backend.auth import get_current_user
from backend.models import User, File

router = APIRouter(prefix="/ai", tags=["ai"])

@router.get("/analyze-usage")
async def analyze_usage_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze user's file usage patterns and provide insights"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Analyze usage patterns
        analysis = ai_service.analyze_usage_patterns(current_user.id)
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "usage_analysis")
        
        return {
            "success": True,
            "data": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze usage patterns: {str(e)}"
        )

@router.get("/cleanup-recommendations")
async def get_cleanup_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered cleanup recommendations"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Get cleanup recommendations
        recommendations = ai_service.generate_cleanup_recommendations(current_user.id)
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "cleanup_recommendations", len(recommendations))
        
        return {
            "success": True,
            "data": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cleanup recommendations: {str(e)}"
        )

@router.get("/smart-folders")
async def get_smart_folder_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered smart folder suggestions"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Get smart folder suggestions
        suggestions = ai_service.create_smart_folders(current_user.id)
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "smart_folders", len(suggestions))
        
        return {
            "success": True,
            "data": suggestions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate smart folder suggestions: {str(e)}"
        )

@router.post("/categorize-files")
async def categorize_files(
    file_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Categorize multiple files using AI"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Get files belonging to user
        files = db.query(File).filter(
            and_(
                File.id.in_(file_ids),
                File.user_id == current_user.id
            )
        ).all()
        
        if len(files) != len(file_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some files not found or don't belong to user"
            )
        
        # Categorize each file
        categorizations = []
        for file in files:
            categories = ai_service.categorize_file(file)
            categorizations.append({
                "file_id": file.id,
                "file_name": file.name,
                "categories": categories
            })
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "file_categorization", len(files))
        
        return {
            "success": True,
            "data": categorizations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to categorize files: {str(e)}"
        )

@router.get("/storage-forecast")
async def get_storage_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered storage growth forecast"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Get files for analysis
        files = db.query(File).filter(File.user_id == current_user.id).all()
        
        if not files:
            return {
                "success": True,
                "data": {"error": "No files found for analysis"}
            }
        
        # Analyze usage patterns
        analysis = ai_service.analyze_usage_patterns(current_user.id)
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "storage_forecast")
        
        return {
            "success": True,
            "data": {
                "current_analysis": analysis,
                "recommendations": ai_service.generate_cleanup_recommendations(current_user.id)[:5]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate storage forecast: {str(e)}"
        )

@router.post("/bulk-organize")
async def bulk_organize_files(
    organization_rules: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply AI-powered bulk organization rules"""
    ai_service = AIService(db)
    subscription_service = SubscriptionService(db)
    
    try:
        # Check if user has access to AI features
        if not subscription_service.check_user_limits(current_user.id, "api_calls", api_calls=1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI features require Pro subscription or higher"
            )
        
        # Get all user files
        files = db.query(File).filter(File.user_id == current_user.id).all()
        
        if not files:
            return {
                "success": True,
                "data": {"message": "No files to organize"}
            }
        
        # Apply organization rules
        organized_files = []
        for file in files:
            categories = ai_service.categorize_file(file)
            
            # Apply rules based on categories
            new_path = file.path  # Default to current path
            
            # Example rule: organize by category
            if "category" in organization_rules and organization_rules["category"]:
                category = categories.get("category", "general")
                new_path = f"{category}/{file.name}"
            
            # Example rule: organize by file type
            elif "file_type" in organization_rules and organization_rules["file_type"]:
                file_type = categories.get("type", "other")
                new_path = f"{file_type}/{file.name}"
            
            # Example rule: organize by date
            elif "date" in organization_rules and organization_rules["date"]:
                if file.last_modified:
                    year = file.last_modified.year
                    month = file.last_modified.month
                    new_path = f"{year}/{month:02d}/{file.name}"
            
            if new_path != file.path:
                organized_files.append({
                    "file_id": file.id,
                    "file_name": file.name,
                    "old_path": file.path,
                    "new_path": new_path,
                    "categories": categories
                })
        
        # Record usage
        ai_service.record_ai_usage(current_user.id, "bulk_organize", len(files))
        
        return {
            "success": True,
            "data": {
                "organized_files": organized_files,
                "total_files_processed": len(files),
                "files_to_move": len(organized_files)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to organize files: {str(e)}"
        )

@router.get("/ai-features-status")
async def get_ai_features_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of AI features and user's access level"""
    subscription_service = SubscriptionService(db)
    
    try:
        # Get user's subscription
        subscription = subscription_service.get_user_subscription(current_user.id)
        
        # Get current usage
        current_usage = subscription_service.get_current_usage(current_user.id)
        
        # Determine AI feature access
        if subscription and subscription.plan_type in ["pro", "business", "enterprise"]:
            ai_access = True
            features = [
                "file_categorization",
                "usage_analytics",
                "cleanup_recommendations",
                "smart_folders",
                "storage_forecast",
                "bulk_organization"
            ]
        else:
            ai_access = False
            features = []
        
        return {
            "success": True,
            "data": {
                "ai_access": ai_access,
                "subscription_plan": subscription.plan_type if subscription else "free",
                "available_features": features,
                "current_usage": current_usage,
                "upgrade_required": not ai_access
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI features status: {str(e)}"
        ) 