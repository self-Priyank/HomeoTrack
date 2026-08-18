import os
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from homeotrack.api.router import router

REACT_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(
    title="HomeoTrack CDSS",
    description="AI-First Homeopathic Clinical Decision Support System",
    version="0.1.0",
)

# Mount API router
app.include_router(router)

# Mount React production assets if present
if (REACT_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(REACT_DIST_DIR / "assets")), name="react-assets")
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
@app.get("/{full_path:path}", include_in_schema=False)
def serve_home(full_path: str = ""):
    """Serve React frontend application for root and client routes."""
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return None
    if (REACT_DIST_DIR / "index.html").exists():
        return FileResponse(REACT_DIST_DIR / "index.html")
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "HomeoTrack CDSS API Running. Open /docs for API Swagger documentation."}


def main():
    """Runs Uvicorn development server."""
    print("[HomeoTrack Server] Starting HomeoTrack CDSS Interactive Demonstration Server...")
    print("[HomeoTrack Server] Access Web Prototype UI at: http://127.0.0.1:8000")
    print("[HomeoTrack Server] Access API Documentation at: http://127.0.0.1:8000/docs")
    uvicorn.run("homeotrack.api.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
