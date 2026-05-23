import sqlite3
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from storage_paths import DATA_DIR, sanitize_room_name
from auth_api import get_login_user

router = APIRouter(prefix="/chat", tags=["Chat"])

DB_PATH = DATA_DIR / "meeting_app.sqlite3"


def conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def ensure_chat_tables():
    c = conn()
    cur = c.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            sender_user_id TEXT NOT NULL,
            target_type TEXT NOT NULL DEFAULT 'room',
            peer_user_id TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    c.commit()
    c.close()


def assert_room_member(c: sqlite3.Connection, room_name: str, user_id: str):
    member = c.execute(
        """
        SELECT *
        FROM room_members
        WHERE room_name = ? AND user_id = ?
        """,
        (room_name, user_id),
    ).fetchone()

    if not member:
        raise HTTPException(status_code=403, detail="이 방에 접근할 권한이 없습니다.")

    return member


def assert_peer_member(c: sqlite3.Connection, room_name: str, peer_user_id: str):
    peer = c.execute(
        """
        SELECT *
        FROM room_members
        WHERE room_name = ? AND user_id = ?
        """,
        (room_name, peer_user_id),
    ).fetchone()

    if not peer:
        raise HTTPException(status_code=404, detail="상대 사용자가 이 방의 멤버가 아닙니다.")

    return peer


class ChatSendPayload(BaseModel):
    content: str
    targetType: str = "room"  # room 또는 dm
    peerUserId: Optional[str] = None


class ChatAskPayload(BaseModel):
    targetType: str = "room"
    peerUserId: Optional[str] = None
    question: str = "이 채팅 내용을 요약하고 중요한 결정사항과 할 일을 정리해줘."


def row_to_message(row):
    return {
        "id": row["id"],
        "roomName": row["room_name"],
        "senderUserId": row["sender_user_id"],
        "senderName": row["sender_name"],
        "senderEmail": row["sender_email"],
        "senderPicture": row["sender_picture"],
        "targetType": row["target_type"],
        "peerUserId": row["peer_user_id"],
        "content": row["content"],
        "createdAt": row["created_at"],
    }


@router.get("/rooms/{room_name}/messages")
def list_messages(
    room_name: str,
    request: Request,
    targetType: str = "room",
    peerUserId: Optional[str] = None,
    limit: int = 100,
):
    ensure_chat_tables()

    user = get_login_user(request)
    user_id = user["id"]
    safe_room_name = sanitize_room_name(room_name)

    c = conn()
    assert_room_member(c, safe_room_name, user_id)

    limit = max(1, min(limit, 300))

    if targetType == "room":
        rows = c.execute(
            """
            SELECT m.*, u.name AS sender_name, u.email AS sender_email, u.picture AS sender_picture
            FROM chat_messages m
            LEFT JOIN users u ON m.sender_user_id = u.id
            WHERE m.room_name = ?
              AND m.target_type = 'room'
            ORDER BY m.created_at ASC
            LIMIT ?
            """,
            (safe_room_name, limit),
        ).fetchall()

    elif targetType == "dm":
        if not peerUserId:
            c.close()
            raise HTTPException(status_code=400, detail="DM 조회에는 peerUserId가 필요합니다.")

        assert_peer_member(c, safe_room_name, peerUserId)

        rows = c.execute(
            """
            SELECT m.*, u.name AS sender_name, u.email AS sender_email, u.picture AS sender_picture
            FROM chat_messages m
            LEFT JOIN users u ON m.sender_user_id = u.id
            WHERE m.room_name = ?
              AND m.target_type = 'dm'
              AND (
                (m.sender_user_id = ? AND m.peer_user_id = ?)
                OR
                (m.sender_user_id = ? AND m.peer_user_id = ?)
              )
            ORDER BY m.created_at ASC
            LIMIT ?
            """,
            (safe_room_name, user_id, peerUserId, peerUserId, user_id, limit),
        ).fetchall()

    else:
        c.close()
        raise HTTPException(status_code=400, detail="targetType은 room 또는 dm만 가능합니다.")

    c.close()

    return {
        "roomName": safe_room_name,
        "targetType": targetType,
        "peerUserId": peerUserId,
        "messages": [row_to_message(row) for row in rows],
    }


@router.post("/rooms/{room_name}/messages")
def send_message(room_name: str, payload: ChatSendPayload, request: Request):
    ensure_chat_tables()

    user = get_login_user(request)
    user_id = user["id"]
    safe_room_name = sanitize_room_name(room_name)

    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="메시지 내용이 비어 있습니다.")

    target_type = payload.targetType.strip().lower()
    if target_type not in ("room", "dm"):
        raise HTTPException(status_code=400, detail="targetType은 room 또는 dm만 가능합니다.")

    if target_type == "dm" and not payload.peerUserId:
        raise HTTPException(status_code=400, detail="DM 전송에는 peerUserId가 필요합니다.")

    now = datetime.now().isoformat()
    message_id = str(uuid.uuid4())

    c = conn()
    assert_room_member(c, safe_room_name, user_id)

    if target_type == "dm":
        assert_peer_member(c, safe_room_name, payload.peerUserId)

    c.execute(
        """
        INSERT INTO chat_messages (
            id, room_name, sender_user_id, target_type, peer_user_id, content, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            message_id,
            safe_room_name,
            user_id,
            target_type,
            payload.peerUserId if target_type == "dm" else None,
            content,
            now,
        ),
    )

    c.commit()

    row = c.execute(
        """
        SELECT m.*, u.name AS sender_name, u.email AS sender_email, u.picture AS sender_picture
        FROM chat_messages m
        LEFT JOIN users u ON m.sender_user_id = u.id
        WHERE m.id = ?
        """,
        (message_id,),
    ).fetchone()

    c.close()

    return {
        "ok": True,
        "message": row_to_message(row),
    }


@router.post("/rooms/{room_name}/ask")
def ask_chat_slm(room_name: str, payload: ChatAskPayload, request: Request):
    ensure_chat_tables()

    user = get_login_user(request)
    user_id = user["id"]
    safe_room_name = sanitize_room_name(room_name)

    target_type = payload.targetType.strip().lower()
    if target_type not in ("room", "dm"):
        raise HTTPException(status_code=400, detail="targetType은 room 또는 dm만 가능합니다.")

    c = conn()
    assert_room_member(c, safe_room_name, user_id)

    if target_type == "dm":
        if not payload.peerUserId:
            c.close()
            raise HTTPException(status_code=400, detail="DM 분석에는 peerUserId가 필요합니다.")
        assert_peer_member(c, safe_room_name, payload.peerUserId)

        rows = c.execute(
            """
            SELECT m.*, u.name AS sender_name, u.email AS sender_email
            FROM chat_messages m
            LEFT JOIN users u ON m.sender_user_id = u.id
            WHERE m.room_name = ?
              AND m.target_type = 'dm'
              AND (
                (m.sender_user_id = ? AND m.peer_user_id = ?)
                OR
                (m.sender_user_id = ? AND m.peer_user_id = ?)
              )
            ORDER BY m.created_at ASC
            LIMIT 200
            """,
            (safe_room_name, user_id, payload.peerUserId, payload.peerUserId, user_id),
        ).fetchall()

    else:
        rows = c.execute(
            """
            SELECT m.*, u.name AS sender_name, u.email AS sender_email
            FROM chat_messages m
            LEFT JOIN users u ON m.sender_user_id = u.id
            WHERE m.room_name = ?
              AND m.target_type = 'room'
            ORDER BY m.created_at ASC
            LIMIT 200
            """,
            (safe_room_name,),
        ).fetchall()

    c.close()

    if not rows:
        return {
            "answer": "아직 분석할 채팅 메시지가 없습니다.",
            "messageCount": 0,
        }

    transcript = "\n".join(
        [
            f"[{row['created_at']}] {row['sender_name'] or row['sender_email'] or row['sender_user_id']}: {row['content']}"
            for row in rows
        ]
    )

    prompt = f"""
너는 회의/팀 프로젝트 채팅을 분석하는 한국어 AI 어시스턴트다.

[분석 대상]
- 룸 이름: {safe_room_name}
- 채팅 종류: {target_type}
- 메시지 수: {len(rows)}

[사용자 질문]
{payload.question}

[채팅 로그]
{transcript}

[응답 형식]
1. 핵심 요약
2. 결정된 사항
3. 해야 할 일
4. 위험 요소 / 놓친 부분
5. 다음 회의에서 확인할 질문
"""

    try:
        from SLM_Loader import generate_response_by_model

        answer = generate_response_by_model(
            user_text=prompt,
            model_name="qwen",
            max_new_tokens=512,
            temperature=0.4,
            top_p=0.9,
        )
    except Exception as e:
        answer = (
            "SLM 호출에 실패했습니다. 대신 채팅 로그 일부를 반환합니다.\n\n"
            f"오류: {str(e)}\n\n"
            f"최근 채팅:\n{transcript[-2000:]}"
        )

    return {
        "answer": answer,
        "messageCount": len(rows),
    }
