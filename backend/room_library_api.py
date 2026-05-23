import sqlite3
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

try:
    from auth_api import get_login_user
except Exception:
    get_login_user = None


router = APIRouter(prefix="/library", tags=["Room Library"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def now_sqlite():
    return "datetime('now')"


def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def safe_room_name(room_name: Optional[str]) -> str:
    room = (room_name or "").strip()
    return room or "default_room"


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


def get_user_id(user: dict) -> Optional[str]:
    return (
        user.get("id")
        or user.get("sub")
        or user.get("user_id")
        or user.get("google_id")
        or user.get("email")
    )


def is_room_member(conn, room_name: str, user_id: Optional[str]) -> bool:
    if room_name == "default_room":
        return True

    if not user_id:
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


def require_room_member(conn, room_name: str, user_id: Optional[str]):
    if not is_room_member(conn, room_name, user_id):
        raise HTTPException(status_code=403, detail="이 방의 자료함 접근 권한이 없습니다.")


def bucket_label(bucket: str) -> str:
    labels = {
        "live_recordings": "회의 중 녹음본",
        "post_meeting_recordings": "회의 후 녹음본",
        "uploaded_knowledge": "업로드 문서",
        "analysis_outputs": "회의 분석 결과",
        "todo_outputs": "To-Do 결과",
    }
    return labels.get(bucket or "", bucket or "unknown")


def normalize_library_item(row):
    d = row_to_dict(row)

    return {
        "id": d.get("id"),
        "sessionId": d.get("session_id"),
        "roomName": d.get("room_name"),
        "scope": d.get("scope"),
        "bucket": d.get("bucket"),
        "bucketLabel": bucket_label(d.get("bucket")),
        "kind": d.get("kind"),
        "kindLabel": d.get("kind"),
        "name": d.get("name"),
        "filePath": d.get("file_path"),
        "previewLine": d.get("preview_line"),
        "createdAt": d.get("created_at"),
        "createdBy": d.get("created_by"),
        "sessionTitle": d.get("session_title"),
        "sessionStatus": d.get("session_status"),
        "meetingType": d.get("meeting_type"),
    }


def normalize_session(row):
    d = row_to_dict(row)

    return {
        "id": d.get("id"),
        "sessionId": d.get("id"),
        "roomName": d.get("room_name"),
        "title": d.get("title"),
        "meetingTime": d.get("meeting_time"),
        "keywords": d.get("keywords"),
        "meetingType": d.get("meeting_type"),
        "status": d.get("status"),
        "createdAt": d.get("created_at"),
        "stoppedAt": d.get("stopped_at"),
        "createdBy": d.get("created_by"),
        "liveRecordingCount": d.get("live_recording_count", 0),
        "postRecordingCount": d.get("post_recording_count", 0),
        "analysisCount": d.get("analysis_count", 0),
        "todoCount": d.get("todo_count", 0),
        "previewLine": d.get("preview_line"),
    }


def ensure_library_tables():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS library_items (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            scope TEXT NOT NULL,
            bucket TEXT NOT NULL,
            kind TEXT NOT NULL,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            text_content TEXT,
            preview_line TEXT,
            created_at TEXT NOT NULL,
            room_name TEXT DEFAULT 'default_room',
            created_by TEXT
        )
        """
    )

    conn.commit()
    conn.close()


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

    target = Path(path_text)

    try:
        if target.exists() and target.is_file():
            target.unlink()
            return {"deleted": True, "path": path_text}

        return {"deleted": False, "reason": "file not found", "path": path_text}
    except Exception as e:
        return {"deleted": False, "reason": str(e), "path": path_text}


def remove_dir_if_safe(path_text: str):
    if not path_text:
        return {"deleted": False, "reason": "empty path"}

    if not is_safe_data_path(path_text):
        return {"deleted": False, "reason": "unsafe path", "path": path_text}

    target = Path(path_text)

    try:
        if target.exists() and target.is_dir():
            import shutil

            shutil.rmtree(target)
            return {"deleted": True, "path": path_text}

        return {"deleted": False, "reason": "directory not found", "path": path_text}
    except Exception as e:
        return {"deleted": False, "reason": str(e), "path": path_text}


def save_library_item(
    conn,
    room_name: str,
    session_id: Optional[str],
    bucket: str,
    kind: str,
    name: str,
    file_path: str,
    text_content: str,
    created_by: Optional[str],
):
    item_id = str(uuid.uuid4())
    preview = (text_content or name or "").splitlines()[0][:220]

    conn.execute(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
        """,
        (
            item_id,
            session_id,
            "room" if not session_id else "session",
            bucket,
            kind,
            name,
            file_path,
            text_content,
            preview,
            room_name,
            created_by,
        ),
    )

    return item_id


@router.get("/room-tree")
def get_room_library_tree(
    request: Request,
    room_name: str = Query("default_room"),
):
    ensure_library_tables()

    room_name = safe_room_name(room_name)
    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    require_room_member(conn, room_name, user_id)

    room = conn.execute(
        """
        SELECT *
        FROM rooms
        WHERE room_name = ?
        LIMIT 1
        """,
        (room_name,),
    ).fetchone()

    if room is None:
        conn.close()
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")

    items = conn.execute(
        """
        SELECT
            li.*,
            ms.title AS session_title,
            ms.status AS session_status,
            ms.meeting_type AS meeting_type
        FROM library_items li
        LEFT JOIN meeting_sessions ms
          ON ms.id = li.session_id
        WHERE COALESCE(li.room_name, ms.room_name, 'default_room') = ?
        ORDER BY li.created_at DESC
        """,
        (room_name,),
    ).fetchall()

    sessions = conn.execute(
        """
        SELECT
            ms.*,

            COALESCE(SUM(
                CASE
                    WHEN li.bucket = 'live_recordings' THEN 1
                    ELSE 0
                END
            ), 0) AS live_recording_count,

            COALESCE(SUM(
                CASE
                    WHEN li.bucket = 'post_meeting_recordings' THEN 1
                    ELSE 0
                END
            ), 0) AS post_recording_count,

            COALESCE(SUM(
                CASE
                    WHEN li.bucket = 'analysis_outputs' THEN 1
                    ELSE 0
                END
            ), 0) AS analysis_count,

            COALESCE(SUM(
                CASE
                    WHEN li.bucket = 'todo_outputs' THEN 1
                    ELSE 0
                END
            ), 0) AS todo_count,

            MAX(li.preview_line) AS preview_line

        FROM meeting_sessions ms
        LEFT JOIN library_items li
          ON li.session_id = ms.id
        WHERE ms.room_name = ?
        GROUP BY ms.id
        ORDER BY ms.created_at DESC
        """,
        (room_name,),
    ).fetchall()

    reports = conn.execute(
        """
        SELECT
            rc.session_id,
            rc.room_name,
            rc.output_dir,
            rc.final_summary_path,
            rc.todo_json_path,
            rc.todo_markdown_path,
            rc.transcript_path,
            rc.created_at,
            rc.updated_at,
            ms.title AS session_title
        FROM meeting_report_cache rc
        LEFT JOIN meeting_sessions ms
          ON ms.id = rc.session_id
        WHERE COALESCE(rc.room_name, ms.room_name, 'default_room') = ?
        ORDER BY rc.updated_at DESC
        """,
        (room_name,),
    ).fetchall()

    conn.close()

    normalized_items = [normalize_library_item(r) for r in items]

    def by_bucket(bucket):
        return [x for x in normalized_items if x.get("bucket") == bucket]

    cached_report_outputs = []

    for r in reports:
        d = row_to_dict(r)
        cached_report_outputs.append(
            {
                "sessionId": d.get("session_id"),
                "roomName": d.get("room_name"),
                "sessionTitle": d.get("session_title"),
                "outputDir": d.get("output_dir"),
                "finalSummaryPath": d.get("final_summary_path"),
                "todoJsonPath": d.get("todo_json_path"),
                "todoMarkdownPath": d.get("todo_markdown_path"),
                "transcriptPath": d.get("transcript_path"),
                "createdAt": d.get("created_at"),
                "updatedAt": d.get("updated_at"),
            }
        )

    return {
        "roomName": room_name,
        "room": row_to_dict(room),
        "sessions": [normalize_session(r) for r in sessions],
        "allItems": normalized_items,
        "realtimeMeetings": by_bucket("live_recordings"),
        "postMeetingRecordings": by_bucket("post_meeting_recordings"),
        "uploadedKnowledge": by_bucket("uploaded_knowledge"),
        "analysisOutputs": by_bucket("analysis_outputs"),
        "todoOutputs": by_bucket("todo_outputs"),
        "cachedReportOutputs": cached_report_outputs,
        "counts": {
            "sessions": len(sessions),
            "allItems": len(normalized_items),
            "realtimeMeetings": len(by_bucket("live_recordings")),
            "postMeetingRecordings": len(by_bucket("post_meeting_recordings")),
            "uploadedKnowledge": len(by_bucket("uploaded_knowledge")),
            "analysisOutputs": len(by_bucket("analysis_outputs")),
            "todoOutputs": len(by_bucket("todo_outputs")),
            "cachedReportOutputs": len(cached_report_outputs),
        },
    }


@router.get("/rooms/{room_name}/sessions")
def list_room_sessions(
    request: Request,
    room_name: str,
):
    room_name = safe_room_name(room_name)
    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    require_room_member(conn, room_name, user_id)

    rows = conn.execute(
        """
        SELECT *
        FROM meeting_sessions
        WHERE room_name = ?
        ORDER BY created_at DESC
        """,
        (room_name,),
    ).fetchall()

    conn.close()

    return {
        "roomName": room_name,
        "sessions": [row_to_dict(r) for r in rows],
    }


@router.post("/rooms/{room_name}/knowledge")
async def upload_room_knowledge_file(
    room_name: str,
    request: Request,
    file: UploadFile = File(...),
):
    ensure_library_tables()

    room_name = safe_room_name(room_name)
    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()
    require_room_member(conn, room_name, user_id)

    original_name = file.filename or "uploaded_file"
    ext = Path(original_name).suffix.lower()

    allowed = {
        ".txt",
        ".md",
        ".json",
        ".csv",
        ".pdf",
        ".docx",
        ".hwp",
    }

    if ext not in allowed:
        conn.close()
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 형식입니다.")

    upload_dir = DATA_DIR / "room_knowledge" / room_name
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4()}_{Path(original_name).name}"
    dst = upload_dir / safe_name

    content = await file.read()
    dst.write_bytes(content)

    text_content = ""

    if ext in {".txt", ".md", ".json", ".csv"}:
        try:
            text_content = content.decode("utf-8", errors="ignore")[:50000]
        except Exception:
            text_content = ""

    item_id = save_library_item(
        conn=conn,
        room_name=room_name,
        session_id=None,
        bucket="uploaded_knowledge",
        kind=f"room_knowledge{ext}",
        name=original_name,
        file_path=str(dst),
        text_content=text_content or f"{original_name} 업로드됨",
        created_by=user_id,
    )

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "itemId": item_id,
        "roomName": room_name,
        "filename": original_name,
        "filePath": str(dst),
    }


@router.get("/items/{item_id}/preview")
def preview_library_item(
    item_id: str,
    request: Request,
):
    conn = get_conn()

    item = conn.execute(
        """
        SELECT *
        FROM library_items
        WHERE id = ?
        LIMIT 1
        """,
        (item_id,),
    ).fetchone()

    if item is None:
        conn.close()
        raise HTTPException(status_code=404, detail="자료 항목을 찾을 수 없습니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)
    room_name = item["room_name"] or "default_room"

    require_room_member(conn, room_name, user_id)

    text = item["text_content"] or ""
    path = item["file_path"]

    if not text and path and is_safe_data_path(path):
        p = Path(path)
        if p.exists() and p.suffix.lower() in {".txt", ".md", ".json", ".csv"}:
            text = p.read_text(encoding="utf-8", errors="ignore")

    conn.close()

    return {
        "id": item_id,
        "name": item["name"],
        "kind": item["kind"],
        "bucket": item["bucket"],
        "roomName": room_name,
        "text": (text or "")[:20000],
        "downloadUrl": f"/api/library/items/{item_id}/download",
    }


@router.get("/items/{item_id}/download")
def download_library_item(
    item_id: str,
    request: Request,
):
    conn = get_conn()

    item = conn.execute(
        """
        SELECT *
        FROM library_items
        WHERE id = ?
        LIMIT 1
        """,
        (item_id,),
    ).fetchone()

    if item is None:
        conn.close()
        raise HTTPException(status_code=404, detail="자료 항목을 찾을 수 없습니다.")

    user = get_current_user(request)
    user_id = get_user_id(user)
    room_name = item["room_name"] or "default_room"

    require_room_member(conn, room_name, user_id)

    path = item["file_path"]

    if not path or not is_safe_data_path(path):
        conn.close()
        raise HTTPException(status_code=400, detail="다운로드할 수 없는 파일 경로입니다.")

    p = Path(path)

    if not p.exists() or not p.is_file():
        conn.close()
        raise HTTPException(status_code=404, detail="실제 파일을 찾을 수 없습니다.")

    filename = item["name"] or p.name

    conn.close()

    return FileResponse(
        path=str(p),
        filename=filename,
    )


@router.delete("/items/{item_id}")
def delete_library_item(
    item_id: str,
    request: Request,
    delete_file: bool = Query(True),
):
    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()

    item = conn.execute(
        """
        SELECT *
        FROM library_items
        WHERE id = ?
        LIMIT 1
        """,
        (item_id,),
    ).fetchone()

    if item is None:
        conn.close()
        raise HTTPException(status_code=404, detail="자료 항목을 찾을 수 없습니다.")

    room_name = item["room_name"] or "default_room"
    require_room_member(conn, room_name, user_id)

    file_result = remove_file_if_safe(item["file_path"]) if delete_file else None

    conn.execute(
        """
        DELETE FROM library_items
        WHERE id = ?
        """,
        (item_id,),
    )

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "deletedItemId": item_id,
        "roomName": room_name,
        "deletedFile": file_result,
    }


@router.delete("/reports/{session_id}")
def delete_meeting_report_outputs(
    session_id: str,
    request: Request,
    delete_files: bool = Query(True),
):
    user = get_current_user(request)
    user_id = get_user_id(user)

    conn = get_conn()

    session = conn.execute(
        """
        SELECT *
        FROM meeting_sessions
        WHERE id = ?
        LIMIT 1
        """,
        (session_id,),
    ).fetchone()

    if session is None:
        conn.close()
        raise HTTPException(status_code=404, detail="회의 세션을 찾을 수 없습니다.")

    room_name = session["room_name"] or "default_room"
    require_room_member(conn, room_name, user_id)

    report = conn.execute(
        """
        SELECT *
        FROM meeting_report_cache
        WHERE session_id = ?
        LIMIT 1
        """,
        (session_id,),
    ).fetchone()

    output_dir = report["output_dir"] if report else None

    output_items = conn.execute(
        """
        SELECT *
        FROM library_items
        WHERE session_id = ?
          AND bucket IN ('analysis_outputs', 'todo_outputs')
        """,
        (session_id,),
    ).fetchall()

    file_results = []

    if delete_files:
        for item in output_items:
            file_results.append(remove_file_if_safe(item["file_path"]))

        if output_dir:
            file_results.append(remove_dir_if_safe(output_dir))

    conn.execute(
        """
        DELETE FROM library_items
        WHERE session_id = ?
          AND bucket IN ('analysis_outputs', 'todo_outputs')
        """,
        (session_id,),
    )

    conn.execute(
        """
        DELETE FROM meeting_report_cache
        WHERE session_id = ?
        """,
        (session_id,),
    )

    conn.execute(
        """
        DELETE FROM todo_items
        WHERE session_id = ?
        """,
        (session_id,),
    )

    conn.commit()
    conn.close()

    return {
        "ok": True,
        "sessionId": session_id,
        "roomName": room_name,
        "deletedReportCache": report is not None,
        "deletedOutputItems": len(output_items),
        "fileResults": file_results,
    }