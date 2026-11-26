"""Uygulama ayarları. Tüm değerler environment değişkenlerinden (.env) okunur."""
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HealthTrack AI"
    environment: str = "development"  # development | demo | production

    # Veritabanı: varsayılan olarak backend/database/app.db
    database_url: str = f"sqlite:///{BASE_DIR / 'database' / 'app.db'}"
    upload_dir: str = str(BASE_DIR / "database" / "uploads")
    backup_dir: str = str(BASE_DIR / "database" / "backups")
    max_upload_mb: int = 10

    # JWT
    jwt_secret: str = "change-me-in-env-please-use-a-long-random-string"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    # Cookie: yerel HTTP demoda secure=False, HTTPS üretimde True olmalı
    cookie_secure: bool = False
    cookie_samesite: str = "strict"

    # CORS: reverse proxy ile aynı origin kullanıldığında boş kalabilir
    cors_origins: str = ""

    # İlk admin hesabı
    admin_email: str = "admin@healthtrack.local"
    admin_username: str = "admin"
    admin_password: str = ""

    # Demo verisi
    seed_demo_data: bool = True
    demo_user_password: str = ""

    # Yapay zekâ
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _check_production(self):
        if self.is_production:
            if self.jwt_secret.startswith("change-me") or len(self.jwt_secret) < 32:
                raise ValueError("Üretimde JWT_SECRET en az 32 karakterlik rastgele bir değer olmalı.")
            if not self.cookie_secure:
                raise ValueError("Üretimde COOKIE_SECURE=true olmalı (HTTPS).")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
