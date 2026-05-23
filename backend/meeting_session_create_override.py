from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request

DB_PATH = Path("data/meeting_app.sqlite3")


def _now() -> str:
    return datetime.now().isoformat()


def _get_user(request: Request) -> dict[str, Any]:
    user = request.session.get("user") if hasattr(request, "session") else None
    if not isinstance(user, dict):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return user


def _user_id(user: dict[str, Any]) -> str:
    return str(
        user.get("id")
        or user.get("sub")
        or user.get("email")
        or user.get("user_id")
        or "unknown"
    )


def _pick(data: dict[str, Any], *keys: str, default=None):
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def _as_bool(v: Any, default: bool = False) -> int:
    if v is None:
        return int(default)
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, (int, float)):
        return int(bool(v))
    s = str(v).strip().lower()
    return int(s in {"1", "true", "yes", "y", "on"})


def _as_keywords(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        return ", ".join(str(x).strip() for x in v if str(x).strip())
    return str(v)


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_col(cur: sqlite3.Cursor, table: str, col: str, ddl: str) -> None:
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")


def _ensure_tables() -> None:
    conn = _connect()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS meeting_sessions (
        id TEXT PRIMARY KEY,
        room_name TEXT,
        title TEXT,
        meeting_time TEXT,
        keywords TEXT,
        meeting_type TEXT,
        realtime_recording_enabled INTEGER DEFAULT 1,
        created_at TEXT,
        stopped_at TEXT,
        status TEXT DEFAULT 'live',
        created_by TEXT,
        realtime_model_name TEXT DEFAULT 'base',
        final_model_name TEXT DEFAULT 'medium',
        noise_filter_enabled INTEGER DEFAULT 1
    )
    """)

    _ensure_col(cur, "meeting_sessions", "room_name", "TEXT")
    _ensure_col(cur, "meeting_sessions", "title", "TEXT")
    _ensure_col(cur, "meeting_sessions", "meeting_time", "TEXT")
    _ensure_col(cur, "meeting_sessions", "keywords", "TEXT")
    _ensure_col(cur, "meeting_sessions", "meeting_type", "TEXT")
    _ensure_col(cur, "meeting_sessions", "realtime_recording_enabled", "INTEGER DEFAULT 1")
    _ensure_col(cur, "meeting_sessions", "created_at", "TEXT")
    _ensure_col(cur, "meeting_sessions", "stopped_at", "TEXT")
    _ensure_col(cur, "meeting_sessions", "status", "TEXT DEFAULT 'live'")
    _ensure_col(cur, "meeting_sessions", "created_by", "TEXT")
    _ensure_col(cur, "meeting_sessions", "realtime_model_name", "TEXT DEFAULT 'base'")
    _ensure_col(cur, "meeting_sessions", "final_model_name", "TEXT DEFAULT 'medium'")
    _ensure_col(cur, "meeting_sessions", "noise_filter_enabled", "INTEGER DEFAULT 1")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS library_items (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        scope TEXT,
        bucket TEXT,
        kind TEXT,
        name TEXT,
        file_path TEXT,
        text_content TEXT,
        preview_line TEXT,
        created_at TEXT,
        room_name TEXT,
        created_by TEXT
    )
    """)

    for col, ddl in [
        ("session_id", "TEXT"),
        ("scope", "TEXT"),
        ("bucket", "TEXT"),
        ("kind", "TEXT"),
        ("name", "TEXT"),
        ("file_path", "TEXT"),
        ("text_content", "TEXT"),
        ("preview_line", "TEXT"),
        ("created_at", "TEXT"),
        ("room_name", "TEXT"),
        ("created_by", "TEXT"),
    ]:
        _ensure_col(cur, "library_items", col, ddl)

    conn.commit()
    conn.close()


def install_meeting_session_create_override(app) -> None:
    removed = []
    kept = []

    for route in app.router.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        if path == "/meeting/session/create" and "POST" in methods:
            removed.append(route)
        else:
            kept.append(route)

    if removed:
        print(f"[MEETING_SESSION_OVERRIDE] removed {len(removed)} existing POST /meeting/session/create route(s)")

    app.router.routes[:] = kept

    router = APIRouter()

    @router.post("/meeting/session/create")
    async def create_meeting_session_clean(request: Request):
        _ensure_tables()

        user = _get_user(request)
        uid = _user_id(user)

        try:
            payload = await request.json()
        except Exception:
            payload = {}

        if not isinstance(payload, dict):
            payload = {}

        room_name = str(
            _pick(payload, "room_name", "roomName", "room", "channelName", default="default_room")
            or "default_room"
        ).strip()

        title = str(
            _pick(payload, "title", "meetingTitle", "meeting_title", "name", default="새 회의")
            or "새 회의"
        ).strip()

        meeting_time = _pick(payload, "meeting_time", "meetingTime", "scheduledAt", default="")
        meeting_type = str(_pick(payload, "meeting_type", "meetingType", "type", default="일반 회의") or "일반 회의")
        keywords = _as_keywords(_pick(payload, "keywords", "keywordList", default=""))

        plan_text = str(_pick(payload, "planText", "plan_text", "plan", "description", default="") or "")

        realtime_model_name = str(
            _pick(payload, "realtime_model_name", "realtimeModelName", "realtime_model", default="base")
            or "base"
        )

        final_model_name = str(
            _pick(payload, "final_model_name", "finalModelName", "stt_model", "final_model", default="medium")
            or "medium"
        )

        noise_filter_enabled = _as_bool(
            _pick(payload, "noise_filter_enabled", "noiseFilterEnabled", default=True),
            default=True,
        )

        realtime_recording_enabled = _as_bool(
            _pick(payload, "realtime_recording_enabled", "realtimeRecordingEnabled", default=True),
            default=True,
        )

        session_id = str(uuid.uuid4())
        created_at = _now()

        conn = _connect()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO meeting_sessions (
                id,
                room_name,
                title,
                meeting_time,
                keywords,
                meeting_type,
                realtime_recording_enabled,
                created_at,
                stopped_at,
                status,
                created_by,
                realtime_model_name,
                final_model_name,
                noise_filter_enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                room_name,
                title,
                str(meeting_time or ""),
                keywords,
                meeting_type,
                realtime_recording_enabled,
                created_at,
                None,
                "live",
                uid,
                realtime_model_name,
                final_model_name,
                noise_filter_enabled,
            ),
        )

        if plan_text.strip():
            cur.execute(
                """
                INSERT INTO library_items (
                    id,
                    session_id,
                    scope,
                    bucket,
                    kind,
                    name,
                    file_path,
                    text_content,
                    preview_line,
                    created_at,
                    room_name,
                    created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    session_id,
                    "session",
                    "meeting_plan",
                    "text",
                    "회의 계획서",
                    None,
                    plan_text,
                    plan_text.strip().replace("\\n", " ")[:180],
                    created_at,
                    room_name,
                    uid,
                ),
            )

        conn.commit()
        conn.close()

        out_dir = Path("data") / "meeting_sessions" / session_id
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "meta.json").write_text(
            json.dumps(
                {
                    "session_id": session_id,
                    "room_name": room_name,
                    "title": title,
                    "meeting_time": str(meeting_time or ""),
                    "meeting_type": meeting_type,
                    "keywords": keywords,
                    "created_at": created_at,
                    "created_by": uid,
                    "realtime_model_name": realtime_model_name,
                    "final_model_name": final_model_name,
                    "noise_filter_enabled": bool(noise_filter_enabled),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        return {
            "ok": True,
            "session_id": session_id,
            "sessionId": session_id,
            "id": session_id,
            "room_name": room_name,
            "roomName": room_name,
            "title": title,
            "status": "live",
            "created_at": created_at,
            "createdAt": created_at,
            "realtime_model_name": realtime_model_name,
            "realtimeModelName": realtime_model_name,
            "final_model_name": final_model_name,
            "finalModelName": final_model_name,
            "noise_filter_enabled": bool(noise_filter_enabled),
            "noiseFilterEnabled": bool(noise_filter_enabled),
        }

    app.include_router(router)
    print("[MEETING_SESSION_OVERRIDE] clean POST /meeting/session/create installed")
