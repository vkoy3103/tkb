from datetime import date as dt_date, datetime, time as dt_time
from pydantic import BaseModel, Field


class WorkShiftBase(BaseModel):
    date: dt_date
    shift_type: str = Field(..., min_length=1)
    scheduled_start: dt_time
    scheduled_end: dt_time
    actual_start: dt_time | None = None
    actual_end: dt_time | None = None
    status: str = Field(default="scheduled")
    note: str | None = None


class WorkShiftCreate(BaseModel):
    date: dt_date
    shift_type: str = Field(..., min_length=1)
    scheduled_start: dt_time
    scheduled_end: dt_time
    actual_start: dt_time | None = None
    actual_end: dt_time | None = None
    status: str = Field(default="scheduled")
    note: str | None = None


class WorkShiftUpdate(BaseModel):
    date: dt_date | None = None
    shift_type: str | None = None
    scheduled_start: dt_time | None = None
    scheduled_end: dt_time | None = None
    actual_start: dt_time | None = None
    actual_end: dt_time | None = None
    status: str | None = None
    note: str | None = None


class WorkShiftRead(WorkShiftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkShiftExtrasUpdate(BaseModel):
    """Đồng bộ trạng thái + số giờ NPC/OT + số lần EXTEND của một ca trong 1 request."""

    status: str | None = None
    npc_hours: float | None = None
    ot_hours: float | None = None
    extend_count: float | None = None
