from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user and request.role:
        user = db.query(User).filter(User.role == request.role).first()
        
    if not user:
        # If demo user requested by role or default
        user = db.query(User).first()
        if not user:
            raise HTTPException(status_code=404, detail="No users found in system")

    # In demo mode, return simulated JWT access token
    return TokenResponse(
        access_token=f"demo_token_for_{user.id}_{user.role}",
        token_type="bearer",
        user=user
    )

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()
