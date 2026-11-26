#!/bin/sh
set -e
echo "==> Veritabanı migration'ları uygulanıyor..."
alembic upgrade head
echo "==> Başlangıç verileri kontrol ediliyor (tekrar çalıştırılabilir)..."
python -m app.cli init
echo "==> API başlatılıyor..."
# SQLite eşzamanlı yazma sınırlaması nedeniyle tek worker kullanılır
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips="*"
