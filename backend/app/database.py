import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

is_vercel = os.getenv("VERCEL") == "1"

# Ensure the data directory exists locally (not needed on Vercel)
if not is_vercel:
    os.makedirs("data", exist_ok=True)

# Database connection URL (reads environment variable, fallbacks to SQLite)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:////tmp/internship.db" if is_vercel else "sqlite:///./data/internship.db"

# Fix for PostgreSQL connection strings that might use postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Serverless optimizations for Vercel
if is_vercel and DATABASE_URL.startswith("postgresql://"):
    # 1. Use connection pooler port (6543) instead of direct connection port (5432) to avoid port blocking/exhaustion
    if ":5432/" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(":5432/", ":6543/")
    # 2. Force sslmode=require for secure serverless connections
    if "sslmode" not in DATABASE_URL:
        separator = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"

# Dynamically set connection arguments based on database engine
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Engine configuration
engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base model class
Base = declarative_base()

# Dependency to inject DB session into endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
