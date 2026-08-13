import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from .. import models, schemas, auth
from ..ai.report_analyzer import analyze_report
from ..ai.task_recommender import recommend_tasks

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/me", response_model=schemas.StudentProfileOut)
def get_student_profile(student: models.StudentProfile = Depends(auth.get_current_active_student)):
    return student

@router.put("/me", response_model=schemas.StudentProfileOut)
def update_student_profile(
    profile_data: schemas.StudentProfileBase,
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    student.name = profile_data.name
    if profile_data.college is not None:
        student.college = profile_data.college
    if profile_data.department is not None:
        student.department = profile_data.department
    if profile_data.skills is not None:
        student.skills = profile_data.skills
    if profile_data.internship_domain is not None:
        student.internship_domain = profile_data.internship_domain
        
    db.commit()
    db.refresh(student)
    return student

@router.get("/me/tasks", response_model=List[schemas.TaskOut])
def get_student_tasks(student: models.StudentProfile = Depends(auth.get_current_active_student)):
    return student.tasks

@router.post("/me/tasks/{task_id}/submit", response_model=schemas.TaskOut)
def submit_task(
    task_id: int,
    submission: schemas.TaskSubmit,
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id, 
        models.Task.assigned_to_student_id == student.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not assigned to you")
    
    # --- Deadline Enforcement ---
    now = datetime.datetime.now()
    due_dt = task.due_date if isinstance(task.due_date, datetime.datetime) else datetime.datetime.combine(task.due_date, datetime.time.max)
    if due_dt < now:
        # Auto-mark as failed on deadline breach if still in assigned state
        if task.status == "assigned":
            task.status = "failed"
            db.commit()
            db.refresh(task)
            recalculate_student_metrics(student.id, db)
        formatted_due = due_dt.strftime("%b %d, %Y, %I:%M %p")
        raise HTTPException(
            status_code=403,
            detail=f"Submission deadline has passed ({formatted_due}). This task is now locked and cannot be submitted."
        )
    
    # Block re-submission of already submitted/completed/failed tasks
    if task.status in ("submitted", "completed", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Task is already in '{task.status}' state and cannot be resubmitted."
        )
        
    task.submission_text = submission.submission_text
    task.status = "submitted"
    task.submitted_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(task)
    return task

@router.get("/me/reports", response_model=List[schemas.DailyReportOut])
def get_student_reports(student: models.StudentProfile = Depends(auth.get_current_active_student)):
    return student.daily_reports

@router.post("/me/reports", response_model=schemas.DailyReportOut)
def submit_daily_report(
    report_in: schemas.DailyReportCreate,
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    # Check if report already exists for today
    existing_report = db.query(models.DailyReport).filter(
        models.DailyReport.student_id == student.id,
        models.DailyReport.date == today
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted a daily report for today"
        )
        
    # Trigger NLP analysis
    ai_analysis = analyze_report(report_in.content, report_in.blockers or "")
    
    new_report = models.DailyReport(
        student_id=student.id,
        date=today,
        content=report_in.content,
        blockers=report_in.blockers,
        hours_spent=report_in.hours_spent,
        status="pending",
        quality_score=ai_analysis["quality_score"],
        sentiment=ai_analysis["sentiment_score"],
        key_phrases=ai_analysis["key_phrases"]
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    # Recalculate metrics asynchronously/synchronously on report submission
    recalculate_student_metrics(student.id, db)
    
    return new_report

@router.get("/me/attendance", response_model=List[schemas.AttendanceOut])
def get_student_attendance(student: models.StudentProfile = Depends(auth.get_current_active_student)):
    return student.attendance_records

@router.post("/me/attendance", response_model=schemas.AttendanceOut)
def mark_attendance(
    attendance_in: schemas.AttendanceMark,
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    existing_attendance = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.id,
        models.Attendance.date == today
    ).first()
    
    if existing_attendance:
        raise HTTPException(
            status_code=400,
            detail="Attendance already marked for today"
        )
        
    new_attendance = models.Attendance(
        student_id=student.id,
        date=today,
        status=attendance_in.status
    )
    
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    
    # Recalculate metrics
    recalculate_student_metrics(student.id, db)
    
    return new_attendance

@router.get("/me/recommendations")
def get_student_task_recommendations(
    student: models.StudentProfile = Depends(auth.get_current_active_student),
    db: Session = Depends(get_db)
):
    # Fetch completed task titles to avoid recommending them
    completed_task_titles = [
        t.title for t in student.tasks if t.status == "completed"
    ]
    recommendations = recommend_tasks(student.skills or "", completed_task_titles)
    return recommendations

@router.get("/me/certificate", response_model=schemas.CertificateOut)
def get_student_certificate(student: models.StudentProfile = Depends(auth.get_current_active_student)):
    if not student.certificate:
        raise HTTPException(
            status_code=404, 
            detail="Certificate has not been issued yet by the Administrator"
        )
    return student.certificate

# --- Helper: classify batch by internship score ---
def classify_batch(score: float) -> str:
    if score >= 90.0:
        return "Platinum Batch"
    elif score >= 75.0:
        return "Gold Batch"
    elif score >= 60.0:
        return "Silver Batch"
    else:
        return "Remedial Batch"

# --- Helper function to recalculate metrics dynamically ---
from ..ai.performance_predictor import predict_student_performance

def recalculate_student_metrics(student_id: int, db: Session):
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    if not student:
        return
        
    today = datetime.date.today()
    
    # 1. Attendance Rate
    total_days = db.query(models.Attendance).filter(models.Attendance.student_id == student_id).count()
    present_days = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.status == "present"
    ).count()
    attendance_rate = (present_days / total_days) if total_days > 0 else 0.85 # default baseline
    
    # 2. Task Completion Rate
    total_tasks = len(student.tasks)
    completed_tasks = sum(1 for t in student.tasks if t.status == "completed")
    task_completion_rate = (completed_tasks / total_tasks) if total_tasks > 0 else 0.0
    
    # 3. Average Task Score
    task_scores = [t.score for t in student.tasks if t.score is not None]
    avg_task_score = (sum(task_scores) / len(task_scores)) if task_scores else 70.0 # default baseline
    
    # 4. Average Report Quality and Sentiment
    reports = student.daily_reports
    avg_report_quality = (sum(r.quality_score for r in reports) / len(reports)) if reports else 70.0
    avg_sentiment = (sum(r.sentiment for r in reports) / len(reports)) if reports else 0.2
    
    # 5. Late Submission Rate (ratio of tasks submitted after due date)
    late_submissions = 0
    now = datetime.datetime.now()
    for t in student.tasks:
        t_due = t.due_date if isinstance(t.due_date, datetime.datetime) else datetime.datetime.combine(t.due_date, datetime.time.max)
        if t.submitted_at and t.submitted_at > t_due:
            late_submissions += 1
    late_submission_ratio = (late_submissions / total_tasks) if total_tasks > 0 else 0.0
    
    # 6. Internship Score — start at 100, deduct per missed (expired+unsubmitted) task
    #    Auto-mark expired assigned tasks as failed first
    for t in student.tasks:
        t_due = t.due_date if isinstance(t.due_date, datetime.datetime) else datetime.datetime.combine(t.due_date, datetime.time.max)
        if t.status == "assigned" and now > t_due:
            t.status = "failed"
    db.flush()  # Persist status changes before counting
    
    missed_tasks = sum(
        1 for t in student.tasks
        if t.status == "failed" and t.submitted_at is None  # missed = failed with no submission
    )
    penalty_per_task = (100.0 / total_tasks) if total_tasks > 0 else 0.0
    internship_score = round(max(0.0, 100.0 - (missed_tasks * penalty_per_task)), 1)
    batch = classify_batch(internship_score)
    eligible_for_completion = internship_score >= 75.0
    
    # Trigger ML prediction
    grade, prob, risk = predict_student_performance(
        attendance_rate=attendance_rate,
        task_completion_rate=task_completion_rate,
        avg_task_score=avg_task_score,
        avg_report_quality=avg_report_quality,
        avg_sentiment=avg_sentiment,
        late_submission_ratio=late_submission_ratio
    )
    
    # Save/Update metrics in DB
    metrics = student.performance_metrics
    if not metrics:
        metrics = models.PerformanceMetrics(student_id=student_id)
        db.add(metrics)
        
    metrics.calculated_score = round(
        (attendance_rate * 25) + 
        (task_completion_rate * 25) + 
        (avg_task_score * 0.3) + 
        (avg_report_quality * 0.2), 1
    )
    metrics.predicted_grade = grade
    metrics.completion_probability = prob
    metrics.risk_level = risk
    metrics.calculated_at = datetime.datetime.utcnow()
    metrics.internship_score = internship_score
    metrics.batch = batch
    metrics.eligible_for_completion = eligible_for_completion
    
    db.commit()
