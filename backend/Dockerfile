FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    DATABASE_URL=sqlite:////app/database/app.db \
    UPLOAD_DIR=/app/database/uploads \
    BACKUP_DIR=/app/database/backups

# OCR için Tesseract (Türkçe dil paketiyle). İnternet kısıtlı ortamlarda
# "docker compose build --build-arg INSTALL_OCR=false" ile atlanabilir; uygulama OCR'sız çalışır.
ARG INSTALL_OCR=true
RUN if [ "$INSTALL_OCR" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-tur \
      && rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Root olmayan kullanıcı; veri klasörü bu kullanıcıya ait (volume ilk oluşturulurken sahiplik korunur)
RUN useradd --uid 10001 --create-home appuser && mkdir -p /app/database/uploads /app/database/backups \
    && chown -R appuser:appuser /app/database
COPY --chown=appuser:appuser . .
RUN chmod +x entrypoint.sh

USER appuser
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1
ENTRYPOINT ["./entrypoint.sh"]
