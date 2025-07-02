#!/usr/bin/env python3
"""
Database migration script to add Phase 1 commercial features tables.
Run this script to add the new tables required for storage analysis and optimization.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from backend.helpers import debug_log

def create_phase1_tables():
    """Create the new tables for Phase 1 features"""
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    
    # Convert PostgreSQL URL for SQLAlchemy if needed
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(DATABASE_URL)
    
    # Use transaction for SQLite compatibility
    with engine.begin() as conn:
        # Create storage_analysis table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS storage_analysis (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                cloud_provider VARCHAR(50),
                total_size BIGINT,
                file_count INTEGER,
                duplicate_size BIGINT,
                duplicate_count INTEGER,
                potential_savings DECIMAL(10,2),
                analysis_date TIMESTAMP DEFAULT NOW()
            );
        """))
        
        # Create file_usage_patterns table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS file_usage_patterns (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                file_id INTEGER REFERENCES files(id),
                access_count INTEGER DEFAULT 0,
                last_accessed TIMESTAMP,
                access_frequency VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))
        
        # Create optimization_recommendations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS optimization_recommendations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                recommendation_type VARCHAR(50),
                file_ids INTEGER[],
                potential_savings DECIMAL(10,2),
                priority INTEGER,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))
        
        # Add indexes for better performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_storage_analysis_user_id 
            ON storage_analysis(user_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_storage_analysis_date 
            ON storage_analysis(analysis_date);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_file_usage_patterns_user_id 
            ON file_usage_patterns(user_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_file_usage_patterns_file_id 
            ON file_usage_patterns(file_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_user_id 
            ON optimization_recommendations(user_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status 
            ON optimization_recommendations(status);
        """))
        
        debug_log("Phase 1 tables created successfully!")

if __name__ == "__main__":
    print("Creating Phase 1 commercial features tables...")
    create_phase1_tables()
    print("Migration completed successfully!") 