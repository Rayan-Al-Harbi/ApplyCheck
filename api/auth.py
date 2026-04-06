import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.config import get_db
from db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Config ---

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", "7"))
ALGORITHM = "HS256"

# OAuth config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# --- Schemas ---

class AuthRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


# --- Helpers ---

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _get_or_create_oauth_user(
    db: Session, email: str, provider: str, oauth_id: str
) -> User:
    """Find existing user by email or create a new OAuth user."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Link OAuth if not already linked
        if not user.oauth_provider:
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            db.commit()
        return user

    user = User(
        email=email,
        password_hash=None,
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Endpoints ---

@router.post("/register", response_model=AuthResponse)
def register(req: AuthRequest, db: Session = Depends(get_db)):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=req.email, password_hash=_hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=_create_token(user.id))


@router.post("/login", response_model=AuthResponse)
def login(req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.password_hash or not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthResponse(access_token=_create_token(user.id))


# --- Google OAuth ---

@router.post("/google", response_model=AuthResponse)
async def google_callback(req: OAuthCallbackRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": req.code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": req.redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=401, detail="Google authentication failed")

    token_data = token_res.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=401, detail="No ID token from Google")

    # Decode the ID token (Google's public keys verify it, but for simplicity
    # we use the userinfo endpoint which is already authenticated by the access token)
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )

    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get Google user info")

    userinfo = userinfo_res.json()
    email = userinfo.get("email")
    google_id = userinfo.get("id")

    if not email:
        raise HTTPException(status_code=401, detail="No email from Google account")

    user = _get_or_create_oauth_user(db, email, "google", google_id)
    return AuthResponse(access_token=_create_token(user.id))


# --- LinkedIn OAuth ---

@router.post("/linkedin", response_model=AuthResponse)
async def linkedin_callback(req: OAuthCallbackRequest, db: Session = Depends(get_db)):
    if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="LinkedIn OAuth not configured")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": req.code,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET,
                "redirect_uri": req.redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=401, detail="LinkedIn authentication failed")

    access_token = token_res.json().get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="No access token from LinkedIn")

    # Get user info from LinkedIn userinfo endpoint (OpenID Connect)
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get LinkedIn user info")

    userinfo = userinfo_res.json()
    email = userinfo.get("email")
    linkedin_id = userinfo.get("sub")

    if not email:
        raise HTTPException(status_code=401, detail="No email from LinkedIn account")

    user = _get_or_create_oauth_user(db, email, "linkedin", linkedin_id)
    return AuthResponse(access_token=_create_token(user.id))
