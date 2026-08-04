import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

is_vercel = os.getenv("VERCEL") == "1"

# Ensure the data directory exists locally (not needed on Vercel)
if not is_vercel:
    os.makedirs("data", exist_ok=True)

# Database connection URL (reads environment variable, fallbacks to Supabase PostgreSQL)
DEFAULT_SUPABASE_URL = "postgresql://postgres.eyfpckbiggamoqcukdvg:Trivinsakthi%40123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
DATABASE_URL = os.getenv("DATABASE_URL") or DEFAULT_SUPABASE_URL

# Fix for PostgreSQL connection strings that might use postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Serverless optimizations for Vercel
if is_vercel and DATABASE_URL.startswith("postgresql://"):
    # Force sslmode=require for secure serverless connections
    if "sslmode" not in DATABASE_URL:
        separator = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"

from sqlalchemy.pool import NullPool

# Dynamically set connection arguments based on database engine
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {"connect_args": connect_args}
if not is_sqlite:
    if is_vercel:
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 10
        })

# Engine configuration
engine = create_engine(
    DATABASE_URL, 
    **engine_kwargs
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base model class
Base = declarative_base()

_tables_initialized = False

def ensure_tables_exist():
    global _tables_initialized
    if not _tables_initialized:
        if is_vercel:
            _tables_initialized = True
            return
        try:
            # Import models to register them with Base before create_all
            from . import models
            Base.metadata.create_all(bind=engine)
            _tables_initialized = True
        except Exception as e:
            print(f"Table initialization warning: {e}")

# Dependency to inject DB session into endpoints
def get_db():
    ensure_tables_exist()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

