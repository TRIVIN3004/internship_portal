from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime
from ..database import get_db
from .. import models, schemas, auth
from .students import recalculate_student_metrics

router = APIRouter(prefix="/mentors", tags=["Mentors"])

@router.get("/me", response_model=schemas.MentorProfileOut)
def get_mentor_profile(mentor: models.MentorProfile = Depends(auth.get_current_active_mentor)):
    return mentor

@router.get("/students", response_model=List[schemas.StudentWithMetricsOut])
def get_assigned_students(
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    students = mentor.students
    response = []
    for s in students:
        # Calculate dynamic fallback stats in case metrics are not calculated yet
        metrics = s.performance_metrics
        
        # Calculate rates
        total_attendance = len(s.attendance_records)
        present = sum(1 for a in s.attendance_records if a.status == "present")
        attendance_rate = (present / total_attendance) if total_attendance > 0 else 1.0
        
        total_tasks = len(s.tasks)
        completed_tasks = sum(1 for t in s.tasks if t.status == "completed")
        task_completion_rate = (completed_tasks / total_tasks) if total_tasks > 0 else 0.0
        
        task_scores = [t.score for t in s.tasks if t.score is not None]
        avg_task_score = (sum(task_scores) / len(task_scores)) if task_scores else 0.0
        
        avg_report_quality = (sum(r.quality_score for r in s.daily_reports) / len(s.daily_reports)) if s.daily_reports else 0.0
        
        student_data = schemas.StudentWithMetricsOut(
            id=s.id,
            user_id=s.user_id,
            name=s.name,
            college=s.college,
            department=s.department,
            skills=s.skills,
            internship_domain=s.internship_domain,
            start_date=s.start_date,
            end_date=s.end_date,
            mentor_id=s.mentor_id,
            mentor=schemas.MentorProfileOut(id=mentor.id, name=mentor.name, department=mentor.department, specialization=mentor.specialization),
            attendance_rate=round(attendance_rate, 2),
            task_completion_rate=round(task_completion_rate, 2),
            avg_task_score=round(avg_task_score, 1),
            avg_report_quality=round(avg_report_quality, 1),
            predicted_grade=metrics.predicted_grade if metrics else "On Track",
            risk_level=metrics.risk_level if metrics else "Low",
            completion_probability=metrics.completion_probability if metrics else 0.8
        )
        response.append(student_data)
        
    return response

@router.post("/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def assign_task(
    task_in: schemas.TaskCreate,
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    # Verify student is assigned to this mentor
    student = db.query(models.StudentProfile).filter(
        models.StudentProfile.id == task_in.assigned_to_student_id,
        models.StudentProfile.mentor_id == mentor.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=403,
            detail="You can only assign tasks to students assigned to you."
        )
        
    new_task = models.Task(
        title=task_in.title,
        description=task_in.description,
        assigned_to_student_id=task_in.assigned_to_student_id,
        created_by_mentor_id=mentor.id,
        status="assigned",
        due_date=task_in.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Update performance metrics
    recalculate_student_metrics(student.id, db)
    
    return new_task

@router.get("/tasks", response_model=List[schemas.TaskOut])
def get_assigned_tasks(
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    # Find all tasks assigned to students under this mentor
    student_ids = [s.id for s in mentor.students]
    tasks = db.query(models.Task).filter(models.Task.assigned_to_student_id.in_(student_ids)).all()
    return tasks

@router.post("/tasks/{task_id}/grade", response_model=schemas.TaskOut)
def grade_task(
    task_id: int,
    grading: schemas.TaskGrade,
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Verify authorization
    student = db.query(models.StudentProfile).filter(
        models.StudentProfile.id == task.assigned_to_student_id,
        models.StudentProfile.mentor_id == mentor.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=403, detail="You do not manage this student")
        
    task.score = grading.score
    task.feedback = grading.feedback
    task.status = "completed" if grading.score >= 50 else "failed"
    task.completed_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(task)
    
    # Recalculate performance metrics
    recalculate_student_metrics(student.id, db)
    
    return task

@router.get("/reports", response_model=List[schemas.DailyReportOut])
def get_student_reports(
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    student_ids = [s.id for s in mentor.students]
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.student_id.in_(student_ids)
    ).order_by(models.DailyReport.date.desc()).all()
    return reports

@router.post("/reports/{report_id}/review", response_model=schemas.DailyReportOut)
def review_daily_report(
    report_id: int,
    review: schemas.DailyReportReview,
    mentor: models.MentorProfile = Depends(auth.get_current_active_mentor),
    db: Session = Depends(get_db)
):
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Verify authorization
    student = db.query(models.StudentProfile).filter(
        models.StudentProfile.id == report.student_id,
        models.StudentProfile.mentor_id == mentor.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=403, detail="You do not manage this student")
        
    report.status = review.status
    report.review_feedback = review.review_feedback
    report.reviewer_id = mentor.id
    
    db.commit()
    db.refresh(report)
    
    return report
