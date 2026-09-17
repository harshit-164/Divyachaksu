"""JWT-ready auth routes (demo soft auth)."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from models import User
from schemas import Token, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.jwt_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = get_user_by_username(db, payload.username)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.username)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db)):
    """Demo endpoint — returns the seeded admin without requiring a token."""
    user = db.query(User).filter(User.role == "admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="No admin user")
    return user


@router.post("/verify")
def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return {"valid": True, "sub": payload.get("sub")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
