from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import User
from app.seed_data import seed_database

# Routers
from app.api import auth, batches, returns, pickups, destruction, scans, fraud, alerts, dashboard, demo

app = FastAPI(
    title="PharmaGuard — Reverse Chain Compliance Engine",
    description="AI-assisted closed-loop reverse logistics compliance platform for pharmaceuticals.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS (Frontend dev on port 5173 / localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(batches.router, prefix=settings.API_PREFIX)
app.include_router(returns.router, prefix=settings.API_PREFIX)
app.include_router(pickups.router, prefix=settings.API_PREFIX)
app.include_router(destruction.router, prefix=settings.API_PREFIX)
app.include_router(scans.router, prefix=settings.API_PREFIX)
app.include_router(fraud.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(demo.router, prefix=settings.API_PREFIX)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("Empty database detected. Seeding realistic demo data...")
            seed_database(db)
        else:
            print(f"Database already populated with {user_count} users.")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "system": "PharmaGuard AI Reverse Logistics Compliance Platform",
        "status": "OPERATIONAL",
        "docs": "/docs",
        "version": settings.VERSION
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
