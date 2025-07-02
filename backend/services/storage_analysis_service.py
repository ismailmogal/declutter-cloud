from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from backend.models import User, File, CloudConnection, StorageAnalysis, FileUsagePattern, OptimizationRecommendation
from backend.services.cost_calculator_service import CostCalculatorService
from collections import defaultdict
import os

class StorageAnalysisService:
    def __init__(self, db: Session):
        self.db = db
        self.cost_calculator = CostCalculatorService()
    
    def analyze_user_storage(self, user_id: int) -> Dict[str, Any]:
        """Analyze user's storage across all connected clouds"""
        # Get all user files
        files = self.db.query(File).filter(File.user_id == user_id).all()
        
        # Get cloud connections
        connections = self.db.query(CloudConnection).filter(
            CloudConnection.user_id == user_id,
            CloudConnection.is_active == True
        ).all()
        
        # Analyze by cloud provider
        cloud_analysis = {}
        total_analysis = {
            'total_size': 0,
            'total_files': 0,
            'duplicate_size': 0,
            'duplicate_count': 0,
            'potential_savings': 0.0
        }
        
        for connection in connections:
            provider = connection.provider
            provider_files = [f for f in files if f.cloud_provider == provider]
            
            analysis = self._analyze_provider_storage(provider_files)
            cloud_analysis[provider] = analysis
            
            # Add to totals
            total_analysis['total_size'] += analysis['total_size']
            total_analysis['total_files'] += analysis['total_files']
            total_analysis['duplicate_size'] += analysis['duplicate_size']
            total_analysis['duplicate_count'] += analysis['duplicate_count']
            total_analysis['potential_savings'] += analysis['potential_savings']
        
        # Save analysis to database
        self._save_storage_analysis(user_id, total_analysis)
        
        return {
            'overview': total_analysis,
            'by_provider': cloud_analysis,
            'file_types': self._analyze_file_types(files),
            'usage_patterns': self._analyze_usage_patterns(user_id),
            'recommendations': self.generate_recommendations(user_id)
        }
    
    def _analyze_provider_storage(self, files: List[File]) -> Dict[str, Any]:
        """Analyze storage for a specific cloud provider"""
        total_size = sum(f.size or 0 for f in files)
        total_files = len(files)
        
        # Find duplicates
        duplicate_analysis = self._find_duplicates(files)
        
        # Calculate potential savings
        potential_savings = self.cost_calculator.calculate_storage_cost(
            duplicate_analysis['duplicate_size'] / (1024**3),  # Convert to GB
            'onedrive'  # Default provider
        )
        
        return {
            'total_size': total_size,
            'total_files': total_files,
            'duplicate_size': duplicate_analysis['duplicate_size'],
            'duplicate_count': duplicate_analysis['duplicate_count'],
            'potential_savings': potential_savings,
            'duplicate_groups': duplicate_analysis['groups']
        }
    
    def _find_duplicates(self, files: List[File]) -> Dict[str, Any]:
        """Find duplicate files based on name and size"""
        file_groups = defaultdict(list)
        
        for file in files:
            # Group by name and size (simple deduplication)
            key = f"{file.name}_{file.size}"
            file_groups[key].append(file)
        
        duplicate_size = 0
        duplicate_count = 0
        duplicate_groups = []
        
        for key, group in file_groups.items():
            if len(group) > 1:
                duplicate_size += (group[0].size or 0) * (len(group) - 1)
                duplicate_count += len(group) - 1
                duplicate_groups.append({
                    'key': key,
                    'files': group,
                    'size': group[0].size or 0,
                    'count': len(group)
                })
        
        return {
            'duplicate_size': duplicate_size,
            'duplicate_count': duplicate_count,
            'groups': duplicate_groups
        }
    
    def _analyze_file_types(self, files: List[File]) -> Dict[str, Any]:
        """Analyze file type distribution"""
        type_distribution = defaultdict(lambda: {'count': 0, 'size': 0})
        
        for file in files:
            file_type = self._get_file_type(file.name)
            type_distribution[file_type]['count'] += 1
            type_distribution[file_type]['size'] += file.size or 0
        
        return dict(type_distribution)
    
    def _get_file_type(self, filename: str) -> str:
        """Get file type from filename"""
        ext = os.path.splitext(filename)[1].lower()
        
        # Map extensions to categories
        type_mapping = {
            '.jpg': 'Images', '.jpeg': 'Images', '.png': 'Images', '.gif': 'Images',
            '.mp4': 'Videos', '.avi': 'Videos', '.mov': 'Videos', '.mkv': 'Videos',
            '.pdf': 'Documents', '.doc': 'Documents', '.docx': 'Documents',
            '.mp3': 'Audio', '.wav': 'Audio', '.flac': 'Audio',
            '.zip': 'Archives', '.rar': 'Archives', '.7z': 'Archives',
            '.txt': 'Text', '.md': 'Text', '.json': 'Text',
            '.exe': 'Executables', '.dmg': 'Executables',
            '.db': 'Databases', '.sql': 'Databases'
        }
        
        return type_mapping.get(ext, 'Other')
    
    def _analyze_usage_patterns(self, user_id: int) -> Dict[str, Any]:
        """Analyze file usage patterns"""
        patterns = self.db.query(FileUsagePattern).filter(
            FileUsagePattern.user_id == user_id
        ).all()
        
        if not patterns:
            return {
                'frequently_accessed': 0,
                'rarely_accessed': 0,
                'never_accessed': 0,
                'access_frequency': {}
            }
        
        access_frequency = defaultdict(int)
        for pattern in patterns:
            access_frequency[pattern.access_frequency or 'unknown'] += 1
        
        return {
            'frequently_accessed': len([p for p in patterns if p.access_frequency == 'daily']),
            'rarely_accessed': len([p for p in patterns if p.access_frequency == 'yearly']),
            'never_accessed': len([p for p in patterns if p.access_count == 0]),
            'access_frequency': dict(access_frequency)
        }
    
    def calculate_potential_savings(self, user_id: int) -> Dict[str, Any]:
        """Calculate potential storage cost savings"""
        analysis = self.analyze_user_storage(user_id)
        
        # Calculate savings by provider
        savings_by_provider = {}
        total_savings = 0.0
        
        for provider, data in analysis['by_provider'].items():
            savings = self.cost_calculator.calculate_storage_cost(
                data['duplicate_size'] / (1024**3),
                provider
            )
            savings_by_provider[provider] = savings
            total_savings += savings
        
        return {
            'total_savings': total_savings,
            'by_provider': savings_by_provider,
            'duplicate_savings': analysis['overview']['potential_savings'],
            'recommendations': analysis['recommendations']
        }
    
    def generate_recommendations(self, user_id: int) -> List[Dict[str, Any]]:
        """Generate optimization recommendations"""
        files = self.db.query(File).filter(File.user_id == user_id).all()
        recommendations = []
        
        # Find large files that could be compressed
        large_files = [f for f in files if f.size and f.size > 100 * 1024 * 1024]  # > 100MB
        if large_files:
            recommendations.append({
                'type': 'compress',
                'title': 'Compress Large Files',
                'description': f'Found {len(large_files)} files larger than 100MB that could be compressed',
                'potential_savings': sum(f.size or 0 for f in large_files) * 0.3 / (1024**3),  # 30% savings
                'priority': 3,
                'file_ids': [f.id for f in large_files[:10]]  # Limit to 10 files
            })
        
        # Find old files that could be archived
        old_files = [f for f in files if f.last_modified and 
                    (datetime.utcnow() - f.last_modified).days > 365]
        if old_files:
            recommendations.append({
                'type': 'archive',
                'title': 'Archive Old Files',
                'description': f'Found {len(old_files)} files not accessed in over a year',
                'potential_savings': sum(f.size or 0 for f in old_files) * 0.5 / (1024**3),  # 50% savings
                'priority': 2,
                'file_ids': [f.id for f in old_files[:20]]
            })
        
        # Find duplicate files
        duplicate_groups = self._find_duplicates(files)['groups']
        if duplicate_groups:
            recommendations.append({
                'type': 'delete',
                'title': 'Remove Duplicates',
                'description': f'Found {len(duplicate_groups)} groups of duplicate files',
                'potential_savings': duplicate_groups[0]['size'] * (duplicate_groups[0]['count'] - 1) / (1024**3),
                'priority': 5,
                'file_ids': [f.id for group in duplicate_groups for f in group['files'][1:]]  # Keep first, delete rest
            })
        
        # Save recommendations to database
        self._save_recommendations(user_id, recommendations)
        
        return recommendations
    
    def track_file_usage(self, user_id: int, file_id: int):
        """Track file access patterns"""
        # Get or create usage pattern
        pattern = self.db.query(FileUsagePattern).filter(
            and_(
                FileUsagePattern.user_id == user_id,
                FileUsagePattern.file_id == file_id
            )
        ).first()
        
        if not pattern:
            pattern = FileUsagePattern(
                user_id=user_id,
                file_id=file_id,
                access_count=0,
                last_accessed=datetime.utcnow()
            )
            self.db.add(pattern)
        
        # Update access count and frequency
        pattern.access_count += 1
        pattern.last_accessed = datetime.utcnow()
        
        # Determine access frequency
        if pattern.access_count >= 30:
            pattern.access_frequency = 'daily'
        elif pattern.access_count >= 4:
            pattern.access_frequency = 'weekly'
        elif pattern.access_count >= 1:
            pattern.access_frequency = 'monthly'
        else:
            pattern.access_frequency = 'yearly'
        
        self.db.commit()
        return pattern
    
    def _save_storage_analysis(self, user_id: int, analysis: Dict[str, Any]):
        """Save storage analysis to database"""
        storage_analysis = StorageAnalysis(
            user_id=user_id,
            total_size=analysis['total_size'],
            file_count=analysis['total_files'],
            duplicate_size=analysis['duplicate_size'],
            duplicate_count=analysis['duplicate_count'],
            potential_savings=analysis['potential_savings']
        )
        
        self.db.add(storage_analysis)
        self.db.commit()
    
    def _save_recommendations(self, user_id: int, recommendations: List[Dict[str, Any]]):
        """Save optimization recommendations to database"""
        for rec in recommendations:
            recommendation = OptimizationRecommendation(
                user_id=user_id,
                recommendation_type=rec['type'],
                file_ids=rec['file_ids'],
                potential_savings=rec['potential_savings'],
                priority=rec['priority'],
                status='pending'
            )
            self.db.add(recommendation)
        
        self.db.commit() 