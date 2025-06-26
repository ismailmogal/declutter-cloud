# Declutter Cloud Deployment Guide

This guide provides step-by-step instructions for deploying the Declutter Cloud full-stack application. The application consists of a React frontend and a FastAPI backend.

## Prerequisites

- **Cloud Hosting**: A server or platform to host the backend (e.g., Heroku, AWS, DigitalOcean) and a service to host the static frontend (e.g., Netlify, Vercel, AWS S3).
- **Database**: A PostgreSQL or other SQLAlchemy-compatible database for production.
- **Node.js and Python**: Installed on your deployment machine.
- **Git**: For version control.

## 1. Environment Variable Configuration

Create a `.env` file in the `backend` directory. This file will store all your secrets and configuration variables. **Do not commit this file to version control.**

```
# backend/.env

# Application Secret Key (generate a new random key for production)
SECRET_KEY="a_very_strong_and_random_secret_key"

# Database URL
# Example for PostgreSQL: DATABASE_URL="postgresql://user:password@host:port/dbname"
DATABASE_URL="your_production_database_url"

# Microsoft / OneDrive Credentials
MICROSOFT_CLIENT_ID="your_microsoft_client_id"
MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
MICROSOFT_REDIRECT_URI="https://your-backend-domain.com/auth/onedrive/callback"

# Google / Google Drive Credentials
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="https://your-backend-domain.com/auth/google/callback"

# Set to True for production debugging if needed
DEBUG="False"
```

## 2. Cloud Provider Setup (Azure & Google)

You must configure your redirect URIs in both the Azure Portal and Google Cloud Console to match your production domain.

### Microsoft Azure (for OneDrive)
1.  Navigate to **Azure Active Directory > App registrations** and select your application.
2.  Go to the **Authentication** tab.
3.  Under **Web > Redirect URIs**, add the production URI: `https://your-backend-domain.com/auth/onedrive/callback`.
4.  Ensure you have configured a client secret and have the Application (client) ID.

### Google Cloud Platform (for Google Drive)
1.  Navigate to **APIs & Services > Credentials**.
2.  Select your OAuth 2.0 Client ID.
3.  Under **Authorized redirect URIs**, add the production URI: `https://your-backend-domain.com/auth/google/callback`.
4.  Ensure you have the Client ID and Client Secret.

## 3. Backend Deployment (Example with Heroku)

1.  **Procfile**: A `Procfile` is already included in the `backend` directory to run the application using `gunicorn`.
    ```
    web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
    ```
2.  **Install Gunicorn**: Add `gunicorn` to your `backend/requirements.txt`.
3.  **Push to Heroku**:
    ```bash
    heroku create your-app-name
    heroku git:remote -a your-app-name
    git push heroku main
    ```
4.  **Configure Environment Variables**:
    - Go to your Heroku app's dashboard > Settings > Config Vars.
    - Add all the key-value pairs from your `.env` file.

## 4. Frontend Deployment (Example with Netlify)

1.  **Update API Base URL**: In your frontend code, ensure all API requests point to your production backend URL. You might need to change the Vite proxy setup for a production build. The easiest way is to set a base URL for `fetch`.
    - In `frontend/vite.config.ts`, the proxy is for development only. For production, the frontend will be built into static files.
    - In your frontend code (e.g., a central `api.ts` file or directly in components), API calls should use the full backend URL: `https://your-backend-domain.com/api/...`

2.  **Build the Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```
    This will create a `dist` directory with your static application.

3.  **Deploy to Netlify**:
    - Sign up for Netlify and connect your Git repository.
    - Set the build command to `npm run build`.
    - Set the publish directory to `frontend/dist`.
    - Add any necessary environment variables for the build process (e.g., `VITE_API_BASE_URL=https://your-backend-domain.com`).

## 5. Final Checks

- **CORS**: Ensure your FastAPI backend is configured to accept requests from your frontend's production domain. You may need to update the `CORSMiddleware` settings in `backend/main.py`.
- **Database Migrations**: If you are using a relational database, run your Alembic migrations to set up the schema. `alembic upgrade head`
- **Testing**: Thoroughly test the login, cloud connection, and file management features in the production environment.

## ✅ Pre-deployment Checklist

- [x] **Dependencies Updated**: All packages updated to latest versions (FastAPI 0.115.13, Uvicorn 0.34.3)
- [x] **API Enhanced**: Added proper metadata, tags, and documentation
- [x] **CORS Configured**: Backend allows cross-origin requests
- [x] **Environment Variables**: Frontend configured to use production API URL
- [x] **Build Tested**: Both frontend and backend build successfully

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

**Free Tier**: $5/month credit (sufficient for small apps)

#### Steps:
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Add environment variables:
     ```
     MICROSOFT_CLIENT_ID=your_client_id
     MICROSOFT_CLIENT_SECRET=your_client_secret
     MICROSOFT_REDIRECT_URI=https://your-app.railway.app/auth/onedrive/callback
     ```
   - Deploy!

3. **Update Frontend**:
   - Create new project for frontend
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variable: `VITE_API_URL=https://your-backend.railway.app`

### Option 2: Render

**Free Tier**: 750 hours/month for backend, unlimited static sites

#### Backend Setup:
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Same as Railway

#### Frontend Setup:
1. Create new Static Site
2. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variable**: `VITE_API_URL=https://your-backend.onrender.com`

### Option 3: Vercel (Frontend) + Railway (Backend)

**Vercel Free**: Unlimited deployments

#### Frontend on Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set environment variable
vercel env add VITE_API_URL
```

## 🔧 Environment Variables

Set these in your cloud platform:

```bash
# OneDrive OAuth
MICROSOFT_CLIENT_ID=your_microsoft_app_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_app_client_secret
MICROSOFT_REDIRECT_URI=https://your-backend-domain/auth/onedrive/callback

# Frontend
VITE_API_URL=https://your-backend-domain
```

## 📝 Microsoft App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Create new App Registration
3. Add redirect URI: `https://your-backend-domain/auth/onedrive/callback`
4. Copy Client ID and Secret

## 🐛 Common Issues

### CORS Errors
- Backend has CORS configured for all origins
- In production, update `allow_origins` in `main.py` with your frontend URL

### Environment Variables
- Ensure all variables are set in your cloud platform
- Check that `MICROSOFT_REDIRECT_URI` matches your deployed backend URL

### Build Failures
- Check that `requirements.txt` has all dependencies
- Ensure Node.js version is compatible (v16+)

## 🔄 Continuous Deployment

All platforms support automatic deployments:
- Push to `main` branch triggers deployment
- Environment variables persist across deployments
- Rollback to previous versions if needed

## 💰 Cost Optimization

### Railway
- Monitor usage in dashboard
- $5 credit usually lasts for small apps
- Scale down when not in use

### Render
- Free tier has 750 hours/month
- Service sleeps after 15 minutes of inactivity
- Wake up takes ~30 seconds

### Vercel
- Completely free for personal projects
- Unlimited deployments and bandwidth

## 🚀 Production Checklist

- [ ] Environment variables configured
- [ ] Microsoft App redirect URI updated
- [ ] Frontend API URL set correctly
- [ ] CORS origins updated for production
- [ ] SSL certificates enabled (automatic on most platforms)
- [ ] Custom domain configured (optional)

## 📊 Monitoring

Most platforms provide:
- Request logs
- Error tracking
- Performance metrics
- Uptime monitoring

## 🔒 Security Notes

- Never commit secrets to Git
- Use environment variables for all sensitive data
- Enable HTTPS (automatic on most platforms)
- Consider rate limiting for production use

## 🆘 Support

- **Railway**: Discord community
- **Render**: Documentation and forums
- **Vercel**: Excellent documentation and support

---

**Recommended for beginners**: Start with Railway for both frontend and backend. It's the easiest to set up and has good free tier limits. 