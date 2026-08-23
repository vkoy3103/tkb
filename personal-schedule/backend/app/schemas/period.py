from datetime import time

from pydantic import BaseModel, ConfigDict, field_validator


class PeriodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_number: int
    start_time: time
    end_time: time
    label: str | None = None
    note: str | None = None


class PeriodBase(BaseModel):
    period_number: int
    start_time: time
    end_time: time
    label: str | None = None
    note: str | None = None

    @field_validator("period_number")
    @classmethod
    def period_number_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Số tiết phải >= 1")
        return v

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: time, info):
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("Giờ kết thúc phải sau giờ bắt đầu")
        return v


class PeriodCreate(PeriodBase):
    pass


class PeriodUpdate(PeriodBase):
    pass
