from fastapi import APIRouter
from query_test import build_ai_input

router = APIRouter()

@router.get("/query-test")
def query_test_result(session_id: int = 1):
    ai_input = build_ai_input(session_id=session_id)

    return {
        "session_id": session_id,
        "ai_input": ai_input
    }