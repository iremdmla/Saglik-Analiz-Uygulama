"""Kimlik doğrulama ve yetkilendirme yardımcıları.

- Şifreler bcrypt ile hashlenir.
- Access token: kısa ömürlü JWT, yalnızca tarayıcı belleğinde tutulur.
- Refresh token: rastgele değer, HttpOnly cookie'de taşınır, DB'de SHA-256 hash'i saklanır.
  Her yenilemede döndürülür (rotation); iptal edilmiş bir token tekrar kullanılırsa
  o zincirin (family) tamamı iptal edilir.
- CSRF: refresh/logout isteklerinde double-submit cookie (X-CSRF-Token başlığı) kontrol edilir.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import audit
from .config import settings
from .database import get_db
from .models import RefreshToken, User, utcnow

REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def issue_refresh_token(db: Session, user: User, family_id: str | None = None) -> str:
    raw = secrets.token_urlsafe(48)
    db.add(RefreshToken(
        user_id=user.id,
        token_hash=_sha256(raw),
        family_id=family_id or str(uuid.uuid4()),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
    ))
    return raw


def set_auth_cookies(response: Response, refresh_raw: str) -> None:
    common = dict(secure=settings.cookie_secure, samesite=settings.cookie_samesite)
    max_age = settings.refresh_token_days * 86400
    response.set_cookie(REFRESH_COOKIE, refresh_raw, httponly=True, path="/api/auth", max_age=max_age, **common)
    response.set_cookie(CSRF_COOKIE, secrets.token_urlsafe(24), httponly=False, path="/", max_age=max_age, **common)


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")
    response.delete_cookie(CSRF_COOKIE, path="/")


def verify_csrf(request: Request) -> None:
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get("X-CSRF-Token")
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF doğrulaması başarısız.")


def rotate_refresh_token(db: Session, raw: str) -> tuple[User, str]:
    """Geçerli refresh token'ı iptal eder, aynı zincirde yenisini üretir."""
    token = db.query(RefreshToken).filter_by(token_hash=_sha256(raw)).first()
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Oturum geçersiz.")
    if token.revoked_at is not None:
        # Birkaç saniye içindeki tekrar: çoklu sekme yarışı olabilir; zinciri iptal etmeden reddet
        if (utcnow() - token.revoked_at).total_seconds() < 10:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Oturum yenileniyor, tekrar deneyin.")
        # Tekrar kullanım (token hırsızlığı şüphesi): zincirin tamamını iptal et
        db.query(RefreshToken).filter(
            RefreshToken.family_id == token.family_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": utcnow()})
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Oturum geçersiz.")
    user = db.get(User, token.user_id)
    if token.expires_at < utcnow() or not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Oturum süresi doldu.")
    token.revoked_at = utcnow()
    new_raw = issue_refresh_token(db, user, token.family_id)
    db.commit()
    return user, new_raw


def revoke_refresh_token(db: Session, raw: str | None) -> None:
    if not raw:
        return
    token = db.query(RefreshToken).filter_by(token_hash=_sha256(raw)).first()
    if token:
        db.query(RefreshToken).filter(
            RefreshToken.family_id == token.family_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": utcnow()})
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": utcnow()})


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Kimlik doğrulaması gerekli.", headers={"WWW-Authenticate": "Bearer"}
    )
    if not creds:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise unauthorized
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    if not user or not user.is_active:
        raise unauthorized
    return user


def require_admin(
    request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> User:
    if user.role != "ADMIN":
        audit.log(db, request, "UNAUTHORIZED_ACCESS", f"Yönetici alanına erişim denemesi: {request.url.path}",
                  user=user, success=False)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu işlem için yetkiniz yok.")
    return user


def require_user(user: User = Depends(get_current_user)) -> User:
    """Sağlık verisi uç noktaları: yalnızca kendi verisi olan kullanıcılar (admin dahil kendi hesabı)."""
    return user
