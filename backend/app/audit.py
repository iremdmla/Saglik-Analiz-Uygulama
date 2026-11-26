"""Merkezi denetim (audit) log kaydı. Loglar yalnızca backend'de üretilir.
Şifre, token, rapor içeriği veya sağlık değerleri loglara YAZILMAZ."""
from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("X-Forwarded-For")  # nginx reverse proxy
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return request.client.host if request.client else None


def log(
    db: Session,
    request: Request | None,
    action: str,
    description: str,
    user=None,
    actor: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    success: bool = True,
    commit: bool = True,
) -> None:
    db.add(AuditLog(
        user_id=user.id if user else None,
        actor=actor or (user.email if user else None),
        action=action,
        description=description[:255],
        entity_type=entity_type,
        entity_id=entity_id,
        success=success,
        ip_address=client_ip(request),
    ))
    if commit:
        db.commit()
