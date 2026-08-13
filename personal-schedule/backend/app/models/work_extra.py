from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class WorkExtra(Base):
    __tablename__ = "work_extras"

    id = Column(Integer, primary_key=True, index=True)
    work_shift_id = Column(Integer, ForeignKey("work_shifts.id", ondelete="CASCADE"), nullable=False)
    extra_type_id = Column(
        Integer,
        ForeignKey("work_extra_types.id"),
        nullable=False,
    )
    quantity = Column(Integer, nullable=True, default=0)
    unit_price = Column(Float, nullable=True, default=0.0)
    amount = Column(Integer, nullable=False, default=0)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    shift = relationship("WorkShift", back_populates="extras")
    extra_type = relationship("WorkExtraType", back_populates="extras")
