from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(
    prefix="/announcements",
    tags=["Announcements"]
)

@router.get("", response_model=List[schemas.AnnouncementOut])
def get_announcements(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all announcements, ordered by created_at desc.
    """
    announcements = db.query(models.Announcement).order_by(models.Announcement.created_at.desc()).all()
    
    result = []
    for a in announcements:
        result.append(schemas.AnnouncementOut(
            id=a.id,
            title=a.title,
            content=a.content,
            created_at=a.created_at,
            created_by_id=a.created_by_id,
            sender_name="Administrator"
        ))
    return result

@router.post("", response_model=schemas.AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: schemas.AnnouncementCreate,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new announcement (Admin only).
    """
    if not payload.title.strip() or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Title and content cannot be empty.")
        
    new_announcement = models.Announcement(
        title=payload.title.strip(),
        content=payload.content.strip(),
        created_by_id=admin.id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    
    return schemas.AnnouncementOut(
        id=new_announcement.id,
        title=new_announcement.title,
        content=new_announcement.content,
        created_at=new_announcement.created_at,
        created_by_id=new_announcement.created_by_id,
        sender_name="Administrator"
    )

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    Delete an announcement (Admin only).
    """
    announcement = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found.")
        
    db.delete(announcement)
    db.commit()
    return None
