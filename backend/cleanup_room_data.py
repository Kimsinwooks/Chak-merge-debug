import shutil
import sqlite3
from pathlib import Path

ROOM = "test"
DELETE_ROOM_ROW = False
DELETE_ROOM_MEMBERS = False
DELETE_FILES = True

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def safe_remove_file(path_text: str):
    if not path_text:
        return

    try:
        p = Path(path_text).resolve()
        root = DATA_DIR.resolve()

        if not str(p).startswith(str(root)):
            print("[SKIP unsafe file]", p)
            return

        if p.exists() and p.is_file():
            p.unlink()
            print("[DELETE file]", p)
    except Exception as e:
        print("[WARN file]", path_text, e)


def safe_remove_dir(path_text: str):
    if not path_text:
        return

    try:
        p = Path(path_text).resolve()
        root = DATA_DIR.resolve()

        if not str(p).startswith(str(root)):
            print("[SKIP unsafe dir]", p)
            return

        if p.exists() and p.is_dir():
            shutil.rmtree(p)
            print("[DELETE dir]", p)
    except Exception as e:
        print("[WARN dir]", path_text, e)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    session_rows = cur.execute(
        """
        SELECT id
        FROM meeting_sessions
        WHERE room_name = ?
        """,
        (ROOM,),
    ).fetchall()

    session_ids = [r["id"] for r in session_rows]

    print("ROOM =", ROOM)
    print("session_ids =", session_ids)

    if not session_ids:
        print("삭제할 세션이 없습니다.")
        conn.close()
        return

    placeholders = ",".join(["?"] * len(session_ids))

    if DELETE_FILES:
        # library_items 파일 삭제
        item_rows = cur.execute(
            f"""
            SELECT file_path
            FROM library_items
            WHERE room_name = ?
               OR session_id IN ({placeholders})
            """,
            (ROOM, *session_ids),
        ).fetchall()

        for r in item_rows:
            safe_remove_file(r["file_path"])

        # report output_dir 삭제
        report_rows = cur.execute(
            f"""
            SELECT output_dir
            FROM meeting_report_cache
            WHERE room_name = ?
               OR session_id IN ({placeholders})
            """,
            (ROOM, *session_ids),
        ).fetchall()

        for r in report_rows:
            safe_remove_dir(r["output_dir"])

        # 업로드 오디오 폴더 삭제
        for sid in session_ids:
            safe_remove_dir(str(DATA_DIR / "uploaded_audio" / sid))
            safe_remove_dir(str(DATA_DIR / "meeting_outputs" / ROOM / sid))
            safe_remove_dir(str(DATA_DIR / ROOM / "sessions" / sid))

    # 연결 데이터 삭제
    cur.execute(
        f"""
        DELETE FROM library_items
        WHERE room_name = ?
           OR session_id IN ({placeholders})
        """,
        (ROOM, *session_ids),
    )
    print("[DELETE rows] library_items =", cur.rowcount)

    cur.execute(
        f"""
        DELETE FROM meeting_report_cache
        WHERE room_name = ?
           OR session_id IN ({placeholders})
        """,
        (ROOM, *session_ids),
    )
    print("[DELETE rows] meeting_report_cache =", cur.rowcount)

    cur.execute(
        f"""
        DELETE FROM todo_items
        WHERE room_name = ?
           OR session_id IN ({placeholders})
        """,
        (ROOM, *session_ids),
    )
    print("[DELETE rows] todo_items =", cur.rowcount)

    cur.execute(
        f"""
        DELETE FROM calendar_events
        WHERE room_name = ?
           OR source_session_id IN ({placeholders})
        """,
        (ROOM, *session_ids),
    )
    print("[DELETE rows] calendar_events =", cur.rowcount)

    cur.execute(
        f"""
        DELETE FROM transcript_lines
        WHERE room_name = ?
           OR session_id IN ({placeholders})
        """,
        (ROOM, *session_ids),
    )
    print("[DELETE rows] transcript_lines =", cur.rowcount)

    cur.execute(
        f"""
        DELETE FROM meeting_ai_events
        WHERE session_id IN ({placeholders})
        """,
        tuple(session_ids),
    )
    print("[DELETE rows] meeting_ai_events =", cur.rowcount)

    cur.execute(
        """
        DELETE FROM meeting_sessions
        WHERE room_name = ?
        """,
        (ROOM,),
    )
    print("[DELETE rows] meeting_sessions =", cur.rowcount)

    if DELETE_ROOM_MEMBERS:
        cur.execute(
            """
            DELETE FROM room_members
            WHERE room_name = ?
            """,
            (ROOM,),
        )
        print("[DELETE rows] room_members =", cur.rowcount)

    if DELETE_ROOM_ROW:
        cur.execute(
            """
            DELETE FROM rooms
            WHERE room_name = ?
            """,
            (ROOM,),
        )
        print("[DELETE rows] rooms =", cur.rowcount)

    conn.commit()
    conn.close()

    print("\nDONE")


if __name__ == "__main__":
    main()
