from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class MeetingRecord(Base):
    __tablename__ = "meeting_records"

    id = Column(Integer, primary_key=True, index=True)
    input_type = Column(String)  # 'file' 또는 'text'
    
    original_filename = Column(String, nullable=True)
    saved_file_path = Column(String, nullable=True) 
    
    topic = Column(String, nullable=True)
    meeting_time = Column(String, nullable=True)
    keywords = Column(String, nullable=True)
    
    extracted_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)