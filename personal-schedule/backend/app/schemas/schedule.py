from datetime import datetime, time
from pydantic import BaseModel, Field, model_validator


class ScheduleBase(BaseModel):
    subject_id: int
    weekday: int = Field(..., ge=1, le=7)
    # Chế độ TIẾT
    start_period: int | None = Field(default=None, ge=1)
    end_period: int | None = Field(default=None, ge=1)
    # Chế độ GIỜ
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None
    week_start: int | None = None
    week_end: int | None = None
    note: str | None = None

    @model_validator(mode="after")
    def validate_time_mode(self):
        has_period = self.start_period is not None or self.end_period is not None
        has_time = self.start_time is not None or self.end_time is not None
        if has_period and has_time:
            raise ValueError("Chỉ được nhập theo tiết HOẶC theo giờ, không nhập cả hai.")
        if not has_period and not has_time:
            raise ValueError("Phải nhập giờ hoặc tiết cho lịch học.")
        if has_period:
            if self.start_period is None or self.end_period is None:
                raise ValueError("Cần đủ tiết bắt đầu và tiết kết thúc.")
            if self.start_period > self.end_period:
                raise ValueError("Tiết bắt đầu phải <= tiết kết thúc.")
        if has_time:
            if self.start_time is None or self.end_time is None:
                raise ValueError("Cần đủ giờ bắt đầu và giờ kết thúc.")
            if self.end_time <= self.start_time:
                raise ValueError("Giờ kết thúc phải sau giờ bắt đầu.")
        return self


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    subject_id: int | None = None
    weekday: int | None = Field(default=None, ge=1, le=7)
    start_period: int | None = Field(default=None, ge=1)
    end_period: int | None = Field(default=None, ge=1)
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = None
    week_start: int | None = None
    week_end: int | None = None
    note: str | None = None

    @model_validator(mode="after")
    def validate_time_mode(self):
        has_period = self.start_period is not None or self.end_period is not None
        has_time = self.start_time is not None or self.end_time is not None
        if has_period and has_time:
            raise ValueError("Chỉ được nhập theo tiết HOẶC theo giờ, không nhập cả hai.")
        if has_period:
            if self.start_period is None or self.end_period is None:
                raise ValueError("Cần đủ tiết bắt đầu và tiết kết thúc.")
            if self.start_period > self.end_period:
                raise ValueError("Tiết bắt đầu phải <= tiết kết thúc.")
        if has_time:
            if self.start_time is None or self.end_time is None:
                raise ValueError("Cần đủ giờ bắt đầu và giờ kết thúc.")
            if self.end_time <= self.start_time:
                raise ValueError("Giờ kết thúc phải sau giờ bắt đầu.")
        return self


class ScheduleRead(ScheduleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
