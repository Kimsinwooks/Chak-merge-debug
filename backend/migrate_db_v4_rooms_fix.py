import sqlite3
from pathlib import Path
from datetime import datetime

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "meeting_app.sqlite3"
DATA_DIR.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT UNIQUE NOT NULL,
    owner_user_id TEXT,
    created_at TEXT NOT NULL,
    invite_code TEXT
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TEXT NOT NULL,
    email TEXT,
    name TEXT,
    picture TEXT,
    joined_at TEXT,
    UNIQUE(room_name, user_id)
)
""")

cur.execute("CREATE INDEX IF NOT EXISTS idx_rooms_room_name ON rooms(room_name)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_room_members_room_name ON room_members(room_name)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id)")

conn.commit()

print("[MIGRATE] rooms and room_members ready")
for table in ["rooms", "room_members"]:
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    print(table, "OK" if row else "MISSING")

conn.close()
print("DB:", DB_PATH)
