from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/feedback", tags=["Feedback"])


def get_user_name(user: models.User) -> str:
    if user.student_profile and user.student_profile.name:
        return user.student_profile.name
    if user.mentor_profile and user.mentor_profile.name:
        return user.mentor_profile.name
    return user.email.split("@")[0].capitalize()


@router.post("", response_model=schemas.FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    feedback_in: schemas.FeedbackCreate,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    new_feedback = models.Feedback(
        user_id=user.id,
        role=user.role,
        category=feedback_in.category.strip(),
        rating=feedback_in.rating,
        subject=feedback_in.subject.strip(),
        message=feedback_in.message.strip(),
        status="pending"
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    res = schemas.FeedbackOut.from_orm(new_feedback)
    res.user_email = user.email
    res.user_name = get_user_name(user)
    return res


@router.get("/me", response_model=List[schemas.FeedbackOut])
def get_my_feedback(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    feedbacks = db.query(models.Feedback).filter(
        models.Feedback.user_id == user.id
    ).order_by(models.Feedback.created_at.desc()).all()

    user_name = get_user_name(user)
    result = []
    for f in feedbacks:
        out = schemas.FeedbackOut.from_orm(f)
        out.user_email = user.email
        out.user_name = user_name
        result.append(out)

    return result


@router.get("/admin", response_model=List[schemas.FeedbackOut])
def get_all_feedback_for_admin(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Feedback)

    if status_filter and status_filter != "all":
        query = query.filter(models.Feedback.status == status_filter)

    if category_filter and category_filter != "all":
        query = query.filter(models.Feedback.category == category_filter)

    feedbacks = query.order_by(models.Feedback.created_at.desc()).all()

    # Prefetch users for efficient display
    user_ids = [f.user_id for f in feedbacks]
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: u for u in users}

    result = []
    for f in feedbacks:
        out = schemas.FeedbackOut.from_orm(f)
        u = user_map.get(f.user_id)
        if u:
            out.user_email = u.email
            out.user_name = get_user_name(u)
        else:
            out.user_email = "unknown"
            out.user_name = "Unknown User"
        result.append(out)

    return result


@router.put("/admin/{feedback_id}", response_model=schemas.FeedbackOut)
def update_feedback_status(
    feedback_id: int,
    update_in: schemas.FeedbackUpdateStatus,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    feedback = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback entry not found")

    feedback.status = update_in.status
    if update_in.admin_notes is not None:
        feedback.admin_notes = update_in.admin_notes.strip()

    db.commit()
    db.refresh(feedback)

    out = schemas.FeedbackOut.from_orm(feedback)
    if feedback.user:
        out.user_email = feedback.user.email
        out.user_name = get_user_name(feedback.user)
    return out


@router.delete("/admin/{feedback_id}")
def delete_feedback(
    feedback_id: int,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    feedback = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback entry not found")

    db.delete(feedback)
    db.commit()
    return {"message": "Feedback entry deleted successfully"}
