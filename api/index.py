import os
import sys
import shutil
from pathlib import Path

# Add backend directory to Python path
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure working directory is backend for relative model/file loads
os.chdir(str(backend_dir))

# Manage Vercel serverless database seeding to /tmp if using SQLite
is_vercel = os.getenv("VERCEL") or os.getenv("VERCEL_ENV")
database_url = os.getenv("DATABASE_URL", "")

if is_vercel and (not database_url or database_url.startswith("sqlite")):
    tmp_db = Path("/tmp/globetrotter.db")
    source_db = backend_dir / "globetrotter.db"
    
    if not tmp_db.exists() and source_db.exists():
        try:
            shutil.copy2(source_db, tmp_db)
            print(f"[Vercel Init] Copied seed database to {tmp_db}")
        except Exception as e:
            print(f"[Vercel Init] Warning copying seed database: {e}")
            
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db}"

from app.main import app

# Export ASGI application for Vercel Serverless
__all__ = ["app"]
