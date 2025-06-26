# Script to initialize or reset dev.db for development use
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import Base, engine
import models

if __name__ == "__main__":
    print("Resetting dev.db (dropping and recreating all tables)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("dev.db is now initialized with a fresh schema.") 