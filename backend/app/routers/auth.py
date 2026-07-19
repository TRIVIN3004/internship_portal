from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import datetime
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )
        
    hashed_password = auth.get_password_hash(user_in.password)
    
    # Create main user record
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Attach profiles depending on role
    if user_in.role == "student":
        student = models.StudentProfile(
            user_id=new_user.id,
            name=user_in.name,
            college=user_in.college,
            department=user_in.department,
            skills=user_in.skills,
            internship_domain=user_in.internship_domain,
            start_date=datetime.date.today() if hasattr(datetime, 'date') else None,
            end_date=None
        )
        db.add(student)
        db.flush()
        
        # Initialize blank metrics
        metrics = models.PerformanceMetrics(
            student_id=student.id,
            calculated_score=60.0,
            predicted_grade="On Track",
            completion_probability=0.8,
            risk_level="Low"
        )
        db.add(metrics)
        
    elif user_in.role == "mentor":
        mentor = models.MentorProfile(
            user_id=new_user.id,
            name=user_in.name,
            department=user_in.department,
            specialization=user_in.internship_domain
        )
        db.add(mentor)
        
    db.commit()
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Find profile ID and name
    profile_id = None
    name = "System Admin"
    
    if user.role == "student" and user.student_profile:
        profile_id = user.student_profile.id
        name = user.student_profile.name
    elif user.role == "mentor" and user.mentor_profile:
        profile_id = user.mentor_profile.id
        name = user.mentor_profile.name
        
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "profile_id": profile_id,
        "name": name
    }

# Python standard datetime helper setup
import datetime
