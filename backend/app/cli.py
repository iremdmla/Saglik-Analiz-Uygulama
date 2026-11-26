"""Yönetim komutları.

python -m app.cli init          # katalog + admin + demo verisi (tekrar çalıştırılabilir)
python -m app.cli reset-demo    # yalnızca demo kayıtlarını silip yeniden oluşturur
python -m app.cli create-admin --email x@y.com --password '...' [--username ad]
python -m app.cli backup        # SQLite veritabanının tutarlı yedeğini alır
"""
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

from . import seed
from .config import settings
from .database import SessionLocal
from .models import HealthProfile, User
from .security import hash_password


def create_admin(email: str, password: str, username: str | None) -> None:
    if len(password) < 12:
        raise SystemExit("Yönetici şifresi en az 12 karakter olmalı.")
    with SessionLocal() as db:
        if db.query(User).filter_by(email=email.lower()).first():
            raise SystemExit("Bu e-posta ile bir kullanıcı zaten var.")
        db.add(User(email=email.lower(), username=username, full_name="Yönetici", role="ADMIN",
                    hashed_password=hash_password(password), profile=HealthProfile()))
        db.commit()
    print(f"Yönetici oluşturuldu: {email}")


def backup() -> None:
    if not settings.database_url.startswith("sqlite"):
        raise SystemExit("Yedekleme komutu yalnızca SQLite için geçerlidir.")
    src = settings.database_url.replace("sqlite:///", "")
    out_dir = Path(settings.backup_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f"app-{datetime.now():%Y%m%d-%H%M%S}.db"
    # sqlite3 backup API: uygulama çalışırken de tutarlı kopya alır
    with sqlite3.connect(src) as s, sqlite3.connect(dest) as d:
        s.backup(d)
    print(f"Yedek alındı: {dest}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init")
    sub.add_parser("reset-demo")
    sub.add_parser("backup")
    ca = sub.add_parser("create-admin")
    ca.add_argument("--email", required=True)
    ca.add_argument("--password", required=True)
    ca.add_argument("--username")
    args = parser.parse_args()

    if args.cmd == "init":
        with SessionLocal() as db:
            seed.run(db)
        print("Başlangıç verileri hazır.")
    elif args.cmd == "reset-demo":
        with SessionLocal() as db:
            seed.reset_demo(db)
        print("Demo verileri yeniden oluşturuldu.")
    elif args.cmd == "backup":
        backup()
    elif args.cmd == "create-admin":
        create_admin(args.email, args.password, args.username)


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
