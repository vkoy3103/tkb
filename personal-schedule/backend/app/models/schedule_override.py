from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Text,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class ScheduleOverride(Base):
    __tablename__ = "schedule_overrides"

    id = Column(Integer, primary_key=True, index=True)

    class_schedule_id = Column(
        Integer,
        ForeignKey(
            "class_schedules.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    date = Column(Date, nullable=False)

    # CANCELLED / RESCHEDULED
    type = Column(String(30), nullable=False)

    new_date = Column(Date, nullable=True)
    new_start_period = Column(Integer, nullable=True)
    new_end_period = Column(Integer, nullable=True)
    new_room = Column(String(80), nullable=True)

    reason = Column(Text, nullable=True)
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

    class_schedule = relationship(
        "Schedule",
        back_populates="overrides"
    )