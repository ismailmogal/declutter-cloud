# Script to initialize or reset dev.db for development use
import sys
import os
import subprocess
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import Base, engine
import models

if __name__ == "__main__":
    print("Upgrading database schema using Alembic...")
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    print("Database schema is now up to date.") 