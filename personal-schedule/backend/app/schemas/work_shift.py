from datetime import date, time, datetime
from pydantic import BaseModel, Field


class WorkShiftBase(BaseModel):
    date: date
    shift_number: int = Field(..., ge=1, le=3)
    scheduled_start: time
    scheduled_end: time
    actual_start: time
    actual_end: time
    note: str | None = None


class WorkShiftCreate(BaseModel):
    date: date
    shift_number: int = Field(..., ge=1, le=3)
    actual_start: time
    actual_end: time
    note: str | None = None


class WorkShiftUpdate(WorkShiftCreate):
    pass


class WorkShiftRead(WorkShiftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
