#!/bin/bash


# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install uvicorn

# Start the FastAPI server
uvicorn main:app --reload --port 8000
