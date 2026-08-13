from datetime import datetime
from pydantic import BaseModel, Field


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1)
    code: str | None = None
    credits: int = 0
    teacher: str | None = None
    room: str | None = None
    color: str | None = None
    note: str | None = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
