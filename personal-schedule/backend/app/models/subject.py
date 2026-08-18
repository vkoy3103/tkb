from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(60), nullable=True)
    name = Column(String(120), nullable=False)
    credits = Column(Float, default=0, nullable=False)
    teacher = Column(String(120), nullable=True)
    default_room = Column(String(80), nullable=True)
    color = Column(String(30), nullable=True)
    week_start = Column(Integer, nullable=True)
    week_end = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
