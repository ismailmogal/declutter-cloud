from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
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
    email = Column(String, unique=True, index=True, nullable=False)
    provider = Column(String, nullable=False)  # google, microsoft, email
    provider_id = Column(String, nullable=True)  # ID from OAuth provider
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)  # For email/password users
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    cloud_connections = relationship("CloudConnection", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class CloudConnection(Base):
    __tablename__ = "cloud_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False)  # onedrive, googledrive
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    provider_user_id = Column(String, nullable=True)
    provider_user_email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="cloud_connections")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cloud_id = Column(String, nullable=False)  # ID from the cloud provider
    provider = Column(String, nullable=False)  # onedrive, googledrive, etc.
    name = Column(String, nullable=False)
    size = Column(Integer, nullable=True)
    last_modified = Column(DateTime(timezone=True), nullable=True)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags or JSON string
    extra = Column(Text, nullable=True)  # For additional metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User") 