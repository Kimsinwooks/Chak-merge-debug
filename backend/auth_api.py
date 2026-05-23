import os
import sqlite3
from datetime import datetime

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse

from storage_paths import DATA_DIR

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Auth"])

DB_PATH = DATA_DIR / "meeting_app.sqlite3"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
)


def conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def ensure_auth_tables():
    c = conn()
    cur = c.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            picture TEXT,
            provider TEXT DEFAULT 'google',
            created_at TEXT NOT NULL,
            last_login_at TEXT NOT NULL
        )
        """
    )

    c.commit()
    c.close()


def upsert_user(userinfo: dict):
    ensure_auth_tables()

    google_sub = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Google user info가 올바르지 않습니다.")

    now = datetime.now().isoformat()

    c = conn()
    cur = c.cursor()

    cur.execute(
        """
        INSERT INTO users (
            id, email, name, picture, provider, created_at, last_login_at
        )
        VALUES (?, ?, ?, ?, 'google', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            last_login_at = excluded.last_login_at
        """
        ,
        (google_sub, email, name, picture, now, now),
    )

    c.commit()
    c.close()

    return {
        "id": google_sub,
        "email": email,
        "name": name,
        "picture": picture,
    }


def get_login_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return user


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)

    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    user = upsert_user(dict(userinfo))

    request.session["user"] = user

    return RedirectResponse(url=f"{FRONTEND_URL}/?login=success")


@router.get("/me")
def me(request: Request):
    user = request.session.get("user")

    return {
        "authenticated": bool(user),
        "user": user,
    }


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}
