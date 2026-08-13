from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from app.services.subject_service import create_subject, delete_subject, get_subject, get_subjects, update_subject

router = APIRouter()


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/subjects", response_model=list[SubjectRead])
def read_subjects(db: Session = Depends(get_db)):
    return get_subjects(db)


@router.post("/subjects", response_model=SubjectRead)
def create_subject_endpoint(payload: SubjectCreate, db: Session = Depends(get_db)):
    return create_subject(db, payload)


@router.get("/subjects/{subject_id}", response_model=SubjectRead)
def read_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = get_subject(db, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.put("/subjects/{subject_id}", response_model=SubjectRead)
def update_subject_endpoint(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    subject = get_subject(db, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return update_subject(db, subject, payload)


@router.delete("/subjects/{subject_id}")
def delete_subject_endpoint(subject_id: int, db: Session = Depends(get_db)):
    subject = get_subject(db, subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    delete_subject(db, subject)
    return {"detail": "Subject deleted"}
