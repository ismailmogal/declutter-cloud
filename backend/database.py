from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv
import logging

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

if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Production: Use connection pooling for PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,         # Number of connections to keep in the pool
        max_overflow=20,      # Number of connections to allow in overflow
        pool_timeout=30,      # Seconds to wait before giving up on getting a connection
        pool_recycle=1800     # Recycle connections after 30 minutes
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