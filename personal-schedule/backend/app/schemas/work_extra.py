from datetime import datetime
from pydantic import BaseModel, Field


class WorkExtraBase(BaseModel):
    work_shift_id: int
    type: str = Field(..., pattern=r"^(NPC|OT|EXTEND)$")
    hours: float | None = None
    quantity: int | None = None
    note: str | None = None


class WorkExtraCreate(WorkExtraBase):
    pass


class WorkExtraUpdate(WorkExtraBase):
    pass


class WorkExtraRead(WorkExtraBase):
    id: int
    amount: int
    created_at: datetime

    class Config:
        orm_mode = True
