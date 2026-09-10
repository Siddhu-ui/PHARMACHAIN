import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_DB = f"sqlite:///{os.path.join(_BACKEND_DIR, 'pharmaguard.db').replace('\\', '/')}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "PharmaGuard"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database: Supabase PostgreSQL if provided, fallback to SQLite for immediate demo reliability
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_DB)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "pharmaguard-secret-key-hackathon-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours for hackathon
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    DEMO_MODE: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
