# Declutter Cloud

A web app to find and delete duplicate files in your cloud storage (starting with OneDrive).

## Features
- Social login (Google, Microsoft)
- Connect to OneDrive
- Browse files, find duplicates, and smart organize
- Modern UI inspired by OneDrive
- Automated tests and deployment scripts

## Monorepo Structure
- `backend/` – FastAPI app (Python)
- `frontend/` – React app (TypeScript, Material-UI)
- `shared/` – (optional) Shared code

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Deployment
Deployment scripts and guides will be added as the project progresses.
