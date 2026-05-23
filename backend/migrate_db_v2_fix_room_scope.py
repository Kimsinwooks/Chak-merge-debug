import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def table_exists(cur, table: str) -> bool:
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


def get_columns(cur, table: str) -> set[str]:
    if not table_exists(cur, table):
        return set()
    cur.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cur.fetchall()}


def add_column_if_missing(cur, table: str, column: str, coldef: str):
    cols = get_columns(cur, table)
    if column not in cols:
        print(f"[MIGRATE] add column {table}.{column}")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")


def create_core_tables(cur):
    # 기존 rooms는 room_name을 쓰고 있으므로 name 컬럼을 만들지 않는다.
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            room_name TEXT UNIQUE NOT NULL,
            owner_user_id TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    add_column_if_missing(cur, "rooms", "invite_code", "TEXT")

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS room_members (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            created_at TEXT NOT NULL
        )
        """
    )

    add_column_if_missing(cur, "room_members", "email", "TEXT")
    add_column_if_missing(cur, "room_members", "name", "TEXT")
    add_column_if_missing(cur, "room_members", "picture", "TEXT")
    add_column_if_missing(cur, "room_members", "joined_at", "TEXT")

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

    add_column_if_missing(cur, "meeting_sessions", "room_name", "TEXT DEFAULT 'default_room'")
    add_column_if_missing(cur, "meeting_sessions", "created_by", "TEXT")

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
            report_json TEXT NOT NULL,
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


def backfill_room_names(cur):
    print("[MIGRATE] normalize empty room names")

    if table_exists(cur, "meeting_sessions"):
        cur.execute(
            """
            UPDATE meeting_sessions
            SET room_name = 'default_room'
            WHERE room_name IS NULL OR TRIM(room_name) = ''
            """
        )

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
                room_name,
                'default_room'
            )
            WHERE room_name IS NULL
               OR TRIM(room_name) = ''
               OR room_name = 'default_room'
            """
        )

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
                room_name,
                'default_room'
            )
            WHERE room_name IS NULL
               OR TRIM(room_name) = ''
               OR room_name = 'default_room'
            """
        )

    if table_exists(cur, "transcript_lines") and table_exists(cur, "meeting_sessions"):
        print("[MIGRATE] backfill transcript_lines.room_name from meeting_sessions")

        cur.execute(
            """
            UPDATE transcript_lines
            SET room_name = COALESCE(
                (
                    SELECT ms.room_name
                    FROM meeting_sessions ms
                    WHERE ms.id = transcript_lines.session_id
                ),
                room_name,
                'default_room'
            )
            WHERE room_name IS NULL
               OR TRIM(room_name) = ''
               OR room_name = 'default_room'
            """
        )


def ensure_rooms_from_sessions(cur):
    now = datetime.now().isoformat()

    # default_room 보장
    cur.execute(
        """
        INSERT OR IGNORE INTO rooms (id, room_name, owner_user_id, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), "default_room", "", now),
    )

    # meeting_sessions에 있는 room_name이 rooms에 없으면 생성
    if table_exists(cur, "meeting_sessions"):
        rows = cur.execute(
            """
            SELECT DISTINCT room_name
            FROM meeting_sessions
            WHERE room_name IS NOT NULL AND TRIM(room_name) != ''
            """
        ).fetchall()

        for (room_name,) in rows:
            cur.execute(
                """
                INSERT OR IGNORE INTO rooms (id, room_name, owner_user_id, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), room_name, "", now),
            )


def create_indexes(cur):
    indexes = [
        ("idx_rooms_room_name", "rooms", "room_name"),
        ("idx_room_members_room_user", "room_members", "room_name, user_id"),
        ("idx_meeting_sessions_room", "meeting_sessions", "room_name"),
        ("idx_library_items_room", "library_items", "room_name"),
        ("idx_library_items_session", "library_items", "session_id"),
        ("idx_report_cache_room", "meeting_report_cache", "room_name"),
        ("idx_todo_room", "todo_items", "room_name"),
        ("idx_todo_session", "todo_items", "session_id"),
        ("idx_calendar_room_scope", "calendar_events", "room_name, scope"),
        ("idx_calendar_owner_scope", "calendar_events", "owner_user_id, scope"),
        ("idx_transcript_session", "transcript_lines", "session_id"),
        ("idx_transcript_room", "transcript_lines", "room_name"),
    ]

    for idx_name, table, cols in indexes:
        if table_exists(cur, table):
            try:
                cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({cols})")
            except Exception as e:
                print(f"[WARN] index skipped {idx_name}: {e}")


def print_summary(cur):
    print("\n[MIGRATE] summary")

    tables = [
        "rooms",
        "room_members",
        "meeting_sessions",
        "library_items",
        "meeting_report_cache",
        "todo_items",
        "calendar_events",
        "transcript_lines",
    ]

    for table in tables:
        if not table_exists(cur, table):
            print(f"- {table}: missing")
            continue

        count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"- {table}: {count}")

        cols = get_columns(cur, table)
        if "room_name" in cols:
            rows = cur.execute(
                f"""
                SELECT COALESCE(room_name, 'NULL') AS room_name, COUNT(*)
                FROM {table}
                GROUP BY room_name
                ORDER BY COUNT(*) DESC
                """
            ).fetchall()
            for room_name, c in rows:
                print(f"    {room_name}: {c}")


def migrate():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    create_core_tables(cur)
    backfill_room_names(cur)
    ensure_rooms_from_sessions(cur)
    create_indexes(cur)

    conn.commit()
    print_summary(cur)
    conn.close()

    print("\n[MIGRATE] done")
    print("DB:", DB_PATH)


if __name__ == "__main__":
    migrate()

