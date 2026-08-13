from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate


def get_subjects(db: Session) -> list[Subject]:
    return db.query(Subject).order_by(Subject.name).all()


def get_subject(db: Session, subject_id: int) -> Subject | None:
    return db.query(Subject).filter(Subject.id == subject_id).first()


def create_subject(db: Session, payload: SubjectCreate) -> Subject:
    subject = Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def update_subject(db: Session, subject: Subject, payload: SubjectUpdate) -> Subject:
    for field, value in payload.model_dump().items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, subject: Subject) -> None:
    db.delete(subject)
    db.commit()
