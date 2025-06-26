from dotenv import load_dotenv
import os

load_dotenv()

from datetime import datetime, timezone

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
def debug_log(*args):
    if DEBUG:
        print("[DEBUG]", *args) 