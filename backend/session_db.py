import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from storage_paths import get_live_db_path, get_post_db_path


def _connect(db_path: Path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_live_recordings_db(db_path: Path):
    conn = _connect(db_path)
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS live_transcripts (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            speaker TEXT,
            start_sec REAL DEFAULT 0,
            end_sec REAL DEFAULT 0,
            text TEXT NOT NULL,
            source_file TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS realtime_ai_events (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            question TEXT,
            answer TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def init_post_meeting_recordings_db(db_path: Path):
    conn = _connect(db_path)
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS post_meeting_reports (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            summary TEXT,
            full_transcript TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS timeline_items (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            start_sec REAL DEFAULT 0,
            end_sec REAL DEFAULT 0,
            title TEXT,
            description TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS action_items (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            task TEXT NOT NULL,
            owner TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'open',
            created_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def init_session_databases(room_name: str, session_id: str):
    live_db_path = get_live_db_path(room_name, session_id)
    post_db_path = get_post_db_path(room_name, session_id)

    init_live_recordings_db(live_db_path)
    init_post_meeting_recordings_db(post_db_path)

    return {
        "liveDbPath": str(live_db_path),
        "postDbPath": str(post_db_path),
    }


def insert_live_transcript(
    room_name: str,
    session_id: str,
    text: str,
    speaker: str = "익명1",
    start_sec: float = 0,
    end_sec: float = 0,
    source_file: str | None = None,
):
    db_path = get_live_db_path(room_name, session_id)
    init_live_recordings_db(db_path)

    conn = _connect(db_path)
    conn.execute(
        """
        INSERT INTO live_transcripts (
            id, room_name, session_id, speaker, start_sec, end_sec,
            text, source_file, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            room_name,
            session_id,
            speaker,
            start_sec,
            end_sec,
            text,
            source_file,
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def insert_post_summary(
    room_name: str,
    session_id: str,
    summary: str,
    full_transcript: str,
):
    db_path = get_post_db_path(room_name, session_id)
    init_post_meeting_recordings_db(db_path)

    conn = _connect(db_path)
    conn.execute(
        """
        INSERT INTO post_meeting_reports (
            id, room_name, session_id, summary, full_transcript, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            str(uuid.uuid4()),
            room_name,
            session_id,
            summary,
            full_transcript,
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    
def _format_sec(sec: float | int | None) -> str:
    sec = int(sec or 0)
    mm = sec // 60
    ss = sec % 60
    return f"{mm:02d}:{ss:02d}"


def find_live_db_path_by_session_id(session_id: str) -> Path | None:
    """
    backend/data/{room_name}/sessions/{session_id}/live_recordings.sqlite3
    구조에서 session_id에 해당하는 live_recordings.sqlite3를 찾는다.
    """
    from storage_paths import DATA_DIR

    if not session_id:
        return None

    for room_dir in DATA_DIR.iterdir():
        if not room_dir.is_dir():
            continue

        # _users, sessions, global_library 같은 시스템 폴더는 제외
        if room_dir.name.startswith("_") or room_dir.name in {"sessions", "global_library"}:
            continue

        candidate = room_dir / "sessions" / session_id / "live_recordings.sqlite3"

        if candidate.exists():
            return candidate

    return None


def read_live_transcript_rows_by_session_id(session_id: str) -> list[dict]:
    db_path = find_live_db_path_by_session_id(session_id)

    if not db_path:
        return []

    init_live_recordings_db(db_path)

    conn = _connect(db_path)
    rows = conn.execute(
        """
        SELECT
            id,
            room_name,
            session_id,
            speaker,
            start_sec,
            end_sec,
            text,
            source_file,
            created_at
        FROM live_transcripts
        WHERE session_id = ?
        ORDER BY start_sec ASC, created_at ASC
        """,
        (session_id,),
    ).fetchall()
    conn.close()

    return [dict(row) for row in rows]


def read_live_transcript_text_by_session_id(session_id: str) -> str:
    rows = read_live_transcript_rows_by_session_id(session_id)

    lines = []

    for row in rows:
        text = (row.get("text") or "").strip()
        if not text:
            continue

        speaker = row.get("speaker") or "익명1"
        start_sec = row.get("start_sec") or 0
        end_sec = row.get("end_sec") or start_sec

        lines.append(
            f"[{_format_sec(start_sec)}~{_format_sec(end_sec)}] {speaker}: {text}"
        )

    return "\n".join(lines)


def read_recent_live_transcript_text_by_session_id(
    session_id: str,
    seconds: int = 180,
) -> str:
    rows = read_live_transcript_rows_by_session_id(session_id)

    if not rows:
        return ""

    max_end = max(float(row.get("end_sec") or row.get("start_sec") or 0) for row in rows)
    threshold = max(0, max_end - seconds)

    recent_rows = [
        row for row in rows
        if float(row.get("end_sec") or row.get("start_sec") or 0) >= threshold
    ]

    lines = []

    for row in recent_rows:
        text = (row.get("text") or "").strip()
        if not text:
            continue

        speaker = row.get("speaker") or "익명1"
        lines.append(f"{speaker}: {text}")

    return "\n".join(lines)
