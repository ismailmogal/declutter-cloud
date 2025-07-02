from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import logging
from backend.config import DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_TIMEOUT

# Enable SQLAlchemy pool logging for monitoring
logging.basicConfig()
logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)

# Load .env from backend directory if present
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Database URL - prefer .env, then environment, then SQLite for dev
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./dev.db"
)

print("[DB DEBUG] Using DATABASE_URL:", DATABASE_URL)

# Convert PostgreSQL URL for SQLAlchemy if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure connection pooling for production
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_timeout=DB_POOL_TIMEOUT,
        echo=False
    )
else:
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 