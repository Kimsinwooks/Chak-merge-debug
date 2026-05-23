import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

try:
    from auth_api import get_login_user
except Exception:
    get_login_user = None


router = APIRouter(prefix="/todo-calendar", tags=["Todo Calendar"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def now_iso():
    return datetime.now().isoformat()


def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def get_current_user(request: Request) -> dict:
    if get_login_user is not None:
        try:
            user = get_login_user(request)
            if user:
                return user
        except Exception:
            pass

    try:
        return request.session.get("user") or {}
    except Exception:
        return {}


def get_user_id(user: dict) -> str:
    return (
        user.get("id")
        or user.get("sub")
        or user.get("user_id")
        or user.get("google_id")
        or user.get("email")
        or "local_user"
    )


def safe_room_name(room_name: Optional[str]) -> str:
    room = (room_name or "").strip()
    return room or "default_room"


def ensure_tables():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS todo_items (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            assignee_type TEXT DEFAULT 'team',
            assignee_user_id TEXT,
            assignee_name TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            recommended_due_date TEXT,
            due_date TEXT,
            week_label TEXT,
            calendar_scope TEXT DEFAULT 'team',
            source_topic_id TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            room_name TEXT,
            scope TEXT NOT NULL,
            owner_user_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            start_time TEXT,
            end_time TEXT,
            week_label TEXT,
            source_session_id TEXT,
            source_todo_id TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def is_room_member(conn, room_name: str, user_id: str) -> bool:
    if room_name == "default_room":
        return True

    if not user_id or user_id == "local_user":
        return True

    row = conn.execute(
        """
        SELECT id
        FROM room_members
        WHERE room_name = ?
          AND user_id = ?
        LIMIT 1
        """,
        (room_name, user_id),
    ).fetchone()

    return row is not None


def is_room_admin(conn, room_name: str, user_id: str) -> bool:
    if not user_id or user_id == "local_user":
        return True

    room = conn.execute(
        """
        SELECT owner_user_id
        FROM rooms
        WHERE room_name = ?
        LIMIT 1
        """,
        (room_name,),
    ).fetchone()

    if room and room["owner_user_id"] and str(room["owner_user_id"]) == str(user_id):
        return True

    member = conn.execute(
        """
        SELECT role
        FROM room_members
        WHERE room_name = ?
          AND user_id = ?
        LIMIT 1
        """,
        (room_name, user_id),
    ).fetchone()

    if member and (member["role"] or "").lower() in {"owner", "admin", "creator"}:
        return True

    return False


def require_room_member(conn, room_name: str, user_id: str):
    if not is_room_member(conn, room_name, user_id):
        raise HTTPException(status_code=403, detail="이 방의 캘린더/To-Do 접근 권한이 없습니다.")


def normalize_todo(row):
    d = row_to_dict(row)

    return {
        "id": d.get("id"),
        "roomName": d.get("room_name"),
        "sessionId": d.get("session_id"),
        "sessionTitle": d.get("session_title"),
        "title": d.get("title"),
        "description": d.get("description"),
        "assigneeType": d.get("assignee_type"),
        "assigneeUserId": d.get("assignee_user_id"),
        "assigneeName": d.get("assignee_name"),
        "priority": d.get("priority"),
        "status": d.get("status"),
        "recommendedDueDate": d.get("recommended_due_date"),
        "dueDate": d.get("due_date"),
        "weekLabel": d.get("week_label"),
        "calendarScope": d.get("calendar_scope"),
        "sourceTopicId": d.get("source_topic_id"),
        "createdBy": d.get("created_by"),
        "createdAt": d.get("created_at"),
        "updatedAt": d.get("updated_at"),
    }


def normalize_event(row):
    d = row_to_dict(row)

    return {
        "id": d.get("id"),
        "roomName": d.get("room_name"),
        "scope": d.get("scope"),
        "ownerUserId": d.get("owner_user_id"),
        "title": d.get("title"),
        "description": d.get("description"),
        "startDate": d.get("start_date"),
        "endDate": d.get("end_date"),
        "startTime": d.get("start_time"),
        "endTime": d.get("end_time"),
        "weekLabel": d.get("week_label"),
        "sourceSessionId": d.get("source_session_id"),
        "sourceTodoId": d.get("source_todo_id"),
        "createdBy": d.get("created_by"),
        "createdAt": d.get("created_at"),
        "updatedAt": d.get("updated_at"),
    }


class TodoUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[str] = None
    weekLabel: Optional[str] = None
    assigneeType: Optional[str] = None
    assigneeName: Optional[str] = None
    calendarScope: Optional[str] = None


class AddTodoToCalendarRequest(BaseModel):
    scope: str = "team"
    startDate: str
    endDate: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    weekLabel: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


class CalendarEventCreateRequest(BaseModel):
    roomName: Optional[str] = None
    scope: str = "personal"
    title: str
    description: Optional[str] = ""
    startDate: str
    endDate: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    weekLabel: Optional[str] = None
    sourceSessionId: Optional[str] = None
    sourceTodoId: Optional[str] = None


@router.get("/todo/room/{room_name}")
def list_room_todos(
    room_name: str,
    request: Request,
    status: str = Query("all"),
    week_label: str = Query("all"),
    session_id: str = Query("all"),
):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)
    room_name = safe_room_name(room_name)

    conn = get_conn()
    require_room_member(conn, room_name, user_id)

    where = ["t.room_name = ?"]
    params = [room_name]

    if status != "all":
        where.append("t.status = ?")
        params.append(status)

    if week_label != "all":
        where.append("COALESCE(t.week_label, '') = ?")
        params.append(week_label)

    if session_id != "all":
        where.append("t.session_id = ?")
        params.append(session_id)

    rows = conn.execute(
        f"""
        SELECT
            t.*,
            ms.title AS session_title
        FROM todo_items t
        LEFT JOIN meeting_sessions ms
          ON ms.id = t.session_id
        WHERE {' AND '.join(where)}
        ORDER BY
            CASE t.status
                WHEN 'open' THEN 1
                WHEN 'in_progress' THEN 2
                WHEN 'done' THEN 3
                ELSE 4
            END,
            t.created_at DESC
        """,
        tuple(params),
    ).fetchall()

    sessions = conn.execute(
        """
        SELECT id, title, created_at
        FROM meeting_sessions
        WHERE room_name = ?
        ORDER BY created_at DESC
        """,
        (room_name,),
    ).fetchall()

    week_rows = conn.execute(
        """
        SELECT DISTINCT COALESCE(week_label, '') AS week_label
        FROM todo_items
        WHERE room_name = ?
          AND COALESCE(week_label, '') != ''
        ORDER BY week_label ASC
        """,
        (room_name,),
    ).fetchall()

    conn.close()

    return {
        "roomName": room_name,
        "todos": [normalize_todo(r) for r in rows],
        "sessions": [
            {
                "id": r["id"],
                "title": r["title"],
                "createdAt": r["created_at"],
            }
            for r in sessions
        ],
        "weekLabels": [r["week_label"] for r in week_rows],
    }


@router.get("/todo/session/{session_id}")
def list_session_todos(session_id: str, request: Request):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()

    session = conn.execute(
        """
        SELECT room_name
        FROM meeting_sessions
        WHERE id = ?
        LIMIT 1
        """,
        (session_id,),
    ).fetchone()

    if session:
        require_room_member(conn, session["room_name"], user_id)

    rows = conn.execute(
        """
        SELECT
            t.*,
            ms.title AS session_title
        FROM todo_items t
        LEFT JOIN meeting_sessions ms
          ON ms.id = t.session_id
        WHERE t.session_id = ?
        ORDER BY t.created_at DESC
        """,
        (session_id,),
    ).fetchall()

    conn.close()

    return {
        "sessionId": session_id,
        "todos": [normalize_todo(r) for r in rows],
    }


@router.patch("/todo/{todo_id}")
def update_todo(todo_id: str, payload: TodoUpdateRequest, request: Request):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    cur = conn.cursor()

    row = cur.execute(
        "SELECT * FROM todo_items WHERE id = ?",
        (todo_id,),
    ).fetchone()

    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="To-Do를 찾을 수 없습니다.")

    require_room_member(conn, row["room_name"], user_id)

    allowed_status = {"open", "in_progress", "done", "cancelled"}
    allowed_priority = {"low", "medium", "high"}
    allowed_scope = {"team", "personal"}
    allowed_assignee_type = {"team", "personal"}

    mapping = {
        "title": "title",
        "description": "description",
        "status": "status",
        "priority": "priority",
        "dueDate": "due_date",
        "weekLabel": "week_label",
        "assigneeType": "assignee_type",
        "assigneeName": "assignee_name",
        "calendarScope": "calendar_scope",
    }

    data = payload.model_dump(exclude_unset=True)

    if "status" in data and data["status"] not in allowed_status:
        conn.close()
        raise HTTPException(status_code=400, detail="잘못된 status입니다.")

    if "priority" in data and data["priority"] not in allowed_priority:
        conn.close()
        raise HTTPException(status_code=400, detail="잘못된 priority입니다.")

    if "calendarScope" in data and data["calendarScope"] not in allowed_scope:
        conn.close()
        raise HTTPException(status_code=400, detail="잘못된 calendarScope입니다.")

    if "assigneeType" in data and data["assigneeType"] not in allowed_assignee_type:
        conn.close()
        raise HTTPException(status_code=400, detail="잘못된 assigneeType입니다.")

    updates = []
    params = []

    for key, col in mapping.items():
        if key in data:
            updates.append(f"{col} = ?")
            params.append(data[key] or "")

    if not updates:
        conn.close()
        raise HTTPException(status_code=400, detail="수정할 값이 없습니다.")

    updates.append("updated_at = ?")
    params.append(now_iso())
    params.append(todo_id)

    cur.execute(
        f"""
        UPDATE todo_items
        SET {', '.join(updates)}
        WHERE id = ?
        """,
        tuple(params),
    )

    conn.commit()

    updated = cur.execute(
        """
        SELECT
            t.*,
            ms.title AS session_title
        FROM todo_items t
        LEFT JOIN meeting_sessions ms
          ON ms.id = t.session_id
        WHERE t.id = ?
        """,
        (todo_id,),
    ).fetchone()

    conn.close()

    return {"ok": True, "todo": normalize_todo(updated)}


@router.delete("/todo/{todo_id}")
def delete_todo(todo_id: str, request: Request):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    cur = conn.cursor()

    row = cur.execute(
        "SELECT * FROM todo_items WHERE id = ?",
        (todo_id,),
    ).fetchone()

    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="To-Do를 찾을 수 없습니다.")

    require_room_member(conn, row["room_name"], user_id)

    cur.execute("DELETE FROM todo_items WHERE id = ?", (todo_id,))
    cur.execute("DELETE FROM calendar_events WHERE source_todo_id = ?", (todo_id,))

    conn.commit()
    conn.close()

    return {"ok": True, "deletedTodoId": todo_id}


@router.post("/todo/{todo_id}/calendar")
def add_todo_to_calendar(
    todo_id: str,
    payload: AddTodoToCalendarRequest,
    request: Request,
):
    ensure_tables()

    if not payload.startDate:
        raise HTTPException(status_code=400, detail="startDate가 필요합니다.")

    scope = payload.scope or "team"

    if scope not in {"team", "personal"}:
        raise HTTPException(status_code=400, detail="scope는 team 또는 personal이어야 합니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    cur = conn.cursor()

    todo = cur.execute(
        "SELECT * FROM todo_items WHERE id = ?",
        (todo_id,),
    ).fetchone()

    if todo is None:
        conn.close()
        raise HTTPException(status_code=404, detail="To-Do를 찾을 수 없습니다.")

    require_room_member(conn, todo["room_name"], user_id)

    event_id = str(uuid.uuid4())
    now = now_iso()

    cur.execute(
        """
        INSERT INTO calendar_events (
            id,
            room_name,
            scope,
            owner_user_id,
            title,
            description,
            start_date,
            end_date,
            start_time,
            end_time,
            week_label,
            source_session_id,
            source_todo_id,
            created_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            todo["room_name"],
            scope,
            user_id if scope == "personal" else None,
            payload.title or todo["title"],
            payload.description or todo["description"] or "",
            payload.startDate,
            payload.endDate or payload.startDate,
            payload.startTime or "",
            payload.endTime or "",
            payload.weekLabel or todo["week_label"] or "",
            todo["session_id"],
            todo_id,
            user_id,
            now,
            now,
        ),
    )

    cur.execute(
        """
        UPDATE todo_items
        SET
            due_date = COALESCE(NULLIF(?, ''), due_date),
            calendar_scope = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            payload.startDate,
            scope,
            now,
            todo_id,
        ),
    )

    conn.commit()

    event = cur.execute(
        "SELECT * FROM calendar_events WHERE id = ?",
        (event_id,),
    ).fetchone()

    conn.close()

    return {"ok": True, "event": normalize_event(event)}


@router.get("/calendar/events")
def list_calendar_events(
    request: Request,
    room_name: Optional[str] = Query(None),
    scope: str = Query("personal"),
    week_label: str = Query("all"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()

    where = []
    params = []

    if scope == "personal":
        where.append("scope = 'personal'")
        where.append("owner_user_id = ?")
        params.append(user_id)

    elif scope == "team":
        if not room_name:
            conn.close()
            raise HTTPException(status_code=400, detail="팀 일정 조회에는 room_name이 필요합니다.")

        require_room_member(conn, room_name, user_id)

        where.append("scope = 'team'")
        where.append("room_name = ?")
        params.append(room_name)

    elif scope == "all":
        if room_name:
            require_room_member(conn, room_name, user_id)

            where.append(
                "((scope = 'team' AND room_name = ?) OR (scope = 'personal' AND owner_user_id = ?))"
            )
            params.extend([room_name, user_id])
        else:
            where.append("scope = 'personal'")
            where.append("owner_user_id = ?")
            params.append(user_id)

    else:
        conn.close()
        raise HTTPException(status_code=400, detail="scope는 personal/team/all 중 하나여야 합니다.")

    if week_label != "all":
        where.append("COALESCE(week_label, '') = ?")
        params.append(week_label)

    if date_from:
        where.append("start_date >= ?")
        params.append(date_from)

    if date_to:
        where.append("start_date <= ?")
        params.append(date_to)

    sql = "SELECT * FROM calendar_events"

    if where:
        sql += " WHERE " + " AND ".join(where)

    sql += " ORDER BY start_date ASC, start_time ASC, created_at DESC"

    rows = conn.execute(sql, tuple(params)).fetchall()

    week_rows = conn.execute(
        """
        SELECT DISTINCT COALESCE(week_label, '') AS week_label
        FROM calendar_events
        WHERE COALESCE(week_label, '') != ''
        ORDER BY week_label ASC
        """
    ).fetchall()

    conn.close()

    return {
        "scope": scope,
        "roomName": room_name,
        "events": [normalize_event(r) for r in rows],
        "weekLabels": [r["week_label"] for r in week_rows],
    }


@router.post("/calendar/events")
def create_calendar_event(payload: CalendarEventCreateRequest, request: Request):
    ensure_tables()

    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="일정 제목이 필요합니다.")

    if not payload.startDate:
        raise HTTPException(status_code=400, detail="startDate가 필요합니다.")

    scope = payload.scope or "personal"

    if scope not in {"personal", "team"}:
        raise HTTPException(status_code=400, detail="scope는 personal 또는 team이어야 합니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)

    room_name = safe_room_name(payload.roomName) if scope == "team" else payload.roomName

    conn = get_conn()

    if scope == "team":
        require_room_member(conn, room_name, user_id)

    event_id = str(uuid.uuid4())
    now = now_iso()

    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO calendar_events (
            id,
            room_name,
            scope,
            owner_user_id,
            title,
            description,
            start_date,
            end_date,
            start_time,
            end_time,
            week_label,
            source_session_id,
            source_todo_id,
            created_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            room_name,
            scope,
            user_id if scope == "personal" else None,
            payload.title,
            payload.description or "",
            payload.startDate,
            payload.endDate or payload.startDate,
            payload.startTime or "",
            payload.endTime or "",
            payload.weekLabel or "",
            payload.sourceSessionId or "",
            payload.sourceTodoId or "",
            user_id,
            now,
            now,
        ),
    )

    conn.commit()

    event = cur.execute(
        "SELECT * FROM calendar_events WHERE id = ?",
        (event_id,),
    ).fetchone()

    conn.close()

    return {"ok": True, "event": normalize_event(event)}


@router.delete("/calendar/events/{event_id}")
def delete_calendar_event(event_id: str, request: Request):
    ensure_tables()

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    cur = conn.cursor()

    event = cur.execute(
        "SELECT * FROM calendar_events WHERE id = ?",
        (event_id,),
    ).fetchone()

    if event is None:
        conn.close()
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다.")

    if event["scope"] == "personal":
        if event["owner_user_id"] != user_id and user_id != "local_user":
            conn.close()
            raise HTTPException(status_code=403, detail="개인 일정 삭제 권한이 없습니다.")

    if event["scope"] == "team":
        room_name = event["room_name"]

        if not (
            event["created_by"] == user_id
            or is_room_admin(conn, room_name, user_id)
            or user_id == "local_user"
        ):
            conn.close()
            raise HTTPException(status_code=403, detail="팀 일정은 생성자 또는 룸 관리자만 삭제할 수 있습니다.")

    cur.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))

    conn.commit()
    conn.close()

    return {"ok": True, "deletedEventId": event_id}