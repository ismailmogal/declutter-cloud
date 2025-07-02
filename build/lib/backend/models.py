from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, BigInteger, Index, Date, Float, DECIMAL, ARRAY
from sqlalchemy.dialects.postgresql import JSONB, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
from .database import Base
from pydantic import BaseModel
from typing import List, Optional

# Pydantic Schemas for API responses
class CloudConnectionSchema(BaseModel):
    id: int
    provider: str
    provider_user_email: Optional[str]
    is_active: bool = True

    class Config:
        from_attributes = True

class UserSchema(BaseModel):
    id: int
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    cloud_connections: List[CloudConnectionSchema] = []

    class Config:
        from_attributes = True

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    provider = Column(String(50), nullable=False)  # google, microsoft, email
    provider_id = Column(String(255), nullable=True)  # ID from OAuth provider
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    hashed_password = Column(String(255), nullable=True)  # For email/password users
    preferences = Column(JSONB, nullable=True) # For storing user preferences like theme
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # User preferences
    theme = Column(String, default="light")
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    notifications_enabled = Column(Boolean, default=True)
    
    # Relationships
    cloud_connections = relationship("CloudConnection", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    files = relationship("File", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    usage_records = relationship("Usage", back_populates="user")
    billing_events = relationship("BillingEvent", back_populates="user")
    storage_analyses = relationship("StorageAnalysis", back_populates="user")
    file_usage_patterns = relationship("FileUsagePattern", back_populates="user")
    optimization_recommendations = relationship("OptimizationRecommendation", back_populates="user")

class CloudConnection(Base):
    __tablename__ = "cloud_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # onedrive, googledrive
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    provider_user_id = Column(String(255), nullable=True)
    provider_user_email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="cloud_connections")
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_cloud_connection_user_provider', 'user_id', 'provider'),
        Index('idx_cloud_connection_active', 'is_active'),
    )

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_session_user_expires', 'user_id', 'expires_at'),
        Index('idx_session_expires', 'expires_at'),
    )

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cloud_id = Column(String(255), nullable=False)  # ID from the cloud provider
    provider = Column(String(50), nullable=False)  # onedrive, googledrive, etc.
    name = Column(String(500), nullable=False)
    size = Column(BigInteger, nullable=True)
    last_modified = Column(DateTime(timezone=True), nullable=True)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    path = Column(String(1000), nullable=True)  # Folder path
    tags = Column(String(1000), nullable=True)  # Comma-separated tags or JSON string
    extra = Column(Text, nullable=True)  # For additional metadata
    url = Column(String(2000), nullable=True)  # URL for file download/view, optional - cached for performance
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="files")
    usage_patterns = relationship("FileUsagePattern", back_populates="file")
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_file_user_provider', 'user_id', 'provider'),
        Index('idx_file_cloud_id', 'cloud_id'),
        Index('idx_file_name_size', 'name', 'size'),
        Index('idx_file_last_modified', 'last_modified'),
        Index('idx_file_size', 'size'),
        Index('idx_file_path', 'path'),
        Index('idx_file_user_modified', 'user_id', 'last_modified'),
        Index('idx_file_url', 'url'),  # Index for URL lookups
    )

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_type = Column(String, nullable=False)  # free, pro, business, enterprise
    status = Column(String, nullable=False, default="active")  # active, cancelled, expired
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="subscription")

class Usage(Base):
    __tablename__ = "usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    storage_used_gb = Column(Float, default=0.0)
    files_processed = Column(Integer, default=0)
    duplicates_found = Column(Integer, default=0)
    storage_saved_gb = Column(Float, default=0.0)
    api_calls = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="usage_records")

class BillingEvent(Base):
    __tablename__ = "billing_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    event_type = Column(String, nullable=False)  # subscription_created, payment_succeeded, payment_failed, etc.
    amount = Column(Float, nullable=True)
    currency = Column(String, default="usd")
    stripe_event_id = Column(String, nullable=True)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="billing_events")
    subscription = relationship("Subscription")

class StorageAnalysis(Base):
    __tablename__ = "storage_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cloud_provider = Column(String(50))
    total_size = Column(BigInteger, default=0)
    file_count = Column(Integer, default=0)
    duplicate_size = Column(BigInteger, default=0)
    duplicate_count = Column(Integer, default=0)
    potential_savings = Column(DECIMAL(10, 2), default=0.0)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="storage_analyses")

class FileUsagePattern(Base):
    __tablename__ = "file_usage_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    access_frequency = Column(String(20))  # daily, weekly, monthly, yearly
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="file_usage_patterns")
    file = relationship("File", back_populates="usage_patterns")

class OptimizationRecommendation(Base):
    __tablename__ = "optimization_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recommendation_type = Column(String(50))  # archive, compress, delete, move
    file_ids = Column(ARRAY(Integer))  # Array of file IDs
    potential_savings = Column(DECIMAL(10, 2), default=0.0)
    priority = Column(Integer, default=1)  # 1-5, 5 being highest
    status = Column(String(20), default='pending')  # pending, applied, dismissed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="optimization_recommendations") 