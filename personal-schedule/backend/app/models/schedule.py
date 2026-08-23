from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Schedule(Base):
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False
    )

    weekday = Column(Integer, nullable=False)
    # Có 2 chế độ lưu thời gian: theo TIẾT (start_period/end_period) hoặc theo GIỜ (start_time/end_time).
    # Một lịch chỉ dùng 1 chế độ; chế độ kia để NULL.
    start_period = Column(Integer, nullable=True)
    end_period = Column(Integer, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    room = Column(String(80), nullable=True)

    week_start = Column(Integer, nullable=True)
    week_end = Column(Integer, nullable=True)

    note = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    subject = relationship("Subject")

    overrides = relationship(
        "ScheduleOverride",
        back_populates="class_schedule",
        cascade="all, delete-orphan"
    )