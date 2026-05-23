from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/mindmap", tags=["Mindmap Disabled"])

@router.get("/health")
def mindmap_disabled_health():
    return {
        "enabled": False,
        "message": "Mindmap feature is disabled. Use To-Do and Calendar instead.",
    }

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def mindmap_disabled(path: str):
    raise HTTPException(
        status_code=410,
        detail="Mindmap feature has been removed. Use To-Do and Calendar instead.",
    )
