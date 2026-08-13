from datetime import datetime
from pydantic import BaseModel, Field


class SettingsBase(BaseModel):
    key: str = Field(..., min_length=1)
    value: str | None = None
    description: str | None = None


class SettingsCreate(SettingsBase):
    pass


class SettingsUpdate(BaseModel):
    value: str | None = None
    description: str | None = None


class SettingsRead(SettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
