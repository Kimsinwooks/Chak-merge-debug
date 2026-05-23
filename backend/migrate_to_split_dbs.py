import sqlite3
import os
import shutil
from pathlib import Path
import sys

# Add backend to path to import storage_paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from storage_paths import DATA_DIR, get_system_db_path, get_channel_db_path

OLD_DB_PATH = DATA_DIR / 'meeting_app.sqlite3'
SYSTEM_DB_PATH = get_system_db_path()

def get_conn(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(path)
    c.row_factory = sqlite3.Row
    return c

def table_exists(conn, table_name):
    return conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)).fetchone() is not None

def get_table_schema(conn, table_name):
    return conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table_name,)).fetchone()[0]

def migrate_global_tables():
    if not OLD_DB_PATH.exists():
        print("No meeting_app.sqlite3 found.")
        return

    old_conn = get_conn(OLD_DB_PATH)
    sys_conn = get_conn(SYSTEM_DB_PATH)

    global_tables = ['rooms', 'channels', 'room_members', 'room_invites', 'users']

    for table in global_tables:
        if not table_exists(old_conn, table):
            continue
        
        print(f"Migrating global table: {table}")
        schema = get_table_schema(old_conn, table)
        sys_conn.execute(schema)
        
        rows = old_conn.execute(f"SELECT * FROM {table}").fetchall()
        if not rows:
            continue
            
        cols = rows[0].keys()
        placeholders = ', '.join(['?'] * len(cols))
        col_names = ', '.join(cols)
        
        for row in rows:
            values = [row[k] for k in cols]
            try:
                sys_conn.execute(f"INSERT OR IGNORE INTO {table} ({col_names}) VALUES ({placeholders})", values)
            except Exception as e:
                print(f"Error inserting row in {table}: {e}")
                
    sys_conn.commit()
    sys_conn.close()

def migrate_channel_tables():
    if not OLD_DB_PATH.exists():
        return

    old_conn = get_conn(OLD_DB_PATH)
    
    channel_tables = [
        'calendar_events', 'todo_items', 'meeting_sessions', 
        'library_items', 'meeting_ai_events', 'meeting_report_cache', 
        'transcript_lines'
    ]

    for table in channel_tables:
        if not table_exists(old_conn, table):
            continue
            
        print(f"Migrating channel table: {table}")
        schema = get_table_schema(old_conn, table)
        rows = old_conn.execute(f"SELECT * FROM {table}").fetchall()
        
        # Group by room_name and channel_id
        grouped = {}
        for row in rows:
            room = row['room_name'] if 'room_name' in row.keys() and row['room_name'] else 'default_room'
            channel = row['channel_id'] if 'channel_id' in row.keys() and row['channel_id'] else 'default_channel'
            grouped.setdefault((room, channel), []).append(row)
            
        for (room, channel), group_rows in grouped.items():
            chan_db_path = get_channel_db_path(room, channel)
            chan_conn = get_conn(chan_db_path)
            
            chan_conn.execute(schema)
            
            if not group_rows:
                chan_conn.close()
                continue
                
            cols = group_rows[0].keys()
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join(cols)
            
            for row in group_rows:
                values = [row[k] for k in cols]
                try:
                    chan_conn.execute(f"INSERT OR IGNORE INTO {table} ({col_names}) VALUES ({placeholders})", values)
                except Exception as e:
                    pass
            
            chan_conn.commit()
            chan_conn.close()

    old_conn.close()

if __name__ == '__main__':
    print("Starting migration to split databases...")
    migrate_global_tables()
    migrate_channel_tables()
    # Rename old DB to .bak
    if OLD_DB_PATH.exists():
        import time
        OLD_DB_PATH.rename(DATA_DIR / f'meeting_app.sqlite3.bak.{int(time.time())}')
    print("Migration complete.")
