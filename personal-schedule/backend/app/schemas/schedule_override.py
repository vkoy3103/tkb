from datetime import date as date_type, datetime

from pydantic import BaseModel, Field


class ScheduleOverrideBase(BaseModel):
    class_schedule_id: int
    date: date_type
    type: str = Field(..., min_length=1, max_length=30)
    new_date: date_type | None = None
    new_start_period: int | None = Field(default=None, ge=1)
    new_end_period: int | None = Field(default=None, ge=1)
    new_room: str | None = None
    reason: str | None = None
    note: str | None = None


class ScheduleOverrideCreate(ScheduleOverrideBase):
    pass


class ScheduleOverrideUpdate(BaseModel):
    class_schedule_id: int | None = None
    date: date_type | None = None
    type: str | None = Field(default=None, min_length=1, max_length=30)
    new_date: date_type | None = None
    new_start_period: int | None = Field(default=None, ge=1)
    new_end_period: int | None = Field(default=None, ge=1)
    new_room: str | None = None
    reason: str | None = None
    note: str | None = None


class ScheduleOverrideRead(ScheduleOverrideBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
