from datetime import datetime, time as dt_time
from pydantic import BaseModel, Field


class WorkExtraBase(BaseModel):
    work_shift_id: int
    type: str = Field(..., min_length=1)
    quantity: int | None = None
    unit_price: float | None = None
    amount: int | None = None
    start_time: dt_time | None = None
    end_time: dt_time | None = None
    note: str | None = None


class WorkExtraCreate(WorkExtraBase):
    pass


class WorkExtraUpdate(BaseModel):
    work_shift_id: int | None = None
    type: str | None = None
    quantity: int | None = None
    unit_price: float | None = None
    amount: int | None = None
    start_time: dt_time | None = None
    end_time: dt_time | None = None
    note: str | None = None


class WorkExtraRead(WorkExtraBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
