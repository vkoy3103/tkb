from datetime import datetime
from pydantic import BaseModel, Field


class SubjectBase(BaseModel):
    code: str | None = None
    name: str = Field(..., min_length=1)
    credits: float = 0
    teacher: str | None = None
    default_room: str | None = None
    color: str | None = None
    note: str | None = None
    is_active: bool = True
    week_start: int | None = None
    week_end: int | None = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    credits: float | None = None
    teacher: str | None = None
    default_room: str | None = None
    color: str | None = None
    note: str | None = None
    is_active: bool | None = None
    week_start: int | None = None
    week_end: int | None = None


class SubjectRead(SubjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
