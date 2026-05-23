import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def add_column_if_missing(cur, table, column, coldef):
    cur.execute(f"PRAGMA table_info({table})")
    cols = {row[1] for row in cur.fetchall()}

    if column not in cols:
        print(f"[MIGRATE] add column {table}.{column}")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")


def table_exists(cur, table):
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


def migrate():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not DB_PATH.exists():
        print(f"[INFO] DB not found. New DB will be created: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    now = datetime.now().isoformat()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            owner_user_id TEXT,
            invite_code TEXT UNIQUE,
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
            email TEXT,
            name TEXT,
            picture TEXT,
            role TEXT DEFAULT 'member',
            joined_at TEXT NOT NULL,
            UNIQUE(room_name, user_id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            room_name TEXT DEFAULT 'default_room',
            meeting_time TEXT,
            keywords TEXT,
            meeting_type TEXT,
            realtime_recording_enabled INTEGER DEFAULT 1,
            created_by TEXT,
            created_at TEXT NOT NULL,
            stopped_at TEXT,
            status TEXT DEFAULT 'live'
        )
        """
    )

    add_column_if_missing(cur, "meeting_sessions", "room_name", "TEXT DEFAULT 'default_room'")
    add_column_if_missing(cur, "meeting_sessions", "created_by", "TEXT")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS library_items (
            id TEXT PRIMARY KEY,
            room_name TEXT DEFAULT 'default_room',
            session_id TEXT,
            scope TEXT NOT NULL,
            bucket TEXT NOT NULL,
            kind TEXT NOT NULL,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            text_content TEXT,
            preview_line TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    add_column_if_missing(cur, "library_items", "room_name", "TEXT DEFAULT 'default_room'")
    add_column_if_missing(cur, "library_items", "created_by", "TEXT")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_ai_events (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT,
            asked_at_sec REAL DEFAULT 0,
            before_context TEXT,
            after_context TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_report_cache (
            session_id TEXT PRIMARY KEY,
            room_name TEXT DEFAULT 'default_room',
            report_json TEXT NOT NULL,
            output_dir TEXT,
            final_summary_path TEXT,
            todo_json_path TEXT,
            todo_markdown_path TEXT,
            transcript_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    add_column_if_missing(cur, "meeting_report_cache", "room_name", "TEXT DEFAULT 'default_room'")
    add_column_if_missing(cur, "meeting_report_cache", "output_dir", "TEXT")
    add_column_if_missing(cur, "meeting_report_cache", "final_summary_path", "TEXT")
    add_column_if_missing(cur, "meeting_report_cache", "todo_json_path", "TEXT")
    add_column_if_missing(cur, "meeting_report_cache", "todo_markdown_path", "TEXT")
    add_column_if_missing(cur, "meeting_report_cache", "transcript_path", "TEXT")

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

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS transcript_lines (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            start_sec REAL NOT NULL,
            end_sec REAL NOT NULL,
            speaker TEXT DEFAULT '익명1',
            speaker_id TEXT,
            text TEXT NOT NULL,
            source TEXT DEFAULT 'whisper',
            created_at TEXT NOT NULL
        )
        """
    )

    # 기존 library_items.room_name 비어 있으면 meeting_sessions 기준으로 채우기
    if table_exists(cur, "library_items") and table_exists(cur, "meeting_sessions"):
        print("[MIGRATE] backfill library_items.room_name from meeting_sessions")

        cur.execute(
            """
            UPDATE library_items
            SET room_name = COALESCE(
                (
                    SELECT ms.room_name
                    FROM meeting_sessions ms
                    WHERE ms.id = library_items.session_id
                ),
                library_items.room_name,
                'default_room'
            )
            WHERE room_name IS NULL
               OR room_name = ''
               OR room_name = 'default_room'
            """
        )

    # meeting_report_cache.room_name backfill
    if table_exists(cur, "meeting_report_cache") and table_exists(cur, "meeting_sessions"):
        print("[MIGRATE] backfill meeting_report_cache.room_name from meeting_sessions")

        cur.execute(
            """
            UPDATE meeting_report_cache
            SET room_name = COALESCE(
                (
                    SELECT ms.room_name
                    FROM meeting_sessions ms
                    WHERE ms.id = meeting_report_cache.session_id
                ),
                meeting_report_cache.room_name,
                'default_room'
            )
            WHERE room_name IS NULL
               OR room_name = ''
               OR room_name = 'default_room'
            """
        )

    # default_room row 보장
    cur.execute(
        """
        INSERT OR IGNORE INTO rooms (id, name, owner_user_id, invite_code, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), "default_room", None, None, now),
    )

    conn.commit()

    print("\n[MIGRATE] done")
    print("DB:", DB_PATH)

    tables = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()

    for (table,) in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"- {table}: {count}")

    conn.close()


if __name__ == "__main__":
    migrate()
