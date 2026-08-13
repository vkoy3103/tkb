from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from sqlalchemy.orm import relationship

from app.database import Base


class WorkExtraType(Base):
    __tablename__ = "work_extra_types"

    id = Column(Integer, primary_key=True, index=True)

    code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    unit = Column(
        String(20),
        nullable=False,
    )

    # FIXED hoặc MULTIPLIER
    rate_type = Column(
        String(20),
        nullable=False,
    )

    # FIXED: số tiền
    # MULTIPLIER: hệ số
    rate_value = Column(
        Float,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    extras = relationship(
        "WorkExtra",
        back_populates="extra_type",
    )