import os
import sys
import tempfile
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

TEST_DB_FILE = "./test_delete_student.db"
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

def test_admin_delete_student_flow():
    db = TestingSessionLocal()

    # 1. Create Admin
    admin_user = models.User(
        email="admin_del_test@nexora.com",
        password_hash=auth.get_password_hash("Admin@123"),
        role="admin"
    )
    db.add(admin_user)

    # 2. Create Mentor
    mentor_user = models.User(
        email="mentor_del_test@nexora.com",
        password_hash=auth.get_password_hash("Mentor@123"),
        role="mentor"
    )
    db.add(mentor_user)
    db.commit()
    db.refresh(mentor_user)

    mentor_prof = models.MentorProfile(
        user_id=mentor_user.id,
        name="Mentor Dr. Alan",
        department="AI",
        specialization="Deep Learning"
    )
    db.add(mentor_prof)

    # 3. Create Student
    student_user = models.User(
        email="student_del_test@nexora.com",
        password_hash=auth.get_password_hash("Student@123"),
        role="student"
    )
    db.add(student_user)
    db.commit()
    db.refresh(student_user)

    student_prof = models.StudentProfile(
        user_id=student_user.id,
        name="Alice ToBeDeleted",
        college="Tech Institute",
        department="Computer Science",
        mentor_id=mentor_prof.id,
        personal_email="alice.personal@gmail.com"
    )
    db.add(student_prof)
    db.commit()
    db.refresh(student_prof)

    # 4. Create child entities: Task, Attendance, DailyReport, Document, Certificate, PerformanceMetrics
    task = models.Task(
        title="Test Task",
        description="Task to be deleted with student",
        assigned_to_student_id=student_prof.id,
        created_by_mentor_id=mentor_prof.id,
        due_date=datetime.datetime.utcnow() + datetime.timedelta(days=7),
        status="assigned"
    )
    db.add(task)

    att = models.Attendance(
        student_id=student_prof.id,
        date=datetime.date.today(),
        status="present"
    )
    db.add(att)

    report = models.DailyReport(
        student_id=student_prof.id,
        date=datetime.date.today(),
        content="Daily progress report",
        hours_spent=8.0,
        status="approved"
    )
    db.add(report)

    # Temp file for document
    doc_fd, doc_path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(doc_fd, 'w') as f:
        f.write("dummy document content")

    doc = models.Document(
        student_id=student_prof.id,
        title="Internship Report",
        file_path=doc_path,
        file_name="report.pdf",
        file_type="application/pdf",
        file_size=20
    )
    db.add(doc)

    # Temp file for certificate
    cert_fd, cert_path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(cert_fd, 'w') as f:
        f.write("dummy certificate content")

    cert = models.Certificate(
        student_id=student_prof.id,
        certificate_code="NX-INT-TEST1234",
        hash_signature="TESTSIG1234",
        pdf_path=cert_path
    )
    db.add(cert)

    metrics = models.PerformanceMetrics(
        student_id=student_prof.id,
        calculated_score=95.0,
        predicted_grade="Outstanding"
    )
    db.add(metrics)

    # Chat messages involving student user
    chat_msg1 = models.ChatMessage(
        sender_id=student_user.id,
        receiver_id=mentor_user.id,
        message="Hello mentor!"
    )
    chat_msg2 = models.ChatMessage(
        sender_id=mentor_user.id,
        receiver_id=student_user.id,
        message="Hello Alice!"
    )
    db.add_all([chat_msg1, chat_msg2])

    # Feedback by student user
    feedback = models.Feedback(
        user_id=student_user.id,
        role="student",
        category="General",
        rating=5,
        subject="Portal Feedback",
        message="Great platform!"
    )
    db.add(feedback)

    db.commit()

    student_id = student_prof.id
    student_uid = student_user.id
    db.close()

    # Verify temp files exist before deletion
    assert os.path.exists(doc_path)
    assert os.path.exists(cert_path)

    # Login tokens
    # Student token
    r_stud_login = client.post("/api/auth/login", data={"username": "student_del_test@nexora.com", "password": "Student@123"})
    assert r_stud_login.status_code == 200
    student_token = r_stud_login.json()["access_token"]

    # Mentor token
    r_ment_login = client.post("/api/auth/login", data={"username": "mentor_del_test@nexora.com", "password": "Mentor@123"})
    assert r_ment_login.status_code == 200
    mentor_token = r_ment_login.json()["access_token"]

    # Admin token
    r_admin_login = client.post("/api/auth/login", data={"username": "admin_del_test@nexora.com", "password": "Admin@123"})
    assert r_admin_login.status_code == 200
    admin_token = r_admin_login.json()["access_token"]

    # 1. Unauthenticated delete attempt -> 401
    r_unauth = client.delete(f"/api/admin/students/{student_id}")
    assert r_unauth.status_code == 401

    # 2. Student trying to delete -> 403
    r_stud_del = client.delete(
        f"/api/admin/students/{student_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert r_stud_del.status_code == 403

    # 3. Mentor trying to delete -> 403
    r_ment_del = client.delete(
        f"/api/admin/students/{student_id}",
        headers={"Authorization": f"Bearer {mentor_token}"}
    )
    assert r_ment_del.status_code == 403

    # 4. Admin deleting non-existent student -> 404
    r_404 = client.delete(
        "/api/admin/students/999999",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r_404.status_code == 404

    # 5. Admin deleting the student -> 200
    r_del = client.delete(
        f"/api/admin/students/{student_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r_del.status_code == 200
    assert "deleted successfully" in r_del.json()["message"]

    # 6. Verify database records are thoroughly cleaned up
    db = TestingSessionLocal()
    assert db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first() is None
    assert db.query(models.User).filter(models.User.id == student_uid).first() is None
    assert db.query(models.Task).filter(models.Task.assigned_to_student_id == student_id).count() == 0
    assert db.query(models.Attendance).filter(models.Attendance.student_id == student_id).count() == 0
    assert db.query(models.DailyReport).filter(models.DailyReport.student_id == student_id).count() == 0
    assert db.query(models.Document).filter(models.Document.student_id == student_id).count() == 0
    assert db.query(models.Certificate).filter(models.Certificate.student_id == student_id).first() is None
    assert db.query(models.PerformanceMetrics).filter(models.PerformanceMetrics.student_id == student_id).first() is None
    assert db.query(models.ChatMessage).filter(
        (models.ChatMessage.sender_id == student_uid) | (models.ChatMessage.receiver_id == student_uid)
    ).count() == 0
    assert db.query(models.Feedback).filter(models.Feedback.user_id == student_uid).count() == 0

    # 7. Verify disk files were removed
    assert not os.path.exists(doc_path)
    assert not os.path.exists(cert_path)

    # 8. Test deleting another student via alternative endpoint /api/students/{student_id}
    student2_user = models.User(
        email="student2_del_test@nexora.com",
        password_hash=auth.get_password_hash("Student2@123"),
        role="student"
    )
    db.add(student2_user)
    db.commit()
    db.refresh(student2_user)

    student2_prof = models.StudentProfile(
        user_id=student2_user.id,
        name="Bob ToBeDeleted",
        college="Tech Institute",
        department="Computer Science"
    )
    db.add(student2_prof)
    db.commit()
    db.refresh(student2_prof)
    student2_id = student2_prof.id
    db.close()

    r_del2 = client.delete(
        f"/api/students/{student2_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r_del2.status_code == 200
    assert "deleted successfully" in r_del2.json()["message"]

    db = TestingSessionLocal()
    assert db.query(models.StudentProfile).filter(models.StudentProfile.id == student2_id).first() is None
    db.close()
