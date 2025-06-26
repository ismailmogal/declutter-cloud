from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import onedrive, cloud, auth_router, google, user, files, ai, analytics, rules, images

app = FastAPI(
    title="Declutter Cloud API",
    description="A cloud file management and decluttering API with OneDrive integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

