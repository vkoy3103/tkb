from datetime import datetime
from pydantic import BaseModel, Field


class WorkExtraTypeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    # FIXED hoặc MULTIPLIER
    rate_type: str = Field(..., pattern="^(FIXED|MULTIPLIER)$")
    # FIXED: số tiền / MULTIPLIER: hệ số
    rate_value: float
    description: str | None = None
    is_active: bool = True


class WorkExtraTypeCreate(WorkExtraTypeBase):
    pass


class WorkExtraTypeUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    unit: str | None = None
    rate_type: str | None = None
    rate_value: float | None = None
    description: str | None = None
    is_active: bool | None = None


class WorkExtraTypeRead(WorkExtraTypeBase):
    id: int

    model_config = {"from_attributes": True}
