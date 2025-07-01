#!/bin/bash

# Declutter Cloud Production Deployment Script
set -e  # Exit on any error

echo "🚀 Starting Declutter Cloud Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/main.py" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Environment Setup
print_status "Setting up production environment..."

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    print_warning "No .env file found. Please copy production.env.template to .env and configure it."
    print_status "You can run: cp backend/production.env.template backend/.env"
    exit 1
fi

# Step 2: Backend Dependencies
print_status "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Step 3: Database Migration
print_status "Running database migrations..."
if command -v alembic &> /dev/null; then
    alembic upgrade head
else
    print_warning "Alembic not found. Skipping database migrations."
fi

# Step 4: Test Backend
print_status "Testing backend startup..."
python -c "from main import app; print('✅ Backend loads successfully')"

# Step 5: Frontend Build
print_status "Building frontend..."
cd ../frontend
npm install
npm run build

# Step 6: Health Check
print_status "Performing health checks..."
cd ../backend

# Start backend in background for health check
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test health endpoints
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_status "✅ Health check passed"
else
    print_error "❌ Health check failed"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

if curl -f http://localhost:8000/ready > /dev/null 2>&1; then
    print_status "✅ Readiness check passed"
else
    print_error "❌ Readiness check failed"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Stop test backend
kill $BACKEND_PID 2>/dev/null || true

print_status "🎉 Production deployment preparation completed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Configure your production environment variables"
print_status "2. Set up your production database"
print_status "3. Configure your cloud provider OAuth settings"
print_status "4. Deploy to your chosen platform (Railway, Render, Heroku, etc.)"
print_status "5. Set up monitoring and alerting"
print_status ""
print_status "See DEPLOYMENT.md for detailed instructions." 