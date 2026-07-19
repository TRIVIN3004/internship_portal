from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import datetime
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/analytics", tags=["Analytics & AI"])

@router.get("/overview", response_model=schemas.AnalyticsOverview)
def get_analytics_overview(
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    total_students = db.query(models.StudentProfile).count()
    total_mentors = db.query(models.MentorProfile).count()
    
    # Calculate global attendance rate
    total_attendance_records = db.query(models.Attendance).count()
    present_records = db.query(models.Attendance).filter(models.Attendance.status == "present").count()
    attendance_rate = (present_records / total_attendance_records) if total_attendance_records > 0 else 0.85
    
    # Calculate global task completion rate
    total_tasks = db.query(models.Task).count()
    completed_tasks = db.query(models.Task).filter(models.Task.status == "completed").count()
    task_completion_rate = (completed_tasks / total_tasks) if total_tasks > 0 else 0.0
    
    # Risk predictions distributions
    at_risk = db.query(models.PerformanceMetrics).filter(models.PerformanceMetrics.predicted_grade == "At Risk").count()
    on_track = db.query(models.PerformanceMetrics).filter(models.PerformanceMetrics.predicted_grade == "On Track").count()
    outstanding = db.query(models.PerformanceMetrics).filter(models.PerformanceMetrics.predicted_grade == "Outstanding").count()
    
    # Heuristics adjustment for new setup (bootstrap)
    if total_students > 0 and (at_risk + on_track + outstanding == 0):
        on_track = total_students # default all to on track if no evaluations have run yet
        
    return {
        "total_students": total_students,
        "total_mentors": total_mentors,
        "overall_attendance_rate": round(attendance_rate, 2),
        "overall_task_completion_rate": round(task_completion_rate, 2),
        "at_risk_count": at_risk,
        "on_track_count": on_track,
        "outstanding_count": outstanding
    }

@router.get("/student/{student_id}/charts")
def get_student_chart_data(
    student_id: int,
    db: Session = Depends(get_db)
):
    # Verify student exists
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Get last 7 reports for progression line
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.student_id == student_id
    ).order_by(models.DailyReport.date.desc()).limit(7).all()
    
    # Reverse reports to order chronologically
    reports.reverse()
    
    report_labels = [r.date.strftime("%Y-%m-%d") for r in reports]
    quality_scores = [r.quality_score for r in reports]
    sentiment_scores = [r.sentiment for r in reports]
    
    # Fetch recent task completions
    tasks = db.query(models.Task).filter(
        models.Task.assigned_to_student_id == student_id
    ).all()
    
    task_statuses = {}
    for t in tasks:
        task_statuses[t.status] = task_statuses.get(t.status, 0) + 1
        
    # Fetch attendance counts
    attendance = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id
    ).all()
    
    attendance_stats = {"present": 0, "absent": 0, "leave": 0}
    for a in attendance:
        status = a.status.lower()
        if status in attendance_stats:
            attendance_stats[status] += 1
            
    return {
        "report_trends": {
            "labels": report_labels,
            "quality_scores": quality_scores,
            "sentiment_scores": sentiment_scores
        },
        "task_distributions": {
            "labels": list(task_statuses.keys()),
            "values": list(task_statuses.values())
        },
        "attendance_distribution": {
            "labels": list(attendance_stats.keys()),
            "values": list(attendance_stats.values())
        }
    }
