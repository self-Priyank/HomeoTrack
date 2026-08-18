import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of HomeoTrack project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")

DATABASE_FILE = BASE_DIR / "homeotrack.db"

# PostgreSQL configuration settings
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_DB = os.getenv("POSTGRES_DB", "costa")

# Database URL resolution (PostgreSQL if valid POSTGRES_PASSWORD provided, else SQLite fallback)
has_pg_pass = bool(PG_PASSWORD and PG_PASSWORD != "YOUR_POSTGRES_PASSWORD_HERE")
DEFAULT_PG_URL = f"postgresql://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DB}" if has_pg_pass else None
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL or f"sqlite:///{DATABASE_FILE.as_posix()}")

# Path to cloned oorep dataset
OOREP_DIR = BASE_DIR / "oorep"
OOREP_SQL_GZ = OOREP_DIR / "oorep.sql.gz"
