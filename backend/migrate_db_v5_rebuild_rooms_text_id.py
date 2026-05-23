import sqlite3
import shutil
import uuid
from pathlib import Path
from datetime import datetime

DB_PATH = Path("data/meeting_app.sqlite3")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

backup = DB_PATH.with_suffix(f".backup_rooms_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3")
if DB_PATH.exists():
    shutil.copy2(DB_PATH, backup)
    print("[BACKUP]", backup)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

def table_exists(name: str) -> bool:
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None

def columns(name: str):
    if not table_exists(name):
        return []
    return [r["name"] for r in cur.execute(f"PRAGMA table_info({name})").fetchall()]

def fetch_all_safe(name: str):
    if not table_exists(name):
        return []
    return cur.execute(f"SELECT * FROM {name}").fetchall()

old_rooms = fetch_all_safe("rooms")
old_members = fetch_all_safe("room_members")
old_invites = fetch_all_safe("room_invites")

print("[OLD] rooms:", len(old_rooms))
print("[OLD] room_members:", len(old_members))
print("[OLD] room_invites:", len(old_invites))

cur.execute("DROP TABLE IF EXISTS room_members")
cur.execute("DROP TABLE IF EXISTS room_invites")
cur.execute("DROP TABLE IF EXISTS rooms")

cur.execute("""
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    room_name TEXT UNIQUE NOT NULL,
    owner_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
)
""")

cur.execute("""
CREATE TABLE room_members (
    id TEXT PRIMARY KEY,
    room_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TEXT NOT NULL,
    UNIQUE(room_name, user_id)
)
""")

cur.execute("""
CREATE TABLE room_invites (
    id TEXT PRIMARY KEY,
    room_name TEXT NOT NULL,
    inviter_user_id TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
)
""")

now = datetime.now().isoformat()

for r in old_rooms:
    keys = set(r.keys())
    room_name = r["room_name"] if "room_name" in keys else r["roomName"] if "roomName" in keys else None
    if not room_name:
        continue

    room_id = str(r["id"]) if "id" in keys and r["id"] is not None else str(uuid.uuid4())
    owner_user_id = (
        str(r["owner_user_id"]) if "owner_user_id" in keys and r["owner_user_id"]
        else str(r["ownerUserId"]) if "ownerUserId" in keys and r["ownerUserId"]
        else "unknown"
    )
    created_at = str(r["created_at"]) if "created_at" in keys and r["created_at"] else now

    cur.execute(
        """
        INSERT OR IGNORE INTO rooms (id, room_name, owner_user_id, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (room_id, room_name, owner_user_id, created_at),
    )

for r in old_members:
    keys = set(r.keys())
    room_name = r["room_name"] if "room_name" in keys else None
    user_id = str(r["user_id"]) if "user_id" in keys and r["user_id"] else None
    if not room_name or not user_id:
        continue

    member_id = str(r["id"]) if "id" in keys and r["id"] is not None else str(uuid.uuid4())
    role = str(r["role"]) if "role" in keys and r["role"] else "member"
    created_at = str(r["created_at"]) if "created_at" in keys and r["created_at"] else now

    cur.execute(
        """
        INSERT OR IGNORE INTO room_members (id, room_name, user_id, role, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (member_id, room_name, user_id, role, created_at),
    )

for r in old_invites:
    keys = set(r.keys())
    room_name = r["room_name"] if "room_name" in keys else None
    inviter_user_id = str(r["inviter_user_id"]) if "inviter_user_id" in keys and r["inviter_user_id"] else None
    invite_code = str(r["invite_code"]) if "invite_code" in keys and r["invite_code"] else None
    if not room_name or not inviter_user_id or not invite_code:
        continue

    invite_id = str(r["id"]) if "id" in keys and r["id"] is not None else str(uuid.uuid4())
    status = str(r["status"]) if "status" in keys and r["status"] else "active"
    created_at = str(r["created_at"]) if "created_at" in keys and r["created_at"] else now

    cur.execute(
        """
        INSERT OR IGNORE INTO room_invites
        (id, room_name, inviter_user_id, invite_code, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (invite_id, room_name, inviter_user_id, invite_code, status, created_at),
    )

conn.commit()

print("\n[NEW SCHEMA]")
for t in ["rooms", "room_members", "room_invites"]:
    print("\n[" + t + "]")
    for c in cur.execute(f"PRAGMA table_info({t})").fetchall():
        print(c["name"], c["type"], "PK" if c["pk"] else "")

print("\n[COUNTS]")
for t in ["rooms", "room_members", "room_invites"]:
    cnt = cur.execute(f"SELECT COUNT(*) AS cnt FROM {t}").fetchone()["cnt"]
    print(t, cnt)

conn.close()
print("[DONE]")
