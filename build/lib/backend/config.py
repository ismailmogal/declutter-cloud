from dotenv import load_dotenv
import os
from enum import Enum
from backend.helpers import debug_log
from datetime import datetime, timezone


# Load .env from backend directory if present
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- OneDrive Credentials ---
# The .env file MUST contain these exact variable names.
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
MICROSOFT_REDIRECT_URI = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/auth/onedrive/callback")

# --- Google Credentials ---
# The .env file can optionally contain these.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# In-memory session store (for demo only)
sessions = {}

# Debug log function
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

# Environment detection
ENVIRONMENT = Environment(os.getenv("ENVIRONMENT", "development"))

# Environment-specific settings
if ENVIRONMENT == Environment.PRODUCTION:
    DEBUG = False
    CORS_ORIGINS = [
        "https://your-frontend-domain.com",  # TODO: Set your production frontend domain
    ]
    RATE_LIMIT_AUTH = "5/minute"
    RATE_LIMIT_DELETE = "20/minute"
    LOG_LEVEL = "WARNING"
elif ENVIRONMENT == Environment.STAGING:
    DEBUG = False
    CORS_ORIGINS = [
        "https://staging.your-frontend-domain.com",
        "http://localhost:5173",
    ]
    RATE_LIMIT_AUTH = "10/minute"
    RATE_LIMIT_DELETE = "30/minute"
    LOG_LEVEL = "INFO"
else:  # DEVELOPMENT
    DEBUG = True
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    RATE_LIMIT_AUTH = "100/minute"
    RATE_LIMIT_DELETE = "100/minute"
    LOG_LEVEL = "DEBUG"

# Database pool settings based on environment
if ENVIRONMENT == Environment.PRODUCTION:
    DB_POOL_SIZE = 20
    DB_MAX_OVERFLOW = 30
    DB_POOL_TIMEOUT = 30
elif ENVIRONMENT == Environment.STAGING:
    DB_POOL_SIZE = 10
    DB_MAX_OVERFLOW = 20
    DB_POOL_TIMEOUT = 30
else:  # DEVELOPMENT
    DB_POOL_SIZE = 5
    DB_MAX_OVERFLOW = 10
    DB_POOL_TIMEOUT = 30

# Security settings
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 1 week
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# File upload settings
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "100")) * 1024 * 1024  # 100MB default
ALLOWED_FILE_TYPES = os.getenv("ALLOWED_FILE_TYPES", "image/*,application/pdf,text/*").split(",")

# API settings
API_V1_PREFIX = "/api/v1"
PROJECT_NAME = "Declutter Cloud API"
VERSION = "1.0.0"

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Logging configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "": {
            "handlers": ["default"],
            "level": LOG_LEVEL,
        },
    },
}

 