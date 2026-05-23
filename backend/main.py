try:
    from hwp_template_report_api import router as hwp_template_report_router
except Exception as e:
    hwp_template_report_router = None
    print(f"[WARN] hwp_template_report_api import failed: {e}")

import os
from pathlib import Path
from typing import Optional as FinalOptional

import requests as final_requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException as FinalHTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel as FinalBaseModel
from starlette.middleware.sessions import SessionMiddleware

import app_config


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def env_or_config(name: str, default: str = "") -> str:
    value = os.getenv(name)

    if value is not None and str(value).strip() != "":
        return str(value)

    cfg_value = getattr(app_config, name, None)

    if cfg_value is not None and str(cfg_value).strip() != "":
        return str(cfg_value)

    return default


# ============================================================
# Runtime config
# ============================================================
os.environ["OLLAMA_BASE_URL"] = env_or_config(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
)

os.environ["GENERAL_SLM_MODEL"] = env_or_config(
    "GENERAL_SLM_MODEL",
    "qwen2.5:3b",
)

os.environ["REALTIME_SLM_MODEL"] = env_or_config(
    "REALTIME_SLM_MODEL",
    "qwen2.5:3b",
)

os.environ["REPORT_SLM_MODEL"] = env_or_config(
    "REPORT_SLM_MODEL",
    "gemma3:27b",
)

os.environ["QWEN_OLLAMA_MODEL_NAME"] = env_or_config(
    "QWEN_OLLAMA_MODEL_NAME",
    "qwen2.5:3b",
)

os.environ["GEMMA_MODEL_NAME"] = env_or_config(
    "GEMMA_MODEL_NAME",
    "gemma3:27b",
)

os.environ["WHISPER_REALTIME_MODEL_NAME"] = env_or_config(
    "WHISPER_REALTIME_MODEL_NAME",
    "base",
)

os.environ["WHISPER_UPLOAD_MODEL_NAME"] = env_or_config(
    "WHISPER_UPLOAD_MODEL_NAME",
    "medium",
)

os.environ["WEB_SEARCH_PROVIDER"] = env_or_config(
    "WEB_SEARCH_PROVIDER",
    "serpapi",
)

os.environ["SERPAPI_API_KEY"] = env_or_config(
    "SERPAPI_API_KEY",
    "",
)

os.environ["SERPAPI_ENGINE"] = env_or_config(
    "SERPAPI_ENGINE",
    "google",
)

os.environ["SERPAPI_GL"] = env_or_config(
    "SERPAPI_GL",
    "kr",
)

os.environ["SERPAPI_HL"] = env_or_config(
    "SERPAPI_HL",
    "ko",
)

os.environ["SERPAPI_LOCATION"] = env_or_config(
    "SERPAPI_LOCATION",
    "South Korea",
)


# ============================================================
# Router imports
# ============================================================
try:
    from SLM_Loader import router as slm_router
except Exception as e:
    slm_router = None
    print(f"[WARN] SLM_Loader import failed: {e}")

try:
    from database import engine
    import models

    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARN] DB init skipped: {e}")

try:
    from mindmap_api import router as mindmap_router
except Exception as e:
    mindmap_router = None
    print(f"[WARN] mindmap_api import failed: {e}")

stt_router = None

try:
    from query_test_api import router as query_test_router
except Exception as e:
    query_test_router = None
    print(f"[WARN] query_test_api import failed: {e}")

try:
    from document_api import router as document_router
except Exception as e:
    document_router = None
    print(f"[WARN] document_api import failed: {e}")

try:
    from realtime_analysis_api import router as realtime_router
except Exception as e:
    realtime_router = None
    print(f"[WARN] realtime_analysis_api import failed: {e}")

try:
    from meeting_report_api import router as meeting_report_router
except Exception as e:
    meeting_report_router = None
    print(f"[WARN] meeting_report_api import failed: {e}")

try:
    from chak_runtime_api import app as chak_runtime_app
except Exception as e:
    chak_runtime_app = None
    print(f"[WARN] chak_runtime_api import failed: {e}")

try:
    from runtime_routes import router as runtime_router
except Exception as e:
    runtime_router = None
    print(f"[WARN] runtime_routes import failed: {e}")

try:
    from room_api import router as room_router
except Exception as e:
    room_router = None
    print(f"[WARN] room_api import failed: {e}")

try:
    from room_library_api import router as room_library_router
except Exception as e:
    room_library_router = None
    print(f"[WARN] room_library_api import failed: {e}")

try:
    from room_admin_api import router as room_admin_router
except Exception as e:
    room_admin_router = None
    print(f"[WARN] room_admin_api import failed: {e}")

try:
    from todo_calendar_api import router as todo_calendar_router
except Exception as e:
    todo_calendar_router = None
    print(f"[WARN] todo_calendar_api import failed: {e}")

try:
    from calendar_api import router as calendar_router
except Exception as e:
    calendar_router = None
    print(f"[WARN] calendar_api import failed: {e}")

try:
    from auth_api import router as auth_router
except Exception as e:
    auth_router = None
    print(f"[WARN] auth_api import failed: {e}")

try:
    from chat_api import router as chat_router
except Exception as e:
    chat_router = None
    print(f"[WARN] chat_api import failed: {e}")


# ============================================================
# FastAPI app
# ============================================================
app = FastAPI(title="ChakChak homepage backend")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-change-me"),
    same_site="lax",
    https_only=False,
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://freehand-envoy-platinum.ngrok-free.dev",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://freehand-envoy-platinum.ngrok-free.dev",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    serpapi_key = os.getenv("SERPAPI_API_KEY", "")

    return {
        "message": "ChakChak backend running",
        "general_slm_model": os.getenv("GENERAL_SLM_MODEL"),
        "realtime_slm_model": os.getenv("REALTIME_SLM_MODEL"),
        "report_slm_model": os.getenv("REPORT_SLM_MODEL"),
        "whisper_realtime_model": os.getenv("WHISPER_REALTIME_MODEL_NAME"),
        "whisper_upload_model": os.getenv("WHISPER_UPLOAD_MODEL_NAME"),
        "web_search_provider": os.getenv("WEB_SEARCH_PROVIDER"),
        "serpapi_engine": os.getenv("SERPAPI_ENGINE"),
        "serpapi_gl": os.getenv("SERPAPI_GL"),
        "serpapi_hl": os.getenv("SERPAPI_HL"),
        "serpapi_location": os.getenv("SERPAPI_LOCATION"),
        "has_serpapi_key": bool(serpapi_key and "여기에" not in serpapi_key),
    }


@app.get("/base-health")
def base_health():
    serpapi_key = os.getenv("SERPAPI_API_KEY", "")

    return {
        "message": "ChakChak backend health",
        "realtime_topic": realtime_router is not None,
        "meeting_report": meeting_report_router is not None,
        "chak_runtime": chak_runtime_app is not None,
        "document": document_router is not None,
        "stt": stt_router is not None,
        "mindmap": mindmap_router is not None,
        "auth": auth_router is not None,
        "rooms": room_router is not None,
        "roomLibrary": room_library_router is not None,
        "roomAdmin": room_admin_router is not None,
        "todoCalendar": todo_calendar_router is not None,
        "chat": chat_router is not None,
        "calendar": calendar_router is not None,
        "webSearch": {
            "provider": os.getenv("WEB_SEARCH_PROVIDER"),
            "hasSerpApiKey": bool(serpapi_key and "여기에" not in serpapi_key),
            "engine": os.getenv("SERPAPI_ENGINE"),
            "gl": os.getenv("SERPAPI_GL"),
            "hl": os.getenv("SERPAPI_HL"),
            "location": os.getenv("SERPAPI_LOCATION"),
        },
    }


# ============================================================
# Include routers
# ============================================================
if auth_router is not None:
    app.include_router(auth_router)

if mindmap_router is not None:
    app.include_router(mindmap_router)

# if stt_router is not None:
#     app.include_router(stt_router)

if slm_router is not None:
    app.include_router(slm_router)

if query_test_router is not None:
    app.include_router(query_test_router)

if document_router is not None:
    app.include_router(document_router, prefix="/api/document", tags=["Document"])

# if realtime_router is not None:
#     app.include_router(realtime_router)

if hwp_template_report_router is not None:
    app.include_router(hwp_template_report_router)

if meeting_report_router is not None:
    app.include_router(meeting_report_router)

# chak_runtime_app의 meeting/session, library/global, ai/chat 라우트 병합
if chak_runtime_app is not None:
    for route in chak_runtime_app.router.routes:
        exists = any(
            getattr(r, "path", None) == getattr(route, "path", None)
            and getattr(r, "methods", None) == getattr(route, "methods", None)
            for r in app.router.routes
        )
        if not exists:
            app.router.routes.append(route)

if runtime_router is not None:
    app.include_router(runtime_router)

if room_router is not None:
    app.include_router(room_router)

if room_library_router is not None:
    app.include_router(room_library_router)

if room_admin_router is not None:
    app.include_router(room_admin_router)

if todo_calendar_router is not None:
    app.include_router(todo_calendar_router)

if chat_router is not None:
    app.include_router(chat_router)

if calendar_router is not None:
    app.include_router(calendar_router)


# ============================================================
# FINAL /ai/chat SERPAPI OVERRIDE
# ============================================================
class FinalAIChatRequest(FinalBaseModel):
    message: str = ""
    text: str = ""
    meetingText: str = ""
    mode: str = "general"
    useWeb: bool = False
    sessionId: FinalOptional[str] = None
    meetingType: str = ""
    meetingTitle: str = ""
    keywords: str = ""
    purpose: str = "chat"
    meta: dict = {}


def final_remove_route(path: str, method: str = "POST"):
    new_routes = []

    for route in app.router.routes:
        route_path = getattr(route, "path", None)
        route_methods = set(getattr(route, "methods", []) or [])

        if route_path == path and method in route_methods:
            print(f"[FINAL_ROUTE_OVERRIDE] removed existing route: {method} {path}")
            continue

        new_routes.append(route)

    app.router.routes = new_routes


def final_serpapi_search(query: str, use_web: bool) -> str:
    if not use_web:
        print("[FINAL_WEB_SEARCH] disabled")
        return ""

    provider = os.getenv("WEB_SEARCH_PROVIDER", "serpapi").lower()
    api_key = os.getenv("SERPAPI_API_KEY", "")
    engine = os.getenv("SERPAPI_ENGINE", "google")
    gl = os.getenv("SERPAPI_GL", "kr")
    hl = os.getenv("SERPAPI_HL", "ko")
    location = os.getenv("SERPAPI_LOCATION", "South Korea")

    if provider != "serpapi":
        print(f"[FINAL_WEB_SEARCH] provider disabled: {provider}")
        return ""

    if not api_key:
        print("[FINAL_WEB_SEARCH] SERPAPI_API_KEY missing")
        return ""

    try:
        res = final_requests.get(
            "https://serpapi.com/search.json",
            params={
                "engine": engine,
                "q": query,
                "api_key": api_key,
                "hl": hl,
                "gl": gl,
                "location": location,
                "num": 5,
            },
            timeout=20,
        )
        res.raise_for_status()
        data = res.json()

        parts = []

        answer_box = data.get("answer_box") or {}
        if isinstance(answer_box, dict):
            for key in ["title", "answer", "snippet", "result"]:
                value = answer_box.get(key)
                if value:
                    parts.append(f"[answer_box:{key}] {value}")

        knowledge_graph = data.get("knowledge_graph") or {}
        if isinstance(knowledge_graph, dict):
            for key in ["title", "type", "description"]:
                value = knowledge_graph.get(key)
                if value:
                    parts.append(f"[knowledge_graph:{key}] {value}")

            attrs = knowledge_graph.get("attributes") or {}
            if isinstance(attrs, dict):
                for attr_key, attr_value in attrs.items():
                    parts.append(
                        f"[knowledge_graph:attribute] {attr_key}: {attr_value}"
                    )

        organic = data.get("organic_results") or []
        for item in organic[:5]:
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            link = item.get("link", "")
            source = item.get("source", "")
            parts.append(
                f"[organic] title={title} source={source} link={link} snippet={snippet}"
            )

        related = data.get("related_questions") or []
        for item in related[:3]:
            question = item.get("question", "")
            snippet = item.get("snippet", "")
            if question or snippet:
                parts.append(f"[related_question] {question} {snippet}".strip())

        result = "\n".join([p for p in parts if p]).strip()

        print(
            "[FINAL_WEB_SEARCH]",
            f"enabled=True",
            f"query={query}",
            f"result_len={len(result)}",
        )

        return result

    except Exception as e:
        print(f"[FINAL_WEB_SEARCH] failed: {e}")
        return f"웹검색 실패: {str(e)}"


def final_call_ai(system_prompt: str, user_prompt: str, model_name: str) -> str:
    try:
        from chak_runtime_api import call_ollama_chat

        return call_ollama_chat(model_name, system_prompt, user_prompt)
    except Exception as e1:
        print(f"[FINAL_AI_CHAT] call_ollama_chat failed: {e1}")

    from SLM_Loader import generate_response_by_model

    return generate_response_by_model(
        user_text=f"{system_prompt}\n\n{user_prompt}",
        model_name=model_name,
        max_new_tokens=512,
        temperature=0.4,
        top_p=0.9,
    )


final_remove_route("/ai/chat", "POST")


@app.post("/ai/chat")
def final_ai_chat(payload: FinalAIChatRequest):
    user_msg = (payload.message or payload.text or "").strip()

    if not user_msg:
        raise FinalHTTPException(status_code=400, detail="질문이 비어 있습니다.")

    meta = payload.meta if isinstance(payload.meta, dict) else {}
    use_web = bool(payload.useWeb) or bool(meta.get("useWeb", False))

    session_id = payload.sessionId or meta.get("sessionId")
    meeting_title = payload.meetingTitle or meta.get("meetingTitle", "")
    meeting_type = payload.meetingType or meta.get("meetingType", "")
    keywords = payload.keywords or meta.get("keywords", "")

    meeting_text = payload.meetingText or ""

    if session_id and not meeting_text:
        try:
            from session_db import read_live_transcript_text_by_session_id

            meeting_text = read_live_transcript_text_by_session_id(session_id) or ""
        except Exception:
            meeting_text = ""

    web_query = f"{meeting_title} {keywords} {user_msg}".strip()
    web_context = final_serpapi_search(web_query, use_web)

    mode = (payload.mode or "general").lower().strip()

    if mode == "realtime":
        model_name = os.getenv("REALTIME_SLM_MODEL", "qwen2.5:3b")
    else:
        model_name = os.getenv("GENERAL_SLM_MODEL", "qwen2.5:3b")

    print(
        "[FINAL_AI_CHAT]",
        f"use_web={use_web}",
        f"web_context_len={len(web_context or '')}",
        f"session_id={session_id}",
        f"model={model_name}",
        f"msg={user_msg}",
    )

    system_prompt = """
너는 회의 보조 AI다.

규칙:
1. 반드시 한국어로 답변한다.
2. 웹검색 사용 여부가 true이고 웹검색 결과가 있으면, 웹검색 결과를 최우선 근거로 사용한다.
3. 웹검색 결과를 사용한 경우 답변 첫머리에 "웹검색 기준으로는,"이라고 쓴다.
4. 웹검색 결과가 없으면 최신 정보나 현재 정보를 안다고 단정하지 않는다.
5. 근거가 부족하면 근거가 부족하다고 말한다.
6. 사실을 지어내지 않는다.
""".strip()

    user_prompt = f"""
[회의 제목]
{meeting_title or "(없음)"}

[회의 종류]
{meeting_type or "(없음)"}

[키워드]
{keywords or "(없음)"}

[웹검색 사용 여부]
{use_web}

[웹검색 결과]
{web_context or "(웹검색 결과 없음)"}

[회의 STT]
{meeting_text[-12000:] if meeting_text else "(아직 STT 없음)"}

[사용자 질문]
{user_msg}
""".strip()

    try:
        answer = final_call_ai(system_prompt, user_prompt, model_name)
    except Exception as e:
        raise FinalHTTPException(status_code=500, detail=f"AI 응답 생성 실패: {str(e)}")

    return {
        "answer": answer,
        "message": answer,
        "response": answer,
        "usedWeb": use_web,
        "webContextLength": len(web_context or ""),
        "model": model_name,
    }


@app.get("/debug/web-search")
def final_debug_web_search(q: str = "한림대학교 위치"):
    result = final_serpapi_search(q, True)

    return {
        "ok": bool(result),
        "query": q,
        "provider": os.getenv("WEB_SEARCH_PROVIDER", "serpapi"),
        "hasSerpApiKey": bool(os.getenv("SERPAPI_API_KEY", "")),
        "resultLength": len(result or ""),
        "resultPreview": (result or "")[:2000],
    }
# ============================================================
# Final override: clean meeting session create route
# - removes duplicated /meeting/session/create routes
# - accepts both camelCase and snake_case payloads
# ============================================================
try:
    from meeting_session_create_override import install_meeting_session_create_override
    install_meeting_session_create_override(app)
except Exception as e:
    print(f"[WARN] meeting_session_create_override install failed: {e}")
