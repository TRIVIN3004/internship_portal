import sys
import os
import datetime
from sqlalchemy.orm import Session

# Add backend directory to path
sys.path.append(os.path.dirname(__file__))

from app.database import SessionLocal
from app import models
from app.routers.admin import create_pdf_certificate

def main():
    db = SessionLocal()
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == 1).first()
    if not student:
        print("Student not found")
        return
        
    mentor_name = student.mentor.name if student.mentor else "Dr. Sarah Jenkins"
    start_date = student.start_date or datetime.date(2026, 6, 1)
    end_date = student.end_date or datetime.date(2026, 8, 31)
    grade = student.performance_metrics.predicted_grade if student.performance_metrics else "On Track"
    
    os.makedirs("data/test_certificates", exist_ok=True)
    pdf_path = "data/test_certificates/test_cert_1.pdf"
    
    create_pdf_certificate(
        pdf_path,
        student.name,
        student.internship_domain or "Artificial Intelligence",
        "NX-INT-TEST-HASH",
        start_date,
        end_date,
        mentor_name,
        grade
    )
    print(f"Generated test certificate at: {pdf_path}")
    db.close()

if __name__ == "__main__":
    main()
