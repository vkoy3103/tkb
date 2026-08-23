from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, UserOut
from app.services.auth_service import get_current_user
from app.services.settings_service import ensure_user_settings
from app.services.work_extra_type_service import ensure_user_work_extra_types
from app.utils.jwt import create_access_token
from app.utils.security import hash_password, verify_password

auth = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@auth.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    db_user = db.query(User).filter(User.email == form_data.username).first()

    if db_user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not verify_password(form_data.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        {
            "sub": db_user.email,
            "id": db_user.id,
            "role": db_user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut.model_validate(db_user).model_dump(),
    }


@auth.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@auth.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT stateless — client tự xóa token. Endpoint chỉ để đồng bộ cho frontend.
    return {"message": "Logout success"}


@auth.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email_exists = db.query(User).filter(User.email == request.email).first()
    if email_exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone_number=request.phone_number,
        password_hash=hash_password(request.password),
        role="user",
        credit_balance=0,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Seed dữ liệu mặc định riêng cho user mới (settings + loại phụ thu)
    try:
        ensure_user_settings(db, new_user.id)
    except Exception:
        db.rollback()
    try:
        ensure_user_work_extra_types(db, new_user.id)
    except Exception:
        db.rollback()

    return {
        "message": "Register successfully",
        "id": new_user.id,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "email": new_user.email,
    }
