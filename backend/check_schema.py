import sqlite3
conn = sqlite3.connect('data/meeting_app.sqlite3')
res = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='calendar_events'").fetchone()
if res:
    print(res[0])
else:
    print("Table not found")
