from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.sql import func

from app.database import Base


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    normal_rate = Column(Integer, nullable=False, default=20000)
    npc_rate = Column(Integer, nullable=False, default=20000)
    ot_rate = Column(Integer, nullable=False, default=40000)
    extend_rate = Column(Integer, nullable=False, default=50000)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
