import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from homeotrack.config import DATABASE_URL, PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DB
from homeotrack.database.models import Base

is_sqlite = DATABASE_URL.startswith("sqlite")


def ensure_postgres_db_exists():
    """Ensure the target PostgreSQL database exists on the local server."""
    if is_sqlite or not PG_PASSWORD or PG_PASSWORD == "YOUR_POSTGRES_PASSWORD_HERE":
        return
    try:
        conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASSWORD, dbname=PG_DB
        )
        conn.close()
    except psycopg2.OperationalError as e:
        if f'database "{PG_DB}" does not exist' in str(e):
            print(f"[Database Setup] Database '{PG_DB}' does not exist on PostgreSQL server. Creating '{PG_DB}'...")
            admin_conn = psycopg2.connect(
                host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASSWORD, dbname="postgres"
            )
            admin_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = admin_conn.cursor()
            cursor.execute(f'CREATE DATABASE "{PG_DB}";')
            cursor.close()
            admin_conn.close()
            print(f"[Database Setup] Database '{PG_DB}' created successfully!")


# Automatically verify/create database before creating engine
ensure_postgres_db_exists()

# Engine configuration supporting PostgreSQL & SQLite
engine_args = {
    "echo": False,
    "pool_pre_ping": True,
}
if is_sqlite:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all database tables on PostgreSQL / SQLite server."""
    ensure_postgres_db_exists()
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency generator for FastAPI DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
