from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    picture: str | None = None
    role: str
    schedule_mode: str = "PERIOD"
    credit_balance: float = 0.0

    model_config = {"from_attributes": True}


class ScheduleModeUpdate(BaseModel):
    schedule_mode: str = Field(..., pattern="^(PERIOD|TIME)$")
