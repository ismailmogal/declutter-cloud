from fastapi import FastAPI, status, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routers import onedrive, cloud, auth_router, google, user, files, ai, analytics, rules, images
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from datetime import datetime
from fastapi import Depends
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from database import get_db
import re
import html
import traceback

# Configure security logging
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=()'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
        return response

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Log security-relevant requests
        if request.url.path in ["/auth/token", "/auth/register", "/api/onedrive/delete_files", "/api/files/delete"]:
            client_host = request.client.host if request.client else "unknown"
            security_logger.info(
                f"Security event: {request.method} {request.url.path} from {client_host} at {datetime.utcnow()}"
            )
        
        response = await call_next(request)
        
        # Log failed authentication attempts
        if request.url.path == "/auth/token" and response.status_code == 401:
            client_host = request.client.host if request.client else "unknown"
            security_logger.warning(
                f"Failed login attempt from {client_host} at {datetime.utcnow()}"
            )
        
        return response

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Sanitize query parameters
        if request.query_params:
            sanitized_params = {}
            for key, value in request.query_params.items():
                # Basic XSS prevention
                sanitized_value = html.escape(value)
                # Remove potentially dangerous characters
                sanitized_value = re.sub(r'[<>"\']', '', sanitized_value)
                sanitized_params[key] = sanitized_value
            request.scope["query_string"] = "&".join([f"{k}={v}" for k, v in sanitized_params.items()]).encode()
        
        response = await call_next(request)
        return response

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Declutter Cloud API",
    description="""
    A secure cloud file management and decluttering API with OneDrive integration.
    
    ## Security
    - All endpoints require authentication via JWT tokens
    - Rate limiting is applied to sensitive operations
    - Input validation and sanitization is enforced
    - CORS is configured for trusted origins only
    
    ## Features
    - File management and organization
    - Duplicate detection and removal
    - Cloud provider integration (OneDrive, Google Drive)
    - AI-powered file analysis and tagging
    - User preferences and settings management
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Declutter Cloud Support",
        "email": "support@decluttercloud.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {"url": "http://localhost:8000", "description": "Development server"},
        {"url": "https://api.decluttercloud.com", "description": "Production server"},
    ],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local frontend
        "https://your-frontend-domain.com"  # TODO: Set your production frontend domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(InputSanitizationMiddleware)
app.add_middleware(SecurityLoggingMiddleware)
app.add_middleware(SecureHeadersMiddleware)

app.include_router(auth_router.router)
app.include_router(onedrive.router)
app.include_router(cloud.router)
app.include_router(google.router)
app.include_router(user.router)
app.include_router(files.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(rules.router)
app.include_router(images.router)

@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}

@app.get("/ready", tags=["infra"])
def ready(db=Depends(get_db)):
    try:
        # Try a simple DB query
        next(db.execute("SELECT 1"))
        return {"status": "ready"}
    except OperationalError:
        return Response(content='{"status": "not ready"}', status_code=status.HTTP_503_SERVICE_UNAVAILABLE, media_type="application/json")

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database-related exceptions gracefully"""
    security_logger.error(f"Database error: {exc} from {request.client.host if request.client else 'unknown'}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Database service temporarily unavailable. Please try again later."}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    security_logger.error(f"Unexpected error: {exc} from {request.client.host if request.client else 'unknown'}")
    security_logger.error(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with logging"""
    if exc.status_code >= 400:
        security_logger.warning(f"HTTP {exc.status_code}: {exc.detail} from {request.client.host if request.client else 'unknown'}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

