import os
import sqlite3
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from storage_paths import DATA_DIR, get_room_sessions_dir, sanitize_room_name
from auth_api import get_login_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])

DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def ensure_room_tables():
    c = conn()
    cur = c.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            room_name TEXT UNIQUE NOT NULL,
            owner_user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS room_members (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            created_at TEXT NOT NULL,
            UNIQUE(room_name, user_id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS room_invites (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            inviter_user_id TEXT NOT NULL,
            invite_code TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_sessions (
            id TEXT PRIMARY KEY,
            room_name TEXT DEFAULT 'default_room',
            title TEXT NOT NULL,
            meeting_time TEXT,
            keywords TEXT,
            meeting_type TEXT,
            realtime_recording_enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            stopped_at TEXT,
            status TEXT DEFAULT 'live'
        )
        """
    )

    cur.execute("PRAGMA table_info(meeting_sessions)")
    session_cols = {row[1] for row in cur.fetchall()}
    if "room_name" not in session_cols:
        cur.execute(
            "ALTER TABLE meeting_sessions ADD COLUMN room_name TEXT DEFAULT 'default_room'"
        )

    c.commit()
    c.close()


class RoomCreatePayload(BaseModel):
    roomName: str


class InviteAcceptPayload(BaseModel):
    inviteCode: str


def get_frontend_url():
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def get_room_member(c: sqlite3.Connection, room_name: str, user_id: str):
    return c.execute(
        """
        SELECT *
        FROM room_members
        WHERE room_name = ? AND user_id = ?
        """,
        (room_name, user_id),
    ).fetchone()


def assert_room_member(c: sqlite3.Connection, room_name: str, user_id: str):
    member = get_room_member(c, room_name, user_id)
    if not member:
        raise HTTPException(status_code=403, detail="이 방에 접근할 권한이 없습니다.")
    return member


@router.get("")
def list_rooms(request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    c = conn()
    rows = c.execute(
        """
        SELECT r.*, m.role
        FROM rooms r
        JOIN room_members m ON r.room_name = m.room_name
        WHERE m.user_id = ?
        ORDER BY r.created_at DESC
        """,
        (user_id,),
    ).fetchall()
    c.close()

    return {
        "rooms": [
            {
                "id": row["id"],
                "roomName": row["room_name"],
                "ownerUserId": row["owner_user_id"],
                "role": row["role"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ]
    }


@router.post("")
def create_room(payload: RoomCreatePayload, request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    room_name = sanitize_room_name(payload.roomName)
    now = datetime.now().isoformat()

    if not room_name:
        raise HTTPException(status_code=400, detail="방 이름이 비어 있습니다.")

    sessions_dir = get_room_sessions_dir(room_name)
    sessions_dir.mkdir(parents=True, exist_ok=True)

    c = conn()

    exists = c.execute(
        """
        SELECT id
        FROM rooms
        WHERE room_name = ?
        """,
        (room_name,),
    ).fetchone()

    if exists:
        c.close()
        raise HTTPException(status_code=409, detail="이미 존재하는 룸입니다.")

    room_id = str(uuid.uuid4())

    c.execute(
        """
        INSERT INTO rooms (id, room_name, owner_user_id, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (room_id, room_name, user_id, now),
    )

    c.execute(
        """
        INSERT OR IGNORE INTO room_members (id, room_name, user_id, role, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), room_name, user_id, "owner", now),
    )

    c.commit()
    c.close()

    return {
        "id": room_id,
        "roomName": room_name,
        "ownerUserId": user_id,
        "role": "owner",
        "sessionsDir": str(sessions_dir),
        "createdAt": now,
    }


@router.get("/{room_name}/sessions")
def list_room_sessions(room_name: str, request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    safe_room_name = sanitize_room_name(room_name)

    c = conn()

    assert_room_member(c, safe_room_name, user_id)

    rows = c.execute(
        """
        SELECT *
        FROM meeting_sessions
        WHERE room_name = ?
        ORDER BY created_at DESC
        """,
        (safe_room_name,),
    ).fetchall()

    c.close()

    return {
        "roomName": safe_room_name,
        "sessions": [
            {
                "id": row["id"],
                "sessionId": row["id"],
                "roomName": row["room_name"],
                "title": row["title"],
                "meetingType": row["meeting_type"],
                "meetingTime": row["meeting_time"],
                "keywords": row["keywords"],
                "status": row["status"],
                "createdAt": row["created_at"],
                "stoppedAt": row["stopped_at"],
            }
            for row in rows
        ],
    }


@router.get("/{room_name}/members")
def list_room_members(room_name: str, request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    safe_room_name = sanitize_room_name(room_name)

    c = conn()

    assert_room_member(c, safe_room_name, user_id)

    rows = c.execute(
        """
        SELECT m.room_name, m.user_id, m.role, m.created_at,
               u.email, u.name, u.picture
        FROM room_members m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.room_name = ?
        ORDER BY
            CASE m.role
                WHEN 'owner' THEN 0
                ELSE 1
            END,
            m.created_at ASC
        """,
        (safe_room_name,),
    ).fetchall()

    c.close()

    return {
        "roomName": safe_room_name,
        "members": [
            {
                "userId": row["user_id"],
                "email": row["email"],
                "name": row["name"],
                "picture": row["picture"],
                "role": row["role"],
                "createdAt": row["created_at"],
            }
            for row in rows
        ],
    }


@router.post("/{room_name}/invite-link")
def create_invite_link(room_name: str, request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    safe_room_name = sanitize_room_name(room_name)
    now = datetime.now().isoformat()
    invite_code = str(uuid.uuid4())

    c = conn()

    member = assert_room_member(c, safe_room_name, user_id)

    if member["role"] not in ("owner", "admin", "member"):
        c.close()
        raise HTTPException(status_code=403, detail="초대 링크를 만들 권한이 없습니다.")

    room = c.execute(
        """
        SELECT *
        FROM rooms
        WHERE room_name = ?
        """,
        (safe_room_name,),
    ).fetchone()

    if not room:
        c.close()
        raise HTTPException(status_code=404, detail="존재하지 않는 방입니다.")

    c.execute(
        """
        INSERT INTO room_invites (
            id, room_name, inviter_user_id, invite_code, status, created_at
        )
        VALUES (?, ?, ?, ?, 'active', ?)
        """,
        (str(uuid.uuid4()), safe_room_name, user_id, invite_code, now),
    )

    c.commit()
    c.close()

    frontend_url = get_frontend_url()

    return {
        "roomName": safe_room_name,
        "inviteCode": invite_code,
        "inviteUrl": f"{frontend_url}/invite/{invite_code}",
        "createdAt": now,
    }


@router.get("/invite/{invite_code}")
def get_invite_info(invite_code: str):
    ensure_room_tables()

    c = conn()

    invite = c.execute(
        """
        SELECT i.*, r.id AS room_id, r.owner_user_id, r.created_at AS room_created_at,
               u.email AS inviter_email, u.name AS inviter_name, u.picture AS inviter_picture
        FROM room_invites i
        JOIN rooms r ON i.room_name = r.room_name
        LEFT JOIN users u ON i.inviter_user_id = u.id
        WHERE i.invite_code = ? AND i.status = 'active'
        """,
        (invite_code,),
    ).fetchone()

    c.close()

    if not invite:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 링크입니다.")

    return {
        "inviteCode": invite["invite_code"],
        "room": {
            "id": invite["room_id"],
            "roomName": invite["room_name"],
            "ownerUserId": invite["owner_user_id"],
            "createdAt": invite["room_created_at"],
        },
        "inviter": {
            "userId": invite["inviter_user_id"],
            "email": invite["inviter_email"],
            "name": invite["inviter_name"],
            "picture": invite["inviter_picture"],
        },
        "status": invite["status"],
        "createdAt": invite["created_at"],
    }


@router.post("/invite/accept")
def accept_invite(payload: InviteAcceptPayload, request: Request):
    ensure_room_tables()

    user = get_login_user(request)
    user_id = user["id"]

    now = datetime.now().isoformat()

    c = conn()

    invite = c.execute(
        """
        SELECT *
        FROM room_invites
        WHERE invite_code = ? AND status = 'active'
        """,
        (payload.inviteCode,),
    ).fetchone()

    if not invite:
        c.close()
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 코드입니다.")

    room_name = invite["room_name"]

    room = c.execute(
        """
        SELECT *
        FROM rooms
        WHERE room_name = ?
        """,
        (room_name,),
    ).fetchone()

    if not room:
        c.close()
        raise HTTPException(status_code=404, detail="초대된 방이 존재하지 않습니다.")

    c.execute(
        """
        INSERT OR IGNORE INTO room_members (id, room_name, user_id, role, created_at)
        VALUES (?, ?, ?, 'member', ?)
        """,
        (str(uuid.uuid4()), room_name, user_id, now),
    )

    c.commit()
    c.close()

    return {
        "ok": True,
        "roomName": room_name,
        "userId": user_id,
        "role": "member",
    }
