from sqlalchemy.orm import Session

from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectUpdate


def get_subjects(db: Session, user_id: int) -> list[Subject]:
    return db.query(Subject).filter(Subject.user_id == user_id).order_by(Subject.name).all()


def get_subject(db: Session, user_id: int, subject_id: int) -> Subject | None:
    return (
        db.query(Subject)
        .filter(Subject.id == subject_id, Subject.user_id == user_id)
        .first()
    )


def create_subject(db: Session, user_id: int, payload: SubjectCreate) -> Subject:
    subject = Subject(user_id=user_id, **payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def create_subjects_bulk(db: Session, user_id: int, payloads: list[SubjectCreate]) -> list[Subject]:
    """Tạo nhiều môn trong MỘT transaction (nhanh cho import hàng loạt)."""
    subjects = [Subject(user_id=user_id, **p.model_dump()) for p in payloads]
    db.add_all(subjects)
    db.commit()
    for s in subjects:
        db.refresh(s)
    return subjects


def update_subject(db: Session, subject: Subject, payload: SubjectUpdate) -> Subject:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, subject: Subject) -> None:
    db.delete(subject)
    db.commit()
