import os
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/documents", tags=["Documents"])

UPLOAD_DIR = os.path.join(os.getcwd(), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_user_from_token_or_header(
    token: Optional[str] = Query(None),
    header_token: Optional[str] = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    actual_token = token or header_token
    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing"
        )
    try:
        payload = auth.jwt.decode(actual_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except auth.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/upload", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    task_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided")
        
    # Generate unique filename to avoid collisions
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, unique_name)
    
    # Read and save file content
    content = await file.read()
    file_size = len(content)
    
    with open(saved_path, "wb") as f:
        f.write(content)
        
    # Create DB record
    document = models.Document(
        student_id=student.id,
        title=title.strip(),
        description=description.strip() if description else None,
        file_path=saved_path,
        file_name=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        task_id=task_id if (task_id and task_id > 0) else None
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Map additional output fields
    res = schemas.DocumentOut.from_orm(document)
    res.student_name = student.name
    if document.task:
        res.task_title = document.task.title
    return res


@router.get("/student", response_model=List[schemas.DocumentOut])
def get_student_documents(
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    docs = db.query(models.Document).filter(
        models.Document.student_id == student.id
    ).order_by(models.Document.uploaded_at.desc()).all()
    
    result = []
    for d in docs:
        doc_out = schemas.DocumentOut.from_orm(d)
        doc_out.student_name = student.name
        if d.task:
            doc_out.task_title = d.task.title
        result.append(doc_out)
        
    return result


@router.get("/mentor", response_model=List[schemas.DocumentOut])
def get_mentor_students_documents(
    student_id: Optional[int] = Query(None),
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    assigned_student_ids = [s.id for s in mentor.students]
    
    query = db.query(models.Document).filter(
        models.Document.student_id.in_(assigned_student_ids)
    )
    
    if student_id:
        if student_id not in assigned_student_ids:
            raise HTTPException(status_code=403, detail="Student is not assigned to you")
        query = query.filter(models.Document.student_id == student_id)
        
    docs = query.order_by(models.Document.uploaded_at.desc()).all()
    
    # Create map for quick student name lookup
    student_map = {s.id: s.name for s in mentor.students}
    
    result = []
    for d in docs:
        doc_out = schemas.DocumentOut.from_orm(d)
        doc_out.student_name = student_map.get(d.student_id, "Unknown Student")
        if d.task:
            doc_out.task_title = d.task.title
        result.append(doc_out)
        
    return result


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    user: models.User = Depends(get_user_from_token_or_header),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check permissions
    if user.role == "student":
        if not user.student_profile or doc.student_id != user.student_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "mentor":
        if not user.mentor_profile:
            raise HTTPException(status_code=403, detail="Access denied")
        assigned_student_ids = [s.id for s in user.mentor_profile.students]
        if doc.student_id not in assigned_student_ids:
            raise HTTPException(status_code=403, detail="Access denied: Student not assigned to you")
            
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")
        
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.file_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'}
    )


@router.get("/{document_id}/view")
def view_document(
    document_id: int,
    user: models.User = Depends(get_user_from_token_or_header),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check permissions
    if user.role == "student":
        if not user.student_profile or doc.student_id != user.student_profile.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "mentor":
        if not user.mentor_profile:
            raise HTTPException(status_code=403, detail="Access denied")
        assigned_student_ids = [s.id for s in user.mentor_profile.students]
        if doc.student_id not in assigned_student_ids:
            raise HTTPException(status_code=403, detail="Access denied: Student not assigned to you")
            
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")
        
    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.file_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{doc.file_name}"'}
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.student_id == student.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
        
    # Remove file from storage
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass
            
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
