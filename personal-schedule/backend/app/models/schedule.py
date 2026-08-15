from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Schedule(Base):
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)

    subject_id = Column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False
    )

    weekday = Column(Integer, nullable=False)
    start_period = Column(Integer, nullable=False)
    end_period = Column(Integer, nullable=False)

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