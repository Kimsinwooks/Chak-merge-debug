import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. 파일 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "meeting.sqlite3")

# 2. 누락되었던 DATABASE_URL 정의 (sqlite 형식에 맞게 문자열 조합)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 3. 엔진 생성 (SQLite는 check_same_thread=False가 필수입니다)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 4. 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. 모델의 기본 클래스
Base = declarative_base()

# 6. DB 세션 의존성 주입 함수 (FastAPI에서 주로 사용)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()