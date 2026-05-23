import sqlite3

FILTER_WORDS = {"네", "응", "음", "어", "아", "예"}

def build_ai_input(session_id: int = 1, db_path: str = "stt.sqlite3"):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    raw_speeches = cursor.execute("""
    SELECT speaker, text, start_sec, end_sec
    FROM transcript_segments
    WHERE session_id = ?
    ORDER BY start_sec
    """, (session_id,)).fetchall()

    silences = cursor.execute("""
    SELECT start_sec, end_sec, (end_sec - start_sec) AS duration, state
    FROM vad_events
    WHERE session_id = ?
    AND (end_sec - start_sec) > 10
    ORDER BY start_sec
    """, (session_id,)).fetchall()

    conn.close()

    filtered = []
    for speaker, text, start, end in raw_speeches:
        t = text.strip()

        if t in FILTER_WORDS:
            continue

        if len(t) <= 2:
            continue

        filtered.append((speaker, t, start, end))

    merged = []
    prev = None

    for row in filtered:
        speaker, text, start, end = row

        if prev:
            p_speaker, p_text, p_start, p_end = prev

            if speaker == p_speaker and (start - p_end) < 2:
                prev = (
                    p_speaker,
                    p_text + " " + text,
                    p_start,
                    end
                )
            else:
                merged.append(prev)
                prev = row
        else:
            prev = row

    if prev:
        merged.append(prev)

    ai_input = {
        "speeches": [
            {
                "speaker": speaker,
                "text": text,
                "start": start,
                "end": end
            }
            for speaker, text, start, end in merged
        ],
        "silences": [
            {
                "start": start,
                "end": end,
                "duration": duration,
                "state": state
            }
            for start, end, duration, state in silences
        ]
    }

    # print("--- [END] 최종 AI 입력 데이터 ---")
    # print(json.dumps(ai_input, indent=2, ensure_ascii=False))

    return ai_input