"""SQLAlchemy bağlantısı. SQLite için foreign key, WAL ve busy_timeout ayarlanır.
PostgreSQL'e geçişte yalnızca DATABASE_URL değiştirilmesi yeterlidir."""
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

is_sqlite = settings.database_url.startswith("sqlite")

if is_sqlite:
    db_path = settings.database_url.replace("sqlite:///", "")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False, "timeout": 30} if is_sqlite else {},
    pool_pre_ping=True,
)

if is_sqlite:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")  # ilişkisel bütünlük
        cur.execute("PRAGMA journal_mode=WAL")  # okuma/yazma eşzamanlılığı
        cur.execute("PRAGMA busy_timeout=5000")  # kilitlenmede bekle
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
