#!/bin/bash
set -e

# 1. Backend: Install dependencies
cd backend
pip install -r requirements.txt

# 2. Backend: Run migrations (if using Alembic)
alembic upgrade head

# 3. Frontend: Install dependencies and build
cd ../frontend
npm ci
npm run build

# 4. (Optional) Move frontend build to backend/static if needed
# Uncomment and adjust the following lines if your backend serves static files
# mkdir -p ../backend/static
# cp -r dist/* ../backend/static/

# 5. Return to project root
echo "Deployment build steps completed successfully." 