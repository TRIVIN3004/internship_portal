import os
import sys
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import get_db, Base
from app import models, auth
from app.email_service import build_task_assignment_html, send_task_assignment_email

TEST_DB_FILE = "./test_email_profiles.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    app.dependency_overrides.pop(get_db, None)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

def test_build_task_assignment_html():
    html = build_task_assignment_html(
        student_name="Alice Student",
        task_title="Build Neural Network Classifier",
        task_description="Implement PyTorch MLP model",
        due_date_str="Friday, September 15, 2026 at 11:59 PM",
        mentor_name="Dr. Sarah Jenkins",
        mentor_email="sarah.jenkins@university.edu"
    )
    assert "Alice Student" in html
    assert "Build Neural Network Classifier" in html
    assert "Implement PyTorch MLP model" in html
    assert "Dr. Sarah Jenkins" in html
    assert "sarah.jenkins@university.edu" in html
    assert "NEXORA" in html

def test_send_task_assignment_email_simulation_mode():
    # Without RESEND_API_KEY, should gracefully return simulated status
    res = send_task_assignment_email(
        to_email="student.personal@gmail.com",
        student_name="Bob Intern",
        task_title="Data Cleaning Pipeline",
        task_description="Clean customer dataset with Pandas",
        due_date=datetime.datetime(2026, 9, 20, 18, 0),
        mentor_name="Prof. Alan Turing",
        mentor_email="alan@turing.edu"
    )
    assert res["status"] in ["simulated", "sent"]

def test_send_task_assignment_email_invalid_address():
    res = send_task_assignment_email(
        to_email="",
        student_name="Bob",
        task_title="Test",
        task_description="Test",
        due_date=None,
        mentor_name="Mentor"
    )
    assert res["status"] == "skipped"

def test_student_and_mentor_registration_with_personal_emails():
    # 1. Register Student with Personal Email
    student_payload = {
        "email": "student_login@nexora.com",
        "personal_email": "student.personal@gmail.com",
        "password": "Password@123",
        "role": "student",
        "name": "Jane Intern",
        "college": "MIT",
        "department": "AI & DS",
        "skills": "Python, PyTorch",
        "internship_domain": "Artificial Intelligence"
    }
    r_stud = client.post("/api/auth/register", json=student_payload)
    assert r_stud.status_code == 201

    # 2. Register Mentor with Mentor Email
    mentor_payload = {
        "email": "mentor_login@nexora.com",
        "mentor_email": "mentor.official@university.edu",
        "password": "Password@123",
        "role": "mentor",
        "name": "Dr. Mentor",
        "department": "Computer Science",
        "internship_domain": "Artificial Intelligence"
    }
    r_ment = client.post("/api/auth/register", json=mentor_payload)
    assert r_ment.status_code == 201

    db = TestingSessionLocal()
    student_profile = db.query(models.StudentProfile).filter(models.StudentProfile.name == "Jane Intern").first()
    assert student_profile is not None
    assert student_profile.personal_email == "student.personal@gmail.com"

    mentor_profile = db.query(models.MentorProfile).filter(models.MentorProfile.name == "Dr. Mentor").first()
    assert mentor_profile is not None
    assert mentor_profile.mentor_email == "mentor.official@university.edu"

    # Assign student to mentor
    student_profile.mentor_id = mentor_profile.id
    db.commit()

    # 3. Mentor logs in and assigns a task
    login_res = client.post("/api/auth/login", data={"username": "mentor_login@nexora.com", "password": "Password@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    task_payload = {
        "title": "NLP Sentiment Model",
        "description": "Build fine-tuned sentiment classifier",
        "assigned_to_student_id": student_profile.id,
        "due_date": datetime.datetime(2026, 9, 30, 23, 59).isoformat()
    }
    task_res = client.post(
        "/api/mentors/tasks",
        json=task_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert task_res.status_code == 201
    created_task = task_res.json()
    assert created_task["title"] == "NLP Sentiment Model"
    assert created_task["assigned_to_student_id"] == student_profile.id
