import sys
import os

# Add backend directory to sys.path so we can import app modules properly inside Vercel
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import app
