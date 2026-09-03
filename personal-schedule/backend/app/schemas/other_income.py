from datetime import date as DateType
from datetime import datetime

from pydantic import BaseModel, Field


class OtherIncomeBase(BaseModel):
    date: DateType
    note: str | None = Field(default=None, max_length=255)
    amount: int = Field(..., ge=0, description="Số tiền (VNĐ) người dùng tự nhập")


class OtherIncomeCreate(OtherIncomeBase):
    pass


class OtherIncomeUpdate(BaseModel):
    date: DateType | None = None
    note: str | None = Field(default=None, max_length=255)
    amount: int | None = Field(default=None, ge=0)


class OtherIncomeRead(OtherIncomeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
