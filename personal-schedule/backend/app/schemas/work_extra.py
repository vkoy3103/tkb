from datetime import datetime, time as dt_time
from pydantic import BaseModel, Field


class WorkExtraBase(BaseModel):
    work_shift_id: int
    extra_type_id: int = Field(..., description="ID của loại phụ thu (NPC/OT/EXTEND...)")
    quantity: float | None = None
    unit_price: float | None = None
    amount: int | None = None
    start_time: dt_time | None = None
    end_time: dt_time | None = None
    note: str | None = None


class WorkExtraCreate(WorkExtraBase):
    pass


class WorkExtraUpdate(BaseModel):
    work_shift_id: int | None = None
    extra_type_id: int | None = None
    quantity: float | None = None
    unit_price: float | None = None
    amount: int | None = None
    start_time: dt_time | None = None
    end_time: dt_time | None = None
    note: str | None = None


class WorkExtraRead(WorkExtraBase):
    id: int
    type: str | None = None
    type_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
