# Platform-Specific Deployment Guides

## Railway (Recommended - Easiest)

**Free Tier**: $5/month credit (sufficient for small apps)

### Backend Deployment
1. **Sign up** at [railway.app](https://railway.app) with GitHub
2. **Create new project** → "Deploy from GitHub repo"
3. **Select your repository**
4. **Configure environment variables**:
   ```
   ENVIRONMENT=production
   SECRET_KEY=your-secure-secret-key
   DATABASE_URL=postgresql://...
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_REDIRECT_URI=https://your-app.railway.app/auth/onedrive/callback
   ```
5. **Add PostgreSQL database** from Railway dashboard
6. **Deploy!**

### Frontend Deployment
1. **Create new project** for frontend
2. **Set build command**: `npm run build`
3. **Set output directory**: `dist`
4. **Add environment variable**: `VITE_API_URL=https://your-backend.railway.app`
5. **Deploy!**

---

## Render

**Free Tier**: 750 hours/month for backend, unlimited static sites

### Backend Deployment
1. **Sign up** at [render.com](https://render.com)
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Configure**:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Same as Railway
5. **Add PostgreSQL database** from Render dashboard
6. **Deploy!**

### Frontend Deployment
1. **Create new Static Site**
2. **Configure**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variable**: `VITE_API_URL=https://your-backend.onrender.com`
3. **Deploy!**

---

## Heroku

**Free Tier**: Discontinued, paid plans only

### Backend Deployment
1. **Install Heroku CLI**
2. **Login**: `heroku login`
3. **Create app**: `heroku create your-app-name`
4. **Add PostgreSQL**: `heroku addons:create heroku-postgresql:mini`
5. **Set environment variables**:
   ```bash
   heroku config:set ENVIRONMENT=production
   heroku config:set SECRET_KEY=your-secure-secret-key
   heroku config:set MICROSOFT_CLIENT_ID=your-client-id
   heroku config:set MICROSOFT_CLIENT_SECRET=your-client-secret
   heroku config:set MICROSOFT_REDIRECT_URI=https://your-app.herokuapp.com/auth/onedrive/callback
   ```
6. **Deploy**: `git push heroku main`

### Frontend Deployment
1. **Create new app** for frontend
2. **Set buildpacks**: `heroku buildpacks:set heroku/nodejs`
3. **Configure environment variables**
4. **Deploy**

---

## Vercel (Frontend) + Railway (Backend)

**Vercel Free**: Unlimited deployments

### Frontend on Vercel
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `cd frontend && vercel`
3. **Set environment variable**: `VITE_API_URL=https://your-backend.railway.app`
4. **Configure custom domain** (optional)

### Backend on Railway
Follow Railway backend deployment steps above.

---

## DigitalOcean App Platform

**Free Tier**: $5/month credit

### Backend Deployment
1. **Sign up** at [digitalocean.com](https://digitalocean.com)
2. **Create new App**
3. **Connect GitHub repository**
4. **Configure**:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Run Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**: Same as other platforms
5. **Add PostgreSQL database**
6. **Deploy!**

### Frontend Deployment
1. **Create new App** for frontend
2. **Configure**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: `VITE_API_URL=https://your-backend.ondigitalocean.app`
3. **Deploy!**

---

## Environment Variables Reference

### Required Variables
```bash
ENVIRONMENT=production
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_REDIRECT_URI=https://your-backend-domain.com/auth/onedrive/callback
```

### Optional Variables
```bash
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
MAX_FILE_SIZE=100
ALLOWED_FILE_TYPES=image/*,application/pdf,text/*
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-backend-domain.com/auth/google/callback
```

### Frontend Variables
```bash
VITE_API_URL=https://your-backend-domain.com
```

---

## Post-Deployment Checklist

### Backend
- [ ] Health check: `https://your-backend-domain.com/health`
- [ ] Readiness check: `https://your-backend-domain.com/ready`
- [ ] API documentation: `https://your-backend-domain.com/docs`
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] OAuth redirect URIs updated

### Frontend
- [ ] Application loads without errors
- [ ] API calls work correctly
- [ ] Authentication flows work
- [ ] File operations work
- [ ] Environment variables set

### Security
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Security headers present
- [ ] No sensitive data in logs

---

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `requirements.txt` has all dependencies
   - Verify Node.js version compatibility
   - Check for syntax errors in code

2. **Database Connection Errors**
   - Verify `DATABASE_URL` format
   - Check database is accessible from platform
   - Run migrations manually if needed

3. **OAuth Errors**
   - Update redirect URIs in Azure/Google consoles
   - Verify client IDs and secrets
   - Check CORS configuration

4. **Frontend API Errors**
   - Verify `VITE_API_URL` is correct
   - Check CORS configuration
   - Test API endpoints directly

### Getting Help
- **Railway**: Discord community
- **Render**: Documentation and forums
- **Heroku**: Support tickets
- **Vercel**: Excellent documentation
- **DigitalOcean**: Community and support

---

**Recommended for beginners**: Start with Railway for both frontend and backend. It's the easiest to set up and has good free tier limits. 