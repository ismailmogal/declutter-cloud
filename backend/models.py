from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, BigInteger, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
from database import Base
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    cloud_connections = relationship("CloudConnection", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    files = relationship("File", back_populates="user", cascade="all, delete-orphan")

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