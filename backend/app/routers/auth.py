import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import audit, security
from ..database import get_db
from ..models import HealthProfile, User, utcnow
from ..schemas import LoginIn, PasswordChangeIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Basit kaba kuvvet koruması: IP+kimlik başına 5 dakikada en fazla 5 hatalı deneme (tek süreç)
_failures: dict[str, list[float]] = defaultdict(list)
MAX_FAILS, WINDOW = 5, 300


def _throttle_key(request: Request, identifier: str) -> str:
    return f"{audit.client_ip(request)}|{identifier.lower()}"


def _token_response(db: Session, response: Response, user: User) -> dict:
    refresh = security.issue_refresh_token(db, user)
    db.commit()
    security.set_auth_cookies(response, refresh)
    return {"access_token": security.create_access_token(user), "user": user}


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(409, "Bu e-posta adresi zaten kayıtlı.")
    user = User(email=email, full_name=data.full_name.strip(), hashed_password=security.hash_password(data.password))
    user.profile = HealthProfile()
    db.add(user)
    db.flush()
    audit.log(db, request, "REGISTER", "Yeni kullanıcı kaydı oluşturuldu", user=user,
              entity_type="users", entity_id=user.id, commit=False)
    return _token_response(db, response, user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    key = _throttle_key(request, data.identifier)
    now = time.time()
    _failures[key] = [t for t in _failures[key] if now - t < WINDOW]
    if len(_failures[key]) >= MAX_FAILS:
        audit.log(db, request, "LOGIN_FAILED", "Çok fazla başarısız deneme nedeniyle giriş engellendi",
                  actor=data.identifier[:255], success=False)
        raise HTTPException(429, "Çok fazla başarısız deneme. Lütfen birkaç dakika sonra tekrar deneyin.")

    ident = data.identifier.strip().lower()
    user = db.query(User).filter(or_(func.lower(User.email) == ident, func.lower(User.username) == ident)).first()
    if not user or not security.verify_password(data.password, user.hashed_password):
        _failures[key].append(now)
        audit.log(db, request, "LOGIN_FAILED", "Hatalı kullanıcı adı veya şifre", user=user,
                  actor=data.identifier[:255], success=False)
        raise HTTPException(401, "E-posta/kullanıcı adı veya şifre hatalı.")
    if not user.is_active:
        audit.log(db, request, "LOGIN_FAILED", "Pasif hesapla giriş denemesi", user=user, success=False)
        raise HTTPException(403, "Hesabınız pasif durumda. Yönetici ile iletişime geçin.")

    _failures.pop(key, None)
    user.last_login_at = utcnow()
    audit.log(db, request, "LOGIN", "Kullanıcı giriş yaptı", user=user, commit=False)
    return _token_response(db, response, user)


@router.post("/refresh", response_model=TokenOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    security.verify_csrf(request)
    raw = request.cookies.get(security.REFRESH_COOKIE)
    if not raw:
        raise HTTPException(401, "Oturum bulunamadı.")
    # Not: hata durumunda cookie silinmez; çoklu sekmede başka sekmenin yeni cookie'sini ezmemek için
    user, new_raw = security.rotate_refresh_token(db, raw)
    security.set_auth_cookies(response, new_raw)
    return {"access_token": security.create_access_token(user), "user": user}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    security.verify_csrf(request)
    raw = request.cookies.get(security.REFRESH_COOKIE)
    token = db.query(security.RefreshToken).filter_by(token_hash=security._sha256(raw)).first() if raw else None
    security.revoke_refresh_token(db, raw)
    if token:
        user = db.get(User, token.user_id)
        audit.log(db, request, "LOGOUT", "Kullanıcı çıkış yaptı", user=user)
    security.clear_auth_cookies(response)
    response.status_code = 204
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(security.get_current_user)):
    return user


@router.post("/change-password", status_code=204)
def change_password(data: PasswordChangeIn, request: Request, response: Response,
                    user: User = Depends(security.get_current_user), db: Session = Depends(get_db)):
    if not security.verify_password(data.current_password, user.hashed_password):
        audit.log(db, request, "PASSWORD_CHANGE", "Şifre değiştirme: mevcut şifre hatalı", user=user, success=False)
        raise HTTPException(400, "Mevcut şifre hatalı.")
    user.hashed_password = security.hash_password(data.new_password)
    security.revoke_all_user_tokens(db, user.id)  # tüm oturumları kapat
    audit.log(db, request, "PASSWORD_CHANGE", "Şifre değiştirildi, tüm oturumlar sonlandırıldı", user=user)
    security.clear_auth_cookies(response)
    response.status_code = 204
    return response
