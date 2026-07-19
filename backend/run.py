import os
import subprocess
import sys
import uvicorn

if __name__ == "__main__":
    db_path = "data/internship.db"
    
    # Auto-seed the database if it doesn't exist
    if not os.path.exists(db_path):
        print("Database not found. Triggering database seed script...")
        try:
            # Run seed script
            seed_script = os.path.join(os.path.dirname(__file__), "scripts", "seed_db.py")
            subprocess.run([sys.executable, seed_script], check=True)
        except Exception as e:
            print(f"Failed to auto-seed database: {e}")
            
    print("Starting FastAPI Backend Server on http://127.0.0.1:8000...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
