from fastapi import FastAPI
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware


from auth_api import router as auth_router
from room_api import router as room_router
from room_library_api import router as room_library_api
from meeting_report_api import router as meeting_report_api

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key="dev-secret-key"
)

app.include_router(auth_router)
app.include_router(room_router)
app.include_router(room_library_api)
app.include_router(meeting_report_api)




###수정 코드는 auth_api 랑 room_api 추가

# 기존(신우)
# from fastapi import FastAPI
# from pydantic import BaseModel
# from mindmap_generator import generate_mindmap

# app = FastAPI()

# class InputText(BaseModel):
#     text: str

# @app.post("/mindmap")
# def create_mindmap(data: InputText):
#     result = generate_mindmap(data.text)
#     return result