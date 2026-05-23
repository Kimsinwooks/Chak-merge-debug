import shutil
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

try:
    from auth_api import get_login_user
except Exception:
    get_login_user = None


router = APIRouter(prefix="/rooms", tags=["Room Admin"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


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
    """
    Google login 기반 user 정보 추출.
    auth_api.get_login_user가 있으면 우선 사용하고,
    없으면 request.session fallback.
    """
    if get_login_user is not None:
        try:
            user = get_login_user(request)
            if user:
                return user
        except Exception:
            pass

    try:
        user = request.session.get("user") or {}
        return user
    except Exception:
        return {}


def get_user_id(user: dict) -> Optional[str]:
    return (
        user.get("id")
        or user.get("sub")
        or user.get("user_id")
        or user.get("google_id")
        or user.get("email")
    )


def is_safe_data_path(path_text: str) -> bool:
    if not path_text:
        return False

    try:
        target = Path(path_text).resolve()
        data_root = DATA_DIR.resolve()
        return str(target).startswith(str(data_root))
    except Exception:
        return False


def remove_file_if_safe(path_text: str):
    if not path_text:
        return {"deleted": False, "reason": "empty path"}

    if not is_safe_data_path(path_text):
        return {"deleted": False, "reason": "unsafe path", "path": path_text}

    try:
        p = Path(path_text)
        if p.exists() and p.is_file():
            p.unlink()
            return {"deleted": True, "path": path_text}
        return {"deleted": False, "reason": "file not found", "path": path_text}
    except Exception as e:
        return {"deleted": False, "reason": str(e), "path": path_text}


def remove_dir_if_safe(path_text: str):
    if not path_text:
        return {"deleted": False, "reason": "empty path"}

    if not is_safe_data_path(path_text):
        return {"deleted": False, "reason": "unsafe path", "path": path_text}

    try:
        p = Path(path_text)
        if p.exists() and p.is_dir():
            shutil.rmtree(p)
            return {"deleted": True, "path": path_text}
        return {"deleted": False, "reason": "directory not found", "path": path_text}
    except Exception as e:
        return {"deleted": False, "reason": str(e), "path": path_text}


def get_room(conn, room_name: str):
    return conn.execute(
        """
        SELECT *
        FROM rooms
        WHERE room_name = ?
        LIMIT 1
        """,
        (room_name,),
    ).fetchone()


def is_room_owner(conn, room_name: str, user_id: Optional[str]) -> bool:
    if not user_id:
        return False

    room = get_room(conn, room_name)
    if room is None:
        return False

    owner_user_id = room["owner_user_id"] if "owner_user_id" in room.keys() else None

    if owner_user_id and str(owner_user_id) == str(user_id):
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


@router.get("/{room_name}/delete-preview")
def preview_delete_room(
    room_name: str,
    request: Request,
):
    """
    룸 삭제 전 삭제될 데이터 수 확인.
    """
    room_name = (room_name or "").strip()

    if not room_name:
        raise HTTPException(status_code=400, detail="room_name이 비어 있습니다.")

    if room_name == "default_room":
        raise HTTPException(status_code=400, detail="default_room은 삭제할 수 없습니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()

    room = get_room(conn, room_name)
    if room is None:
        conn.close()
        raise HTTPException(status_code=404, detail="룸을 찾을 수 없습니다.")

    if not is_room_owner(conn, room_name, user_id):
        conn.close()
        raise HTTPException(status_code=403, detail="룸 생성자 또는 관리자만 삭제할 수 있습니다.")

    session_ids = [
        r["id"]
        for r in conn.execute(
            "SELECT id FROM meeting_sessions WHERE room_name = ?",
            (room_name,),
        ).fetchall()
    ]

    def count_table(table: str, where: str, params=()):
        return conn.execute(
            f"SELECT COUNT(*) AS c FROM {table} WHERE {where}",
            params,
        ).fetchone()["c"]

    counts = {
        "meetingSessions": count_table("meeting_sessions", "room_name = ?", (room_name,)),
        "libraryItems": count_table("library_items", "room_name = ?", (room_name,)),
        "meetingReportCache": count_table("meeting_report_cache", "room_name = ?", (room_name,)),
        "todoItems": count_table("todo_items", "room_name = ?", (room_name,)),
        "calendarEvents": count_table("calendar_events", "room_name = ?", (room_name,)),
        "transcriptLines": count_table("transcript_lines", "room_name = ?", (room_name,)),
        "roomMembers": count_table("room_members", "room_name = ?", (room_name,)),
    }

    conn.close()

    return {
        "ok": True,
        "roomName": room_name,
        "room": row_to_dict(room),
        "sessionIds": session_ids,
        "counts": counts,
    }


@router.delete("/{room_name}")
def delete_room(
    room_name: str,
    request: Request,
    delete_files: bool = Query(True),
    delete_room_row: bool = Query(True),
):
    """
    룸 생성자/관리자만 룸 삭제 가능.

    delete_files=true:
      backend/data 내부 실제 파일도 삭제

    delete_room_row=true:
      rooms, room_members까지 삭제
      false면 방은 남기고 내부 데이터만 비움
    """
    room_name = (room_name or "").strip()

    if not room_name:
        raise HTTPException(status_code=400, detail="room_name이 비어 있습니다.")

    if room_name == "default_room":
        raise HTTPException(status_code=400, detail="default_room은 삭제할 수 없습니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    cur = conn.cursor()

    room = get_room(conn, room_name)
    if room is None:
        conn.close()
        raise HTTPException(status_code=404, detail="룸을 찾을 수 없습니다.")

    if not is_room_owner(conn, room_name, user_id):
        conn.close()
        raise HTTPException(status_code=403, detail="룸 생성자 또는 관리자만 삭제할 수 있습니다.")

    session_ids = [
        r["id"]
        for r in cur.execute(
            "SELECT id FROM meeting_sessions WHERE room_name = ?",
            (room_name,),
        ).fetchall()
    ]

    file_results = []

    if delete_files:
        item_rows = cur.execute(
            """
            SELECT file_path
            FROM library_items
            WHERE room_name = ?
            """,
            (room_name,),
        ).fetchall()

        for r in item_rows:
            file_results.append(remove_file_if_safe(r["file_path"]))

        report_rows = cur.execute(
            """
            SELECT output_dir
            FROM meeting_report_cache
            WHERE room_name = ?
            """,
            (room_name,),
        ).fetchall()

        for r in report_rows:
            file_results.append(remove_dir_if_safe(r["output_dir"]))

        for sid in session_ids:
            file_results.append(remove_dir_if_safe(str(DATA_DIR / "uploaded_audio" / sid)))
            file_results.append(remove_dir_if_safe(str(DATA_DIR / "meeting_outputs" / room_name / sid)))
            file_results.append(remove_dir_if_safe(str(DATA_DIR / room_name / "sessions" / sid)))

        file_results.append(remove_dir_if_safe(str(DATA_DIR / room_name)))

    deleted = {}

    cur.execute("DELETE FROM library_items WHERE room_name = ?", (room_name,))
    deleted["libraryItems"] = cur.rowcount

    cur.execute("DELETE FROM meeting_report_cache WHERE room_name = ?", (room_name,))
    deleted["meetingReportCache"] = cur.rowcount

    cur.execute("DELETE FROM todo_items WHERE room_name = ?", (room_name,))
    deleted["todoItems"] = cur.rowcount

    cur.execute("DELETE FROM calendar_events WHERE room_name = ?", (room_name,))
    deleted["calendarEvents"] = cur.rowcount

    cur.execute("DELETE FROM transcript_lines WHERE room_name = ?", (room_name,))
    deleted["transcriptLines"] = cur.rowcount

    if session_ids:
        placeholders = ",".join(["?"] * len(session_ids))
        cur.execute(
            f"""
            DELETE FROM meeting_ai_events
            WHERE session_id IN ({placeholders})
            """,
            tuple(session_ids),
        )
        deleted["meetingAiEvents"] = cur.rowcount
    else:
        deleted["meetingAiEvents"] = 0

    cur.execute("DELETE FROM meeting_sessions WHERE room_name = ?", (room_name,))
    deleted["meetingSessions"] = cur.rowcount

    if delete_room_row:
        cur.execute("DELETE FROM room_members WHERE room_name = ?", (room_name,))
        deleted["roomMembers"] = cur.rowcount

        cur.execute("DELETE FROM rooms WHERE room_name = ?", (room_name,))
        deleted["rooms"] = cur.rowcount
    else:
        deleted["roomMembers"] = 0
        deleted["rooms"] = 0

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "roomName": room_name,
        "deletedRoomRow": delete_room_row,
        "deleted": deleted,
        "fileResults": file_results,
    }
