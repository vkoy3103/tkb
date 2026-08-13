from datetime import datetime
from pydantic import BaseModel, Field


class SettingsBase(BaseModel):
    normal_rate: int = Field(..., ge=0)
    npc_rate: int = Field(..., ge=0)
    ot_rate: int = Field(..., ge=0)
    extend_rate: int = Field(..., ge=0)


class SettingsUpdate(SettingsBase):
    pass


class SettingsRead(SettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
