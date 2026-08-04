import sys
import os

# Add backend directory to sys.path so we can import app modules properly inside Vercel
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

try:
    from app.main import app
except Exception as e:
    import traceback
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI()
    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def catch_all_error(path: str):
        return JSONResponse(
            status_code=500,
            content={"detail": f"Vercel Startup Import Error: {str(e)}", "traceback": err_tb}
        )
