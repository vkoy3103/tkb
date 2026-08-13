from sqlalchemy import Column, Date, DateTime, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class WorkShift(Base):
    __tablename__ = "work_shifts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    shift_type = Column(String(30), nullable=True)
    scheduled_start = Column(Time, nullable=False)
    scheduled_end = Column(Time, nullable=False)
    actual_start = Column(Time, nullable=True)
    actual_end = Column(Time, nullable=True)
    status = Column(String(30), nullable=True, default="scheduled")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    extras = relationship("WorkExtra", cascade="all, delete-orphan", back_populates="shift")
