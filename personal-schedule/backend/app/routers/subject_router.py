from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from app.services.auth_service import get_current_user
from app.services.subject_service import create_subject, delete_subject, get_subject, get_subjects, update_subject

router = APIRouter(prefix="/subjects", tags=["subjects"])


def get_db():
    with SessionLocal() as db:
        yield db


# ----- Subject management -----

@router.get("", response_model=list[SubjectRead])
def read_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active and inactive subjects sorted by name."""
    return get_subjects(db, current_user.id)


@router.post("", response_model=SubjectRead)
def create_subject_endpoint(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new subject with code, name, credits, teacher, room, and color."""
    return create_subject(db, current_user.id, payload)


@router.get("/{subject_id}", response_model=SubjectRead)
def read_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch one subject by its id."""
    subject = get_subject(db, current_user.id, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.put("/{subject_id}", response_model=SubjectRead)
def update_subject_endpoint(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update subject information such as name, credits, teacher, room, color, or status."""
    subject = get_subject(db, current_user.id, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return update_subject(db, subject, payload)


@router.delete("/{subject_id}")
def delete_subject_endpoint(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a subject permanently from the database."""
    subject = get_subject(db, current_user.id, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    delete_subject(db, subject)
    return {"detail": "Subject deleted"}
