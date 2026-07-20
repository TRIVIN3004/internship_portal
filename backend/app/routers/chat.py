from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
import datetime

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(
    prefix="/chat",
    tags=["Chat & Doubt Clarification"]
)

@router.get("/contacts", response_model=List[schemas.ChatContactOut])
def get_chat_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch relevant chat contacts with unread badge counts and latest message snippets.
    - Students get their assigned mentor (highlighted) + all active mentors.
    - Mentors get their assigned student interns (highlighted) + all student interns.
    - Admins get all users.
    """
    contacts = []

    if current_user.role == "student":
        student_prof = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == current_user.id).first()
        assigned_mentor_id = student_prof.mentor_id if student_prof else None

        mentors = db.query(models.MentorProfile).all()
        # Sort so assigned mentor is at the top
        mentors.sort(key=lambda m: 0 if m.id == assigned_mentor_id else 1)

        for m in mentors:
            is_assigned = (m.id == assigned_mentor_id)
            detail = f"{m.department or 'Mentor'} • {m.specialization or 'General'}"
            if is_assigned:
                detail = f"⭐ Assigned Mentor | {detail}"

            unread_cnt = db.query(models.ChatMessage).filter(
                models.ChatMessage.sender_id == m.user_id,
                models.ChatMessage.receiver_id == current_user.id,
                models.ChatMessage.is_read == False
            ).count()

            last_msg_obj = db.query(models.ChatMessage).filter(
                or_(
                    and_(models.ChatMessage.sender_id == current_user.id, models.ChatMessage.receiver_id == m.user_id),
                    and_(models.ChatMessage.sender_id == m.user_id, models.ChatMessage.receiver_id == current_user.id)
                )
            ).order_by(models.ChatMessage.created_at.desc()).first()

            contacts.append(schemas.ChatContactOut(
                user_id=m.user_id,
                name=m.name,
                role="mentor",
                detail=detail,
                unread_count=unread_cnt,
                last_message=last_msg_obj.message if last_msg_obj else None,
                last_message_time=last_msg_obj.created_at if last_msg_obj else None
            ))

    elif current_user.role == "mentor":
        mentor_prof = db.query(models.MentorProfile).filter(models.MentorProfile.user_id == current_user.id).first()
        mentor_prof_id = mentor_prof.id if mentor_prof else None

        students = db.query(models.StudentProfile).all()
        # Sort so assigned student interns are at the top
        students.sort(key=lambda s: 0 if s.mentor_id == mentor_prof_id else 1)

        for s in students:
            is_assigned = (s.mentor_id == mentor_prof_id)
            detail = f"{s.college or 'Intern'} ({s.internship_domain or 'Domain'})"
            if is_assigned:
                detail = f"⭐ Assigned Intern | {detail}"

            unread_cnt = db.query(models.ChatMessage).filter(
                models.ChatMessage.sender_id == s.user_id,
                models.ChatMessage.receiver_id == current_user.id,
                models.ChatMessage.is_read == False
            ).count()

            last_msg_obj = db.query(models.ChatMessage).filter(
                or_(
                    and_(models.ChatMessage.sender_id == current_user.id, models.ChatMessage.receiver_id == s.user_id),
                    and_(models.ChatMessage.sender_id == s.user_id, models.ChatMessage.receiver_id == current_user.id)
                )
            ).order_by(models.ChatMessage.created_at.desc()).first()

            contacts.append(schemas.ChatContactOut(
                user_id=s.user_id,
                name=s.name,
                role="student",
                detail=detail,
                unread_count=unread_cnt,
                last_message=last_msg_obj.message if last_msg_obj else None,
                last_message_time=last_msg_obj.created_at if last_msg_obj else None
            ))

    else: # Admin or fallback
        users = db.query(models.User).filter(models.User.id != current_user.id).all()
        for u in users:
            name = u.email
            detail = u.role.capitalize()
            if u.student_profile:
                name = u.student_profile.name
            elif u.mentor_profile:
                name = u.mentor_profile.name

            unread_cnt = db.query(models.ChatMessage).filter(
                models.ChatMessage.sender_id == u.id,
                models.ChatMessage.receiver_id == current_user.id,
                models.ChatMessage.is_read == False
            ).count()

            last_msg_obj = db.query(models.ChatMessage).filter(
                or_(
                    and_(models.ChatMessage.sender_id == current_user.id, models.ChatMessage.receiver_id == u.id),
                    and_(models.ChatMessage.sender_id == u.id, models.ChatMessage.receiver_id == current_user.id)
                )
            ).order_by(models.ChatMessage.created_at.desc()).first()

            contacts.append(schemas.ChatContactOut(
                user_id=u.id,
                name=name,
                role=u.role,
                detail=detail,
                unread_count=unread_cnt,
                last_message=last_msg_obj.message if last_msg_obj else None,
                last_message_time=last_msg_obj.created_at if last_msg_obj else None
            ))

    return contacts


@router.get("/messages/{other_user_id}", response_model=List[schemas.ChatMessageOut])
def get_chat_messages(
    other_user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve message history between current user and target contact user.
    Also automatically marks any unread messages from other_user_id as read.
    """
    # Mark incoming unread messages as read
    db.query(models.ChatMessage).filter(
        models.ChatMessage.sender_id == other_user_id,
        models.ChatMessage.receiver_id == current_user.id,
        models.ChatMessage.is_read == False
    ).update({models.ChatMessage.is_read: True}, synchronize_session=False)
    db.commit()

    # Query full conversation thread
    messages = db.query(models.ChatMessage).filter(
        or_(
            and_(models.ChatMessage.sender_id == current_user.id, models.ChatMessage.receiver_id == other_user_id),
            and_(models.ChatMessage.sender_id == other_user_id, models.ChatMessage.receiver_id == current_user.id)
        )
    ).order_by(models.ChatMessage.created_at.asc()).all()

    return messages


@router.post("/messages", response_model=schemas.ChatMessageOut)
def send_chat_message(
    payload: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a direct message to another user (mentor or student).
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    receiver = db.query(models.User).filter(models.User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Target user profile not found.")

    new_msg = models.ChatMessage(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        message=payload.message.strip(),
        created_at=datetime.datetime.utcnow(),
        is_read=False
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return new_msg


@router.get("/unread-count")
def get_unread_chat_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get overall unread message count for notification badges.
    """
    count = db.query(models.ChatMessage).filter(
        models.ChatMessage.receiver_id == current_user.id,
        models.ChatMessage.is_read == False
    ).count()
    return {"unread_count": count}
