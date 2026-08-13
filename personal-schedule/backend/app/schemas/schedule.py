from datetime import date, time, datetime
from pydantic import BaseModel, Field


class ScheduleBase(BaseModel):
    subject_id: int
    date: date
    start_time: time
    end_time: time
    status: str = Field("ACTIVE", pattern=r"^(ACTIVE|CANCELLED|MAKEUP)$")
    note: str | None = None


class ScheduleCreate(ScheduleBase):
    pass



class ScheduleUpdate(ScheduleBase):
    pass


class ScheduleRead(ScheduleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
