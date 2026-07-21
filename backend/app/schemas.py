from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# --- Token and Login Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    profile_id: Optional[int] = None
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str # "student" or "mentor" or "admin"
    name: str
    college: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[str] = None
    internship_domain: Optional[str] = None

# --- User Base Schemas ---
class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Mentor Schemas ---
class MentorProfileOut(BaseModel):
    id: int
    name: str
    department: Optional[str] = None
    specialization: Optional[str] = None

    class Config:
        from_attributes = True

# --- Student Schemas ---
class StudentProfileBase(BaseModel):
    name: str
    college: Optional[str] = None
    department: Optional[str] = None
    skills: Optional[str] = None
    internship_domain: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    mentor_id: Optional[int] = None

class StudentProfileCreate(StudentProfileBase):
    user_id: int

class StudentProfileOut(StudentProfileBase):
    id: int
    user_id: int
    mentor: Optional[MentorProfileOut] = None
    performance_metrics: Optional['PerformanceMetricsOut'] = None

    class Config:
        from_attributes = True

class StudentWithMetricsOut(StudentProfileOut):
    attendance_rate: float = 0.0
    task_completion_rate: float = 0.0
    avg_task_score: float = 0.0
    avg_report_quality: float = 0.0
    predicted_grade: str = "On Track"
    risk_level: str = "Low"
    completion_probability: float = 1.0
    internship_score: float = 100.0
    batch: str = "Gold Batch"
    eligible_for_completion: bool = True

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskCreate(BaseModel):
    title: str
    description: str
    assigned_to_student_id: int
    due_date: datetime.date

class TaskSubmit(BaseModel):
    submission_text: str

class TaskGrade(BaseModel):
    score: float = Field(..., ge=0, le=100)
    feedback: str

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    assigned_to_student_id: int
    created_by_mentor_id: Optional[int] = None
    status: str
    due_date: datetime.date
    submitted_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    submission_text: Optional[str] = None

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceMark(BaseModel):
    status: str = Field(..., description="Must be present, absent, or leave")

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    date: datetime.date
    status: str
    marked_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Daily Report Schemas ---
class DailyReportCreate(BaseModel):
    content: str
    blockers: Optional[str] = None
    hours_spent: float = Field(8.0, ge=0.5, le=24.0)

class DailyReportReview(BaseModel):
    status: str = Field(..., description="Must be approved or rejected")
    review_feedback: Optional[str] = None

class DailyReportOut(BaseModel):
    id: int
    student_id: int
    date: datetime.date
    content: str
    blockers: Optional[str] = None
    hours_spent: float
    status: str
    review_feedback: Optional[str] = None
    reviewer_id: Optional[int] = None
    quality_score: float
    sentiment: float
    key_phrases: Optional[str] = None

    class Config:
        from_attributes = True

# --- Certificate Schemas ---
class CertificateOut(BaseModel):
    id: int
    student_id: int
    certificate_code: str
    issued_at: datetime.datetime
    hash_signature: str
    pdf_path: Optional[str] = None

    class Config:
        from_attributes = True

# --- Performance Metrics Schemas ---
class PerformanceMetricsOut(BaseModel):
    id: int
    student_id: int
    calculated_score: float
    predicted_grade: str
    completion_probability: float
    risk_level: str
    calculated_at: datetime.datetime
    internship_score: float = 100.0
    batch: str = "Gold Batch"
    eligible_for_completion: bool = True

    class Config:
        from_attributes = True

# --- Dashboard Overview Analytics ---
class AnalyticsOverview(BaseModel):
    total_students: int
    total_mentors: int
    overall_attendance_rate: float
    overall_task_completion_rate: float
    at_risk_count: int
    on_track_count: int
    outstanding_count: int

# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    receiver_id: int
    message: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    created_at: datetime.datetime
    is_read: bool

    class Config:
        from_attributes = True

class ChatContactOut(BaseModel):
    user_id: int
    name: str
    role: str
    detail: Optional[str] = None
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_time: Optional[datetime.datetime] = None

# --- Document Schemas ---
class DocumentOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    file_name: str
    file_type: Optional[str] = None
    file_size: int
    uploaded_at: datetime.datetime
    task_id: Optional[int] = None
    task_title: Optional[str] = None

    class Config:
        from_attributes = True

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    category: str = Field(..., description="Feature Request, Bug Report, UI / UX Improvement, Performance, General")
    rating: int = Field(5, ge=1, le=5)
    subject: str
    message: str

class FeedbackUpdateStatus(BaseModel):
    status: str = Field(..., description="pending, reviewed, or resolved")
    admin_notes: Optional[str] = None

class FeedbackOut(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    role: str
    category: str
    rating: int
    subject: str
    message: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True



