from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import User
from app.seed_data import seed_database

# Routers
from app.api import auth, batches, returns, pickups, destruction, scans, fraud, alerts, dashboard, demo, products, serials, roles
from sqlalchemy import text

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
app.include_router(products.router, prefix=settings.API_PREFIX)
app.include_router(serials.router, prefix=settings.API_PREFIX)
app.include_router(roles.router, prefix=settings.API_PREFIX)
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
    # Safe SQLite column migration for batches table
    try:
        with engine.connect() as conn:
            # batches migrations
            res = conn.execute(text("PRAGMA table_info(batches)")).fetchall()
            cols = [r[1] for r in res]
            if "product_id" not in cols:
                conn.execute(text("ALTER TABLE batches ADD COLUMN product_id VARCHAR(100)"))
            if "qr_payload" not in cols:
                conn.execute(text("ALTER TABLE batches ADD COLUMN qr_payload VARCHAR(255)"))
            if "assigned_retailer_name" not in cols:
                conn.execute(text("ALTER TABLE batches ADD COLUMN assigned_retailer_name VARCHAR(255)"))
            if "dosage_strength" not in cols:
                conn.execute(text("ALTER TABLE batches ADD COLUMN dosage_strength VARCHAR(100)"))
            if "manufacturer_name" not in cols:
                conn.execute(text("ALTER TABLE batches ADD COLUMN manufacturer_name VARCHAR(255)"))

            # alerts migrations
            res_a = conn.execute(text("PRAGMA table_info(alerts)")).fetchall()
            cols_a = [r[1] for r in res_a]
            if "product_id" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN product_id VARCHAR(100)"))
            if "serial_code" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN serial_code VARCHAR(100)"))
            if "batch_number" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN batch_number VARCHAR(100)"))
            if "medicine_name" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN medicine_name VARCHAR(255)"))
            if "alert_type" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN alert_type VARCHAR(100)"))
            if "action_url" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN action_url VARCHAR(255)"))
            if "recipient_name" not in cols_a:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN recipient_name VARCHAR(255)"))

            # scans migrations
            res_s = conn.execute(text("PRAGMA table_info(scans)")).fetchall()
            cols_s = [r[1] for r in res_s]
            if "product_unit_id" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN product_unit_id VARCHAR(100)"))
            if "serial_code" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN serial_code VARCHAR(100)"))
            if "retailer_id" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN retailer_id VARCHAR(100)"))
            if "retailer_name" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN retailer_name VARCHAR(255)"))
            if "database_result" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN database_result VARCHAR(100)"))
            if "expiry_result" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN expiry_result VARCHAR(100)"))
            if "verdict" not in cols_s:
                conn.execute(text("ALTER TABLE scans ADD COLUMN verdict VARCHAR(100)"))

            conn.commit()
    except Exception as e:
        print(f"Column migration check note: {e}")

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
