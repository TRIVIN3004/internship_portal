from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, students, mentors, admin, analytics, chat, documents, feedback, announcements

# Initialize FastAPI App
app = FastAPI(
    title="Nexora's Internship Portal API",
    description="Backend services, NLP report parsing, and ML student performance predictions.",
    version="1.0.0"
)

# Global Exception Handler for catching serverless errors gracefully
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"Unhandled Exception on {request.url.path}: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"}
    )

# Initialize database tables safely on startup
@app.on_event("startup")
def startup_db():
    import os
    try:
        is_vercel = os.getenv("VERCEL") == "1"
        upload_dir = "/tmp/uploads" if is_vercel else os.path.join(os.getcwd(), "data", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        if not is_vercel:
            Base.metadata.create_all(bind=engine)
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                if "postgresql" in str(engine.url):
                    conn.execute(text("ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITHOUT TIME ZONE USING due_date::timestamp;"))
                    conn.commit()
        except Exception as migration_err:
            pass
    except Exception as e:
        print(f"Startup initialization warning: {e}")

# CORS configurations for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints (both with /api prefix and root for robust Vercel serverless routing)
all_routers = [auth.router, students.router, mentors.router, admin.router, analytics.router, chat.router, documents.router, feedback.router, announcements.router]
for r in all_routers:
    app.include_router(r, prefix="/api")
    app.include_router(r)




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
