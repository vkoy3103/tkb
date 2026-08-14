from datetime import time

from pydantic import BaseModel, ConfigDict


class PeriodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_number: int
    start_time: time
    end_time: time
    label: str | None = None
    note: str | None = None
