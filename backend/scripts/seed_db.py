import sys
import os
import datetime
from sqlalchemy.orm import Session

# Add parent directory to sys path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models, auth

def seed():
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    print("Database seeding started...")
    
    # 1. Create Admin User
    admin_pw = auth.get_password_hash("Nexora@123")
    admin_user = models.User(
        email="trivin@nexora.com",
        password_hash=admin_pw,
        role="admin"
    )
    db.add(admin_user)
    db.commit()
    
    print("Database seeding completed. 1 Admin (trivin@nexora.com) created. Demo data cleared.")
    db.close()

if __name__ == "__main__":
    seed()
