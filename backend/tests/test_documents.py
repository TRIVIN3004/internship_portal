import os
import sys
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import get_db, Base
from app import models, auth

# Use a temporary SQLite database for testing
TEST_DB_FILE = "./test_temp.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def test_mentor_view_download_documents():
    # Clean up test DB if left over
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    try:
        # 1. Create a Mentor User & Profile
        mentor_user = models.User(
            email="mentor@example.com",
            password_hash=auth.get_password_hash("password"),
            role="mentor"
        )
        db.add(mentor_user)
        db.commit()
        db.refresh(mentor_user)

        mentor_profile = models.MentorProfile(
            user_id=mentor_user.id,
            name="Dr. Smith",
            department="Computer Science",
            specialization="Web Development"
        )
        db.add(mentor_profile)
        db.commit()
        db.refresh(mentor_profile)

        # 2. Create a Student User & Profile, assigned to the mentor
        student_user = models.User(
            email="student@example.com",
            password_hash=auth.get_password_hash("password"),
            role="student"
        )
        db.add(student_user)
        db.commit()
        db.refresh(student_user)

        student_profile = models.StudentProfile(
            user_id=student_user.id,
            name="John Doe",
            college="State University",
            department="Computer Science",
            mentor_id=mentor_profile.id
        )
        db.add(student_profile)
        db.commit()
        db.refresh(student_profile)

        # Create a dummy file on disk for the document
        temp_fd, temp_file_path = tempfile.mkstemp()
        with os.fdopen(temp_fd, 'w') as tmp:
            tmp.write("dummy content")

        # 3. Create a Document uploaded by the student
        document = models.Document(
            student_id=student_profile.id,
            title="My Internship Report",
            description="Weekly progress description",
            file_path=temp_file_path,
            file_name="report.pdf",
            file_type="application/pdf",
            file_size=13
        )
        db.add(document)
        db.commit()
        db.refresh(document)

        # Generate access token for the mentor
        mentor_token = auth.create_access_token(
            data={"sub": mentor_user.email, "role": mentor_user.role}
        )

        client = TestClient(app)

        # Test Case A: View document with header token
        headers = {"Authorization": f"Bearer {mentor_token}"}
        resp = client.get(f"/api/documents/{document.id}/view", headers=headers)
        assert resp.status_code == 200
        assert resp.content == b"dummy content"

        # Test Case B: Download document with header token
        resp = client.get(f"/api/documents/{document.id}/download", headers=headers)
        assert resp.status_code == 200
        assert resp.content == b"dummy content"

        # Test Case C: View document with query token (similar to window.open call)
        resp = client.get(f"/api/documents/{document.id}/view?token={mentor_token}")
        assert resp.status_code == 200
        assert resp.content == b"dummy content"

        # Test Case D: Download document with query token
        resp = client.get(f"/api/documents/{document.id}/download?token={mentor_token}")
        assert resp.status_code == 200
        assert resp.content == b"dummy content"

    finally:
        db.close()
        # Clean up temporary file
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        # Drop tables and close engine connection
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except OSError:
                pass
        # Clear dependency overrides
        app.dependency_overrides.clear()
