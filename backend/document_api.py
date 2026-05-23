from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
import uuid


from document_extractor import UniversalDocumentExtractor, InputSource
from database import get_db
import models

router = APIRouter()
extractor = UniversalDocumentExtractor()

# 파일 저장 폴더 설정
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/extract/")
async def extract_meeting_plan(
    file: Optional[UploadFile] = File(None),
    topic: Optional[str] = Form(None),
    time: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        if file and file.filename:
            unique_filename = f"{uuid.uuid4()}_{file.filename}"
            saved_file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            with open(saved_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            input_source = InputSource(saved_file_path, is_file=True)
            doc = extractor.process(input_source)
            
            new_record = models.MeetingRecord(
                input_type="file", original_filename=file.filename,
                saved_file_path=saved_file_path, extracted_text=doc.text
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
                
            return {"status": "success", "record_id": new_record.id, "type": "file", "text": doc.text}

        elif topic or keywords:
            combined_text = f"[회의 주제]: {topic}\n[회의 시간]: {time}\n[키워드]: {keywords}"
            input_source = InputSource(combined_text, is_file=False)
            doc = extractor.process(input_source)
            
            new_record = models.MeetingRecord(
                input_type="text", topic=topic, meeting_time=time,
                keywords=keywords, extracted_text=doc.text
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)
            
            return {"status": "success", "record_id": new_record.id, "type": "text", "text": doc.text}

        else:
            return {"status": "error", "message": "입력된 데이터가 없습니다."}

    except Exception as e:
        return {"status": "error", "message": str(e)}