import os
import hashlib
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from .. import models, schemas, auth
from .students import recalculate_student_metrics

router = APIRouter(prefix="/admin", tags=["Administrator"])

@router.get("/students", response_model=List[schemas.StudentWithMetricsOut])
def list_all_students(
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    students = db.query(models.StudentProfile).all()
    response = []
    for s in students:
        # Update metrics to ensure they are current
        recalculate_student_metrics(s.id, db)
        
        metrics = s.performance_metrics
        
        # Calculate stats
        total_attendance = len(s.attendance_records)
        present = sum(1 for a in s.attendance_records if a.status == "present")
        attendance_rate = (present / total_attendance) if total_attendance > 0 else 0.85
        
        total_tasks = len(s.tasks)
        completed_tasks = sum(1 for t in s.tasks if t.status == "completed")
        task_completion_rate = (completed_tasks / total_tasks) if total_tasks > 0 else 0.0
        
        task_scores = [t.score for t in s.tasks if t.score is not None]
        avg_task_score = (sum(task_scores) / len(task_scores)) if task_scores else 70.0
        
        avg_report_quality = (sum(r.quality_score for r in s.daily_reports) / len(s.daily_reports)) if s.daily_reports else 70.0
        
        mentor_out = None
        if s.mentor:
            mentor_out = schemas.MentorProfileOut(
                id=s.mentor.id, 
                name=s.mentor.name, 
                department=s.mentor.department, 
                specialization=s.mentor.specialization
            )
            
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
            mentor=mentor_out,
            attendance_rate=round(attendance_rate, 2),
            task_completion_rate=round(task_completion_rate, 2),
            avg_task_score=round(avg_task_score, 1),
            avg_report_quality=round(avg_report_quality, 1),
            predicted_grade=metrics.predicted_grade if metrics else "On Track",
            risk_level=metrics.risk_level if metrics else "Low",
            completion_probability=metrics.completion_probability if metrics else 0.8,
            internship_score=metrics.internship_score if metrics else 100.0,
            batch=metrics.batch if metrics else "Gold Batch",
            eligible_for_completion=metrics.eligible_for_completion if metrics is not None else True,
        )
        response.append(student_data)
        
    return response

@router.get("/mentors", response_model=List[schemas.MentorProfileOut])
def list_all_mentors(
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    mentors = db.query(models.MentorProfile).all()
    res = []
    for m in mentors:
        total_att = len(m.attendance_records)
        present = sum(1 for a in m.attendance_records if a.status == "present")
        att_rate = (present / total_att) if total_att > 0 else 1.0
        res.append(schemas.MentorProfileOut(
            id=m.id,
            name=m.name,
            department=m.department,
            specialization=m.specialization,
            attendance_rate=round(att_rate, 2),
            total_attendance=total_att,
            present_count=present
        ))
    return res

@router.get("/mentors/attendance")
def get_all_mentors_daily_attendance(
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    records = db.query(models.MentorAttendance).order_by(
        models.MentorAttendance.date.desc(), models.MentorAttendance.marked_at.desc()
    ).all()
    
    res = []
    for r in records:
        res.append({
            "id": r.id,
            "mentor_id": r.mentor_id,
            "mentor_name": r.mentor.name if r.mentor else "Unknown",
            "department": r.mentor.department if r.mentor else "General",
            "date": r.date,
            "status": r.status,
            "marked_at": r.marked_at
        })
    return res

@router.post("/students/{student_id}/assign-mentor")
def assign_mentor(
    student_id: int,
    mentor_id: int,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    mentor = db.query(models.MentorProfile).filter(models.MentorProfile.id == mentor_id).first()
    
    if not student or not mentor:
        raise HTTPException(status_code=404, detail="Student or Mentor not found")
        
    student.mentor_id = mentor.id
    db.commit()
    return {"message": f"Student {student.name} assigned to mentor {mentor.name} successfully"}

@router.post("/students/{student_id}/generate-certificate", response_model=schemas.CertificateOut)
def generate_student_certificate(
    student_id: int,
    admin: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(get_db)
):
    student = db.query(models.StudentProfile).filter(models.StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # --- Eligibility Gate: Block certificate if internship score < 75% ---
    recalculate_student_metrics(student.id, db)
    metrics = student.performance_metrics
    if metrics and not metrics.eligible_for_completion:
        raise HTTPException(
            status_code=400,
            detail=f"Student '{student.name}' is not eligible for a certificate. "
                   f"Current internship score: {metrics.internship_score}% (minimum required: 75%). "
                   f"Batch: {metrics.batch}."
        )
        
    # Check if certificate already exists
    cert = student.certificate
    
    # Path configuration - support Vercel writable /tmp directory
    is_vercel = os.getenv("VERCEL") == "1"
    certs_dir = "/tmp/certificates" if is_vercel else "data/certificates"
    os.makedirs(certs_dir, exist_ok=True)
    pdf_filename = f"certificate_{student.id}.pdf"
    pdf_path = os.path.join(certs_dir, pdf_filename)
    
    # Extract course/mentor details
    mentor_name = student.mentor.name if student.mentor else "Dr. Sarah Jenkins"
    start_date = student.start_date or datetime.date(2026, 6, 1)
    end_date = student.end_date or datetime.date(2026, 8, 31)
    grade = student.performance_metrics.predicted_grade if student.performance_metrics else "On Track"
    
    if cert:
        # Re-generate the PDF file to ensure it has the latest correct template design
        create_pdf_certificate(
            pdf_path, 
            student.name, 
            student.internship_domain or "Artificial Intelligence", 
            cert.certificate_code,
            start_date,
            end_date,
            mentor_name,
            grade
        )
        return cert
        
    # Validation Code Generation: dynamic MD5/SHA256 signature
    timestamp = datetime.datetime.utcnow().isoformat()
    raw_signature = f"{student.id}-{student.name}-{timestamp}-Nexora"
    hash_sig = hashlib.sha256(raw_signature.encode()).hexdigest()[:16].upper()
    certificate_code = f"NX-INT-{hash_sig}"
    
    # Create the PDF Certificate
    create_pdf_certificate(
        pdf_path, 
        student.name, 
        student.internship_domain or "Artificial Intelligence", 
        certificate_code,
        start_date,
        end_date,
        mentor_name,
        grade
    )
    
    # Write to database
    new_cert = models.Certificate(
        student_id=student.id,
        certificate_code=certificate_code,
        hash_signature=hash_sig,
        pdf_path=pdf_path
    )
    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)
    
    return new_cert


@router.get("/certificates/download/{student_id}")
def download_certificate(
    student_id: int,
    db: Session = Depends(get_db)
):
    # Public download endpoint
    cert = db.query(models.Certificate).filter(models.Certificate.student_id == student_id).first()
    if not cert:
        raise HTTPException(
            status_code=404, 
            detail="Certificate not found. Ensure it has been issued by the Admin."
        )
        
    student = cert.student
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Path configuration - support Vercel writable /tmp directory
    is_vercel = os.getenv("VERCEL") == "1"
    certs_dir = "/tmp/certificates" if is_vercel else "data/certificates"
    os.makedirs(certs_dir, exist_ok=True)
    pdf_filename = f"certificate_{student.id}.pdf"
    pdf_path = os.path.join(certs_dir, pdf_filename)
    
    # Extract course/mentor details dynamically to ensure latest details are shown
    mentor_name = student.mentor.name if student.mentor else "Dr. Sarah Jenkins"
    start_date = student.start_date or datetime.date(2026, 6, 1)
    end_date = student.end_date or datetime.date(2026, 8, 31)
    grade = student.performance_metrics.predicted_grade if student.performance_metrics else "On Track"
    
    # Re-generate the PDF file to ensure it has the latest correct template design and database values
    create_pdf_certificate(
        pdf_path, 
        student.name, 
        student.internship_domain or "Artificial Intelligence", 
        cert.certificate_code,
        start_date,
        end_date,
        mentor_name,
        grade
    )
    
    # Update pdf_path in database if it was null or different
    if cert.pdf_path != pdf_path:
        cert.pdf_path = pdf_path
        db.commit()
        
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"Nexora_Certificate_{student_id}.pdf"
    )


@router.get("/verify-certificate/{code}")
def verify_certificate_code(code: str, db: Session = Depends(get_db)):
    cert = db.query(models.Certificate).filter(models.Certificate.certificate_code == code).first()
    if not cert:
        return {"valid": False, "message": "Certificate verification failed. Code is invalid."}
        
    student = cert.student
    return {
        "valid": True,
        "message": "Certificate verified successfully",
        "student_name": student.name,
        "college": student.college,
        "domain": student.internship_domain,
        "issued_at": cert.issued_at.strftime("%Y-%m-%d")
    }


# --- PDF Generation Canvas layout function ---
def create_pdf_certificate(
    filepath: str, 
    student_name: str, 
    domain: str, 
    code: str,
    start_date: datetime.date,
    end_date: datetime.date,
    mentor_name: str,
    grade: str
):
    import math
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors

    # Setup canvas on landscape Letter size
    c = canvas.Canvas(filepath, pagesize=landscape(letter))
    width, height = landscape(letter) # 792 x 612
    
    # Draw Background Background frame - light theme soft slate-50
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Outer Border frame - elegant gold
    c.setStrokeColor(colors.HexColor("#c5a880"))
    c.setLineWidth(3)
    c.rect(20, 20, width - 40, height - 40, fill=False, stroke=True)
    
    # Inner border lines - soft light slate
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.rect(30, 30, width - 60, height - 60, fill=False, stroke=True)
    
    # Corner decorative L-shaped lines (Elegant light theme accents)
    c.setStrokeColor(colors.HexColor("#c5a880"))
    c.setLineWidth(1.5)
    # Top-Left
    c.line(35, height - 55, 35, height - 35)
    c.line(35, height - 35, 55, height - 35)
    # Top-Right
    c.line(width - 35, height - 55, width - 35, height - 35)
    c.line(width - 35, height - 35, width - 55, height - 35)
    # Bottom-Left
    c.line(35, 55, 35, 35)
    c.line(35, 35, 55, 35)
    # Bottom-Right
    c.line(width - 35, 55, width - 35, 35)
    c.line(width - 35, 35, width - 55, 35)
    
    # Modern Vector Logo / Custom Image Logo
    logo_x = width / 2.0
    logo_y = height - 80
    
    # Check if a custom logo image exists in assets directory
    router_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(router_dir)
    assets_dir = os.path.join(app_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    logo_file = None
    for ext in [".png", ".jpg", ".jpeg"]:
        path = os.path.join(assets_dir, f"logo{ext}")
        if os.path.exists(path):
            logo_file = path
            break
            
    if logo_file:
        # Draw the custom logo image centered at logo_x, logo_y
        c.drawImage(logo_file, logo_x - 22, logo_y - 22, width=44, height=44, mask='auto')
    else:
        # Fallback: Elegant stylized 'N' crest inside a gold circle
        # Outer gold circle
        c.setStrokeColor(colors.HexColor("#c5a880"))
        c.setLineWidth(1.5)
        c.circle(logo_x, logo_y, 22, fill=False, stroke=True)
        
        # Stylized N points: Left vertical bar, Right vertical bar, Diagonal bridge
        c.setFillColor(colors.HexColor("#c5a880"))
        # Left pillar
        c.rect(logo_x - 9, logo_y - 10, 4, 20, fill=True, stroke=False)
        # Right pillar
        c.rect(logo_x + 5, logo_y - 10, 4, 20, fill=True, stroke=False)
        # Diagonal bridge
        p_diag = c.beginPath()
        p_diag.moveTo(logo_x - 9, logo_y + 10)
        p_diag.lineTo(logo_x - 5, logo_y + 10)
        p_diag.lineTo(logo_x + 5, logo_y - 10)
        p_diag.lineTo(logo_x + 1, logo_y - 10)
        p_diag.close()
        c.drawPath(p_diag, fill=True, stroke=False)
    
    # Company Header Title - elegant dark charcoal
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawCentredString(width / 2.0, height - 122, "NEXORA TECHNOLOGIES")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(width / 2.0, height - 135, "Building Tommorrow,Today")
    
    # Thin divider line
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.line(width / 2.0 - 120, height - 147, width / 2.0 + 120, height - 147)
    
    # Certificate Title - deep slate-900 / navy
    c.setFont("Times-BoldItalic", 28)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(width / 2.0, height - 195, "Certificate of Completion")
    
    c.setFont("Helvetica", 14)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawCentredString(width / 2.0, height - 230, "This is proudly presented to")
    
    # Student Name - deep slate-900
    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(width / 2.0, height - 280, student_name)
    
    # Underlying accent line - gold
    c.setStrokeColor(colors.HexColor("#c5a880"))
    c.setLineWidth(1.5)
    c.line(width / 2.0 - 150, height - 290, width / 2.0 + 150, height - 290)
    
    # Description text
    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#475569"))
    desc = "for successfully completing an industry-level professional internship in the domain of"
    c.drawCentredString(width / 2.0, height - 320, desc)
    
    # Domain - Navy
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    c.drawCentredString(width / 2.0, height - 350, f"{domain} Program")
    
    # Internship Details Card - light slate-50 fill
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.roundRect(width / 2.0 - 240, height - 425, 480, 50, 6, fill=True, stroke=True)
    
    # Write details inside the card
    card_y = height - 400
    # Left column: Duration
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(width / 2.0 - 220, card_y + 12, "INTERNSHIP DURATION")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(width / 2.0 - 220, card_y - 2, "8 Weeks")
    
    # Center column: Period
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(width / 2.0 - 100, card_y + 12, "INTERNSHIP PERIOD")
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#0f172a"))
    period_str = f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"
    c.drawString(width / 2.0 - 100, card_y - 2, period_str)
    
    # Right column: Grade
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(width / 2.0 + 110, card_y + 12, "EVALUATION GRADE")
    c.setFont("Helvetica-Bold", 10)
    if grade == "Outstanding":
        c.setFillColor(colors.HexColor("#059669")) # Darker Green
    elif grade == "On Track":
        c.setFillColor(colors.HexColor("#2563eb")) # Darker Blue
    else:
        c.setFillColor(colors.HexColor("#dc2626")) # Darker Red
    c.drawString(width / 2.0 + 110, card_y - 2, grade)
    
    # Signatures
    sig_y = 115
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(1)
    
    # Left: Founder
    c.line(100, sig_y + 5, 280, sig_y + 5)
    c.setFont("Times-BoldItalic", 20)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    c.drawCentredString(190, sig_y + 18, "Trivin")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(190, sig_y - 8, "TRIVIN")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawCentredString(190, sig_y - 18, "Founder & CEO, Nexora Technologies")
    
    # Right: Academic Mentor
    c.line(width - 280, sig_y + 5, width - 100, sig_y + 5)
    c.setFont("Times-BoldItalic", 20)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    
    # Strip prefix titles like Dr., Prof., Mr., Ms. from the mentor's name
    sig_name = mentor_name
    for prefix in ["Dr. ", "Prof. ", "Mr. ", "Ms. ", "Mrs. ", "Dr ", "Prof "]:
        if sig_name.lower().startswith(prefix.lower()):
            sig_name = sig_name[len(prefix):]
            
    mentor_sig = sig_name.split()[0] if sig_name else "Mentor"
    c.drawCentredString(width - 190, sig_y + 18, mentor_sig)
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawCentredString(width - 190, sig_y - 8, mentor_name.upper())
    
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawCentredString(width - 190, sig_y - 18, "Academic Mentor, Nexora Technologies")
    
    # Verification details
    c.setFont("Courier", 9)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    c.drawString(45, 60, f"VERIFICATION CODE: {code}")
    c.setFont("Courier", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(45, 46, "Verify authenticity at: http://localhost:3000/verify-certificate")
    
    c.setFont("Courier", 9)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawRightString(width - 45, 60, f"ISSUED: {datetime.date.today().strftime('%B %d, %Y')}")
    
    c.save()
