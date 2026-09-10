from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_args = {"connect_args": {"check_same_thread": False}}

engine = create_engine(settings.DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_database_migrated(target_engine=None):
    """
    Safely adds new columns to SQLite batches table without dropping existing data.
    """
    eng = target_engine or engine
    try:
        with eng.connect() as conn:
            # Check if batches table exists
            table_check = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='batches'")).fetchone()
            if table_check:
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
                conn.commit()
    except Exception as e:
        print(f"Migration note: {e}")

# Run safe migration on startup
ensure_database_migrated(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
