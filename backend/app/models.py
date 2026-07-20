import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # "student", "mentor", "admin"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Profile links
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    mentor_profile = relationship("MentorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    college = Column(String, nullable=True)
    department = Column(String, nullable=True)
    skills = Column(String, nullable=True) # Comma-separated tags, e.g., "Python,ML,React"
    internship_domain = Column(String, nullable=True) # e.g. "AI & Data Science", "Web Development"
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="student_profile")
    mentor = relationship("MentorProfile", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="student", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="student", cascade="all, delete-orphan")
    certificate = relationship("Certificate", back_populates="student", uselist=False, cascade="all, delete-orphan")
    performance_metrics = relationship("PerformanceMetrics", back_populates="student", uselist=False, cascade="all, delete-orphan")

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="mentor_profile")
    students = relationship("StudentProfile", back_populates="mentor")
    created_tasks = relationship("Task", back_populates="mentor")

class InternshipProgram(Base):
    __tablename__ = "internship_programs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    duration_weeks = Column(Integer, default=8)
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String, nullable=False) # "present", "absent", "leave"
    marked_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("StudentProfile", back_populates="attendance_records")

class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    content = Column(Text, nullable=False) # details of work done
    blockers = Column(Text, nullable=True) # detail of blockers faced
    hours_spent = Column(Float, default=8.0)
    status = Column(String, default="pending") # "pending", "approved", "rejected"
    review_feedback = Column(Text, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("mentor_profiles.id"), nullable=True)
    
    # AI NLP Metrics
    quality_score = Column(Float, default=0.0) # 0 to 100
    sentiment = Column(Float, default=0.0) # -1.0 to 1.0 (VADER compound score)
    key_phrases = Column(String, nullable=True) # Comma-separated keywords
    
    student = relationship("StudentProfile", back_populates="daily_reports")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    assigned_to_student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    created_by_mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="assigned") # "assigned", "submitted", "completed", "failed"
    due_date = Column(Date, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True) # Task grading out of 100
    feedback = Column(Text, nullable=True)
    submission_text = Column(Text, nullable=True)
    
    student = relationship("StudentProfile", back_populates="tasks")
    mentor = relationship("MentorProfile", back_populates="created_tasks")

class Certificate(Base):
    __tablename__ = "certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, unique=True)
    certificate_code = Column(String, unique=True, index=True, nullable=False) # Verification hash signature
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    hash_signature = Column(String, nullable=False)
    pdf_path = Column(String, nullable=True)
    
    student = relationship("StudentProfile", back_populates="certificate")

class PerformanceMetrics(Base):
    __tablename__ = "performance_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, unique=True)
    calculated_score = Column(Float, default=0.0) # Weighted aggregate score
    predicted_grade = Column(String, default="On Track") # "Outstanding", "On Track", "At Risk"
    completion_probability = Column(Float, default=1.0) # 0.0 to 1.0 probability
    risk_level = Column(String, default="Low") # "Low", "Medium", "High"
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Task-based internship scoring fields (new)
    internship_score = Column(Float, default=100.0)       # 0.0 to 100.0, penalised per missed task
    batch = Column(String, default="Gold Batch")          # "Platinum Batch", "Gold Batch", "Silver Batch", "Remedial Batch"
    eligible_for_completion = Column(Boolean, default=True) # True if internship_score >= 75
    
    student = relationship("StudentProfile", back_populates="performance_metrics")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False, nullable=False)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

