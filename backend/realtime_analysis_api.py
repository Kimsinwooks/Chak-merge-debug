# backend/realtime_analysis_api.py

import sqlite3
from pathlib import Path

import torch
from fastapi import APIRouter

from SLM_Loader import load_qwen
from storage_paths import get_live_db_path, sanitize_room_name

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MEETING_APP_DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def get_room_name_by_session_id_for_topic(session_id: str) -> str:
    """
    meeting_app.sqlite3에서 session_id에 해당하는 room_name을 찾는다.
    """
    if not MEETING_APP_DB_PATH.exists():
        return "default_room"

    conn = sqlite3.connect(MEETING_APP_DB_PATH)
    conn.row_factory = sqlite3.Row

    row = conn.execute(
        """
        SELECT room_name
        FROM meeting_sessions
        WHERE id = ?
        """,
        (session_id,),
    ).fetchone()

    conn.close()

    if not row:
        return "default_room"

    return sanitize_room_name(row["room_name"] or "default_room")


def get_recent_live_text_by_session_id(session_id: str, seconds: int = 180) -> str:
    """
    실제 실시간 STT가 저장되는 live_recordings.sqlite3의 live_transcripts를 읽는다.
    오른쪽 STT 패널과 같은 저장소를 보도록 맞춘다.
    """
    room_name = get_room_name_by_session_id_for_topic(session_id)
    live_db_path = get_live_db_path(room_name, session_id)

    if not live_db_path.exists():
        return ""

    conn = sqlite3.connect(live_db_path)
    conn.row_factory = sqlite3.Row

    max_row = conn.execute(
        """
        SELECT MAX(end_sec) AS max_end
        FROM live_transcripts
        WHERE session_id = ?
        """,
        (session_id,),
    ).fetchone()

    max_end = float(max_row["max_end"] or 0)

    if max_end <= 0:
        rows = conn.execute(
            """
            SELECT speaker, text, start_sec, end_sec, created_at
            FROM live_transcripts
            WHERE session_id = ?
            ORDER BY created_at ASC
            LIMIT 12
            """,
            (session_id,),
        ).fetchall()
    else:
        start_boundary = max(0, max_end - seconds)

        rows = conn.execute(
            """
            SELECT speaker, text, start_sec, end_sec, created_at
            FROM live_transcripts
            WHERE session_id = ?
              AND end_sec >= ?
            ORDER BY start_sec ASC, created_at ASC
            """,
            (session_id, start_boundary),
        ).fetchall()

    conn.close()

    lines = []
    for row in rows:
        speaker = row["speaker"] or "익명1"
        text = row["text"] or ""

        if text.strip():
            lines.append(f"{speaker}: {text.strip()}")

    return "\n".join(lines)


def generate_topic_with_qwen(recent_context: str, seconds: int = 180) -> str:
    model, tokenizer = load_qwen()

    try:
        device = next(model.parameters()).device
    except StopIteration:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model.eval()

    prompt = (
        "<|im_start|>system\n"
        "너는 실시간 회의 주제 분석기다. "
        "최근 회의 STT를 보고 현재 논의 중인 핵심 주제를 한국어 한 문장으로 요약한다. "
        "너무 길게 쓰지 말고 15~35자 정도로 출력한다. "
        "불필요한 설명 없이 주제만 출력한다."
        "<|im_end|>\n"
        f"<|im_start|>user\n"
        f"[최근 {seconds}초 회의 STT]\n"
        f"{recent_context[-3000:]}\n\n"
        f"현재 회의 주제는?"
        f"<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=2048,
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=40,
            temperature=0.1,
            do_sample=False,
            repetition_penalty=1.2,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    decoded = tokenizer.decode(output_ids[0], skip_special_tokens=True)

    if "assistant\n" in decoded:
        topic = decoded.split("assistant\n")[-1].strip()
    else:
        topic = decoded.replace(prompt, "").strip()

    topic = topic.splitlines()[0].strip()

    return topic or "실시간 회의 내용 분석 중"


@router.get("/api/realtime-topic")
async def get_realtime_topic(session_id: str | None = None, seconds: int = 180):
    if not session_id:
        return {
            "topic": "세션 없음",
            "currentTopic": "세션 없음",
            "summary": "session_id가 없어 실시간 주제 분석을 할 수 없습니다.",
        }

    recent_context = get_recent_live_text_by_session_id(session_id, seconds)

    if not recent_context.strip():
        return {
            "topic": "실시간 STT 대기 중",
            "currentTopic": "실시간 STT 대기 중",
            "summary": "아직 분석할 회의 발화가 없습니다.",
            "sessionId": session_id,
        }

    if len(recent_context.strip()) < 50:
        return {
            "topic": "회의 발화 수집 중",
            "currentTopic": "회의 발화 수집 중",
            "summary": recent_context[-500:],
            "sessionId": session_id,
            "seconds": seconds,
        }

    try:
        topic = generate_topic_with_qwen(recent_context, seconds)
    except Exception as e:
        print(f"[WARN] realtime topic generation failed: {e}")
        topic = "실시간 회의 내용 분석 중"

    return {
        "topic": topic,
        "currentTopic": topic,
        "summary": recent_context[-500:],
        "sessionId": session_id,
        "seconds": seconds,
    }