from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User
from backend.services.analytics_service import get_file_analytics_service
from backend.services.storage_analysis_service import StorageAnalysisService
from backend.services.cost_calculator_service import CostCalculatorService
from typing import Dict, Any

router = APIRouter()

@router.get("/api/analytics/files")
def get_file_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get basic file analytics"""
    return get_file_analytics_service(current_user, db)

@router.get("/api/analytics/storage")
def get_storage_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive storage analysis for user"""
    try:
        storage_service = StorageAnalysisService(db)
        analysis = storage_service.analyze_user_storage(current_user.id)
        
        return {
            "success": True,
            "data": analysis
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze storage: {str(e)}"
        )

@router.get("/api/analytics/savings")
def get_potential_savings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get potential cost savings"""
    try:
        storage_service = StorageAnalysisService(db)
        savings = storage_service.calculate_potential_savings(current_user.id)
        
        return {
            "success": True,
            "data": savings
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate savings: {str(e)}"
        )

@router.get("/api/analytics/recommendations")
def get_optimization_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get optimization recommendations"""
    try:
        storage_service = StorageAnalysisService(db)
        recommendations = storage_service.generate_recommendations(current_user.id)
        
        return {
            "success": True,
            "data": recommendations
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )

@router.get("/api/analytics/file-types")
def get_file_type_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file type distribution analysis"""
    try:
        storage_service = StorageAnalysisService(db)
        analysis = storage_service.analyze_user_storage(current_user.id)
        
        return {
            "success": True,
            "data": analysis['file_types']
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze file types: {str(e)}"
        )

@router.get("/api/analytics/usage-patterns")
def get_usage_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file usage pattern analysis"""
    try:
        storage_service = StorageAnalysisService(db)
        analysis = storage_service.analyze_user_storage(current_user.id)
        
        return {
            "success": True,
            "data": analysis['usage_patterns']
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze usage patterns: {str(e)}"
        )

@router.get("/api/analytics/storage-growth")
def get_storage_growth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get storage growth over time"""
    try:
        # Get historical storage analysis data
        from backend.models import StorageAnalysis
        from sqlalchemy import func
        
        analyses = db.query(StorageAnalysis).filter(
            StorageAnalysis.user_id == current_user.id
        ).order_by(StorageAnalysis.analysis_date.desc()).limit(12).all()
        
        growth_data = []
        for analysis in reversed(analyses):
            growth_data.append({
                'date': analysis.analysis_date.isoformat(),
                'total_size_gb': analysis.total_size / (1024**3),
                'file_count': analysis.file_count,
                'duplicate_size_gb': analysis.duplicate_size / (1024**3),
                'potential_savings': float(analysis.potential_savings)
            })
        
        return {
            "success": True,
            "data": growth_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage growth: {str(e)}"
        )

@router.get("/api/analytics/cost-breakdown")
def get_cost_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cost breakdown by cloud provider"""
    try:
        storage_service = StorageAnalysisService(db)
        cost_calculator = CostCalculatorService()
        analysis = storage_service.analyze_user_storage(current_user.id)
        
        cost_breakdown = {}
        total_cost = 0.0
        
        for provider, data in analysis['by_provider'].items():
            size_gb = data['total_size'] / (1024**3)
            cost = cost_calculator.calculate_storage_cost(size_gb, provider)
            cost_breakdown[provider] = {
                'size_gb': size_gb,
                'monthly_cost': cost,
                'yearly_cost': cost * 12,
                'file_count': data['total_files']
            }
            total_cost += cost
        
        return {
            "success": True,
            "data": {
                'cost_breakdown': cost_breakdown,
                'total_monthly_cost': total_cost,
                'total_yearly_cost': total_cost * 12,
                'provider_costs': cost_calculator.get_provider_costs()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cost breakdown: {str(e)}"
        )

@router.post("/api/analytics/track-usage/{file_id}")
def track_file_usage(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track file access for usage pattern analysis"""
    try:
        storage_service = StorageAnalysisService(db)
        pattern = storage_service.track_file_usage(current_user.id, file_id)
        
        return {
            "success": True,
            "data": {
                "file_id": file_id,
                "access_count": pattern.access_count,
                "access_frequency": pattern.access_frequency,
                "last_accessed": pattern.last_accessed.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track file usage: {str(e)}"
        ) 