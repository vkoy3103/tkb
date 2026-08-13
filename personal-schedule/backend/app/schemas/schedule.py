from datetime import datetime
from pydantic import BaseModel, Field


class ScheduleBase(BaseModel):
    subject_id: int
    weekday: int = Field(..., ge=1, le=7)
    start_period: int = Field(..., ge=1)
    end_period: int = Field(..., ge=1)
    room: str | None = None
    week_start: int | None = None
    week_end: int | None = None
    note: str | None = None


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    subject_id: int | None = None
    weekday: int | None = Field(default=None, ge=1, le=7)
    start_period: int | None = Field(default=None, ge=1)
    end_period: int | None = Field(default=None, ge=1)
    room: str | None = None
    week_start: int | None = None
    week_end: int | None = None
    note: str | None = None


class ScheduleRead(ScheduleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
