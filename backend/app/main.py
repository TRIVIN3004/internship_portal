from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, students, mentors, admin, analytics

# Initialize FastAPI App
app = FastAPI(
    title="Nexora's Internship Portal API",
    description="Backend services, NLP report parsing, and ML student performance predictions.",
    version="1.0.0"
)

# Initialize database tables safely on startup
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database table initialization failed: {e}")

# CORS configurations for frontend communication
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(mentors.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.get("/api/health")
def health_check():
    import os
    from sqlalchemy import text
    from .database import engine, DATABASE_URL
    from .ai.performance_predictor import MODEL_PATH
    
    db_status = "unknown"
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = "failed"
        # Extract the detailed underlying driver error if present
        if hasattr(e, 'orig') and e.orig is not None:
            orig_err = e.orig
            db_error = f"{type(e).__name__}: {str(e)} (Driver Error: {type(orig_err).__name__} | Args: {getattr(orig_err, 'args', None)} | Msg: {getattr(orig_err, 'pgerror', None)})"
        else:
            db_error = f"{type(e).__name__}: {str(e)}"
        
    model_exists = os.path.exists(MODEL_PATH)
    
    # Check if the connection string contains placeholder indicators
    has_placeholder = False
    if DATABASE_URL:
        has_placeholder = "[" in DATABASE_URL or "]" in DATABASE_URL or "YOUR-PASSWORD" in DATABASE_URL
    
    return {
        "status": "online",
        "database_url_configured": os.getenv("DATABASE_URL") is not None,
        "database_url_has_placeholder": has_placeholder,
        "database_url_masked": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
        "database_connection": db_status,
        "database_error": db_error,
        "model_file_exists": model_exists,
        "model_path_resolved": MODEL_PATH,
        "environment": {
            "VERCEL": os.getenv("VERCEL"),
            "ENV": os.getenv("ENV")
        }
    }

@app.get("/")
def read_root():
    return {
        "status": "online",
        "portal": "Nexora's Internship Portal",
        "docs_url": "/docs"
    }
