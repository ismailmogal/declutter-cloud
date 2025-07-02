from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
from backend.models import User, File, CloudConnection
from backend.services.subscription_service import SubscriptionService

class TeamService:
    def __init__(self, db: Session):
        self.db = db
        self.subscription_service = SubscriptionService(db)
    
    def create_team(self, owner_id: int, team_name: str, description: str = None) -> Dict[str, Any]:
        """Create a new team"""
        # Check if user has enterprise subscription
        subscription = self.subscription_service.get_user_subscription(owner_id)
        if not subscription or subscription.plan_type not in ["business", "enterprise"]:
            raise ValueError("Team features require Business or Enterprise subscription")
        
        # Create team record (assuming we have a Team model)
        # For now, we'll use a simple approach with user relationships
        team = {
            "id": f"team_{owner_id}_{datetime.utcnow().timestamp()}",
            "name": team_name,
            "description": description,
            "owner_id": owner_id,
            "created_at": datetime.utcnow(),
            "members": [owner_id]
        }
        
        return team
    
    def add_team_member(self, team_id: str, owner_id: int, new_member_email: str, role: str = "member") -> Dict[str, Any]:
        """Add a new member to the team"""
        # Check if user has permission to add members
        if not self._is_team_owner(team_id, owner_id):
            raise ValueError("Only team owners can add members")
        
        # Find user by email
        new_member = self.db.query(User).filter(User.email == new_member_email).first()
        if not new_member:
            raise ValueError("User not found")
        
        # Check team size limits
        current_members = self._get_team_members(team_id)
        subscription = self.subscription_service.get_user_subscription(owner_id)
        
        if subscription.plan_type == "business" and len(current_members) >= 10:
            raise ValueError("Business plan limited to 10 team members")
        
        # Add member to team
        member_info = {
            "user_id": new_member.id,
            "email": new_member.email,
            "role": role,
            "joined_at": datetime.utcnow()
        }
        
        return member_info
    
    def remove_team_member(self, team_id: str, owner_id: int, member_id: int) -> bool:
        """Remove a member from the team"""
        # Check if user has permission to remove members
        if not self._is_team_owner(team_id, owner_id):
            raise ValueError("Only team owners can remove members")
        
        # Check if trying to remove owner
        if member_id == owner_id:
            raise ValueError("Cannot remove team owner")
        
        # Remove member from team
        return True
    
    def get_team_analytics(self, team_id: str, user_id: int) -> Dict[str, Any]:
        """Get analytics for the entire team"""
        # Check if user is team member
        if not self._is_team_member(team_id, user_id):
            raise ValueError("User is not a team member")
        
        # Get all team members
        team_members = self._get_team_members(team_id)
        member_ids = [member["user_id"] for member in team_members]
        
        # Get team files
        team_files = self.db.query(File).filter(File.user_id.in_(member_ids)).all()
        
        # Calculate team statistics
        total_files = len(team_files)
        total_size = sum(f.size or 0 for f in team_files)
        
        # File type distribution
        type_distribution = {}
        for file in team_files:
            file_type = self._get_file_type(file)
            type_distribution[file_type] = type_distribution.get(file_type, 0) + 1
        
        # Storage usage by member
        member_usage = {}
        for member in team_members:
            member_files = [f for f in team_files if f.user_id == member["user_id"]]
            member_usage[member["email"]] = {
                "files_count": len(member_files),
                "storage_gb": sum(f.size or 0 for f in member_files) / (1024**3)
            }
        
        # Optimization opportunities
        optimization_opportunities = self._find_team_optimization_opportunities(team_files)
        
        return {
            "team_id": team_id,
            "total_members": len(team_members),
            "total_files": total_files,
            "total_storage_gb": total_size / (1024**3),
            "type_distribution": type_distribution,
            "member_usage": member_usage,
            "optimization_opportunities": optimization_opportunities
        }
    
    def get_shared_workspace(self, team_id: str, user_id: int) -> Dict[str, Any]:
        """Get shared workspace for the team"""
        # Check if user is team member
        if not self._is_team_member(team_id, user_id):
            raise ValueError("User is not a team member")
        
        # Get team members
        team_members = self._get_team_members(team_id)
        member_ids = [member["user_id"] for member in team_members]
        
        # Get shared files (files that might be duplicates across team members)
        shared_files = self._find_shared_files(member_ids)
        
        # Get recent team activity
        recent_activity = self._get_team_activity(team_id)
        
        return {
            "team_id": team_id,
            "shared_files": shared_files,
            "recent_activity": recent_activity,
            "members": team_members
        }
    
    def create_shared_folder(self, team_id: str, user_id: int, folder_name: str, folder_path: str) -> Dict[str, Any]:
        """Create a shared folder for the team"""
        # Check if user has permission
        if not self._is_team_member(team_id, user_id):
            raise ValueError("User is not a team member")
        
        # Create shared folder structure
        shared_folder = {
            "id": f"shared_{team_id}_{datetime.utcnow().timestamp()}",
            "name": folder_name,
            "path": folder_path,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "team_id": team_id
        }
        
        return shared_folder
    
    def get_team_permissions(self, team_id: str, user_id: int) -> Dict[str, bool]:
        """Get user permissions for the team"""
        # Check if user is team member
        if not self._is_team_member(team_id, user_id):
            return {
                "can_view": False,
                "can_edit": False,
                "can_add_members": False,
                "can_remove_members": False,
                "can_manage_settings": False
            }
        
        # Get user role
        user_role = self._get_user_role(team_id, user_id)
        
        if user_role == "owner":
            return {
                "can_view": True,
                "can_edit": True,
                "can_add_members": True,
                "can_remove_members": True,
                "can_manage_settings": True
            }
        elif user_role == "admin":
            return {
                "can_view": True,
                "can_edit": True,
                "can_add_members": True,
                "can_remove_members": False,
                "can_manage_settings": False
            }
        else:  # member
            return {
                "can_view": True,
                "can_edit": True,
                "can_add_members": False,
                "can_remove_members": False,
                "can_manage_settings": False
            }
    
    def _is_team_owner(self, team_id: str, user_id: int) -> bool:
        """Check if user is team owner"""
        # This would check against the actual team model
        # For now, we'll assume the team owner is the creator
        return True  # Simplified for now
    
    def _is_team_member(self, team_id: str, user_id: int) -> bool:
        """Check if user is team member"""
        # This would check against the actual team model
        # For now, we'll assume all users are members
        return True  # Simplified for now
    
    def _get_team_members(self, team_id: str) -> List[Dict[str, Any]]:
        """Get team members"""
        # This would query the actual team model
        # For now, return a simplified structure
        return [
            {
                "user_id": 1,
                "email": "owner@example.com",
                "role": "owner",
                "joined_at": datetime.utcnow()
            }
        ]
    
    def _get_user_role(self, team_id: str, user_id: int) -> str:
        """Get user role in team"""
        # This would query the actual team model
        # For now, return owner for simplicity
        return "owner"
    
    def _get_file_type(self, file: File) -> str:
        """Get file type"""
        if not file.name:
            return "unknown"
        
        name_lower = file.name.lower()
        
        if any(ext in name_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']):
            return "image"
        elif any(ext in name_lower for ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']):
            return "video"
        elif any(ext in name_lower for ext in ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']):
            return "audio"
        elif any(ext in name_lower for ext in ['.pdf', '.doc', '.docx', '.txt', '.rtf']):
            return "document"
        elif any(ext in name_lower for ext in ['.xls', '.xlsx', '.csv']):
            return "spreadsheet"
        elif any(ext in name_lower for ext in ['.ppt', '.pptx', '.key']):
            return "presentation"
        elif any(ext in name_lower for ext in ['.zip', '.rar', '.7z', '.tar', '.gz']):
            return "archive"
        elif any(ext in name_lower for ext in ['.py', '.js', '.html', '.css', '.java', '.cpp', '.c']):
            return "code"
        else:
            return "other"
    
    def _find_shared_files(self, member_ids: List[int]) -> List[Dict[str, Any]]:
        """Find files that might be shared across team members"""
        # Get all files from team members
        all_files = self.db.query(File).filter(File.user_id.in_(member_ids)).all()
        
        # Group files by name and size to find potential duplicates
        file_groups = {}
        for file in all_files:
            key = f"{file.name}_{file.size}"
            if key not in file_groups:
                file_groups[key] = []
            file_groups[key].append(file)
        
        # Find groups with multiple files (potential duplicates)
        shared_files = []
        for key, files in file_groups.items():
            if len(files) > 1:
                shared_files.append({
                    "name": files[0].name,
                    "size": files[0].size,
                    "count": len(files),
                    "owners": [f.user_id for f in files],
                    "total_size_gb": (files[0].size or 0) * len(files) / (1024**3)
                })
        
        return shared_files
    
    def _get_team_activity(self, team_id: str) -> List[Dict[str, Any]]:
        """Get recent team activity"""
        # This would query actual activity logs
        # For now, return sample data
        return [
            {
                "type": "file_added",
                "user_id": 1,
                "file_name": "example.pdf",
                "timestamp": datetime.utcnow() - timedelta(hours=2)
            },
            {
                "type": "member_added",
                "user_id": 2,
                "email": "newmember@example.com",
                "timestamp": datetime.utcnow() - timedelta(days=1)
            }
        ]
    
    def _find_team_optimization_opportunities(self, team_files: List[File]) -> Dict[str, Any]:
        """Find optimization opportunities for the team"""
        # Calculate potential savings
        total_size = sum(f.size or 0 for f in team_files)
        
        # Find duplicates within team
        file_groups = {}
        for file in team_files:
            key = f"{file.name}_{file.size}"
            if key not in file_groups:
                file_groups[key] = []
            file_groups[key].append(file)
        
        duplicate_savings = 0
        duplicate_count = 0
        for files in file_groups.values():
            if len(files) > 1:
                duplicate_savings += (files[0].size or 0) * (len(files) - 1)
                duplicate_count += len(files) - 1
        
        return {
            "total_storage_gb": total_size / (1024**3),
            "potential_savings_gb": duplicate_savings / (1024**3),
            "duplicate_files": duplicate_count,
            "optimization_percentage": (duplicate_savings / total_size * 100) if total_size > 0 else 0
        } 