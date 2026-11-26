"""Yönetici uç noktaları. Yöneticiler sağlık DEĞERLERİNİ görmez; yalnızca hesap ve sayısal özetleri görür."""
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import audit, security
from ..config import settings
from ..database import get_db
from ..models import (AuditLog, ChatMessage, HealthMeasurement, HealthProfile, HealthRecord, UploadedDocument,
                      User, utcnow)
from ..schemas import AuditLogOut, Page, UserOut, UserStatusIn
from ..utils import paginate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(security.require_admin)])


class AdminUserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field("USER", pattern="^(USER|ADMIN)$")


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    now = utcnow()
    since = now - timedelta(days=13)
    activity = dict(db.query(func.date(AuditLog.created_at), func.count()).filter(
        AuditLog.created_at >= datetime.combine(since.date(), time.min)).group_by(func.date(AuditLog.created_at)).all())
    failed = dict(db.query(func.date(AuditLog.created_at), func.count()).filter(
        AuditLog.created_at >= datetime.combine(since.date(), time.min), AuditLog.success.is_(False))
        .group_by(func.date(AuditLog.created_at)).all())
    days = [(since.date() + timedelta(days=i)).isoformat() for i in range(14)]
    by_action = db.query(AuditLog.action, func.count()).group_by(AuditLog.action).order_by(func.count().desc()).all()
    by_category = db.query(HealthRecord.category, func.count()).group_by(HealthRecord.category).all()
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter_by(is_active=True).count(),
        "admin_users": db.query(User).filter_by(role="ADMIN").count(),
        "active_last_7d": db.query(User).filter(User.last_login_at >= now - timedelta(days=7)).count(),
        "total_records": db.query(HealthRecord).count(),
        "total_measurements": db.query(HealthMeasurement).count(),
        "total_documents": db.query(UploadedDocument).count(),
        "total_chat_messages": db.query(ChatMessage).count(),
        "total_logs": db.query(AuditLog).count(),
        "failed_logins_7d": db.query(AuditLog).filter(AuditLog.action == "LOGIN_FAILED",
                                                      AuditLog.created_at >= now - timedelta(days=7)).count(),
        "activity": [{"date": d, "count": activity.get(d, 0), "failed": failed.get(d, 0)} for d in days],
        "actions": [{"action": a, "count": c} for a, c in by_action],
        "record_categories": [{"category": c, "count": n} for c, n in by_category],
        "recent_users": [UserOut.model_validate(u) for u in db.query(User).order_by(User.created_at.desc()).limit(5)],
        "recent_logs": [AuditLogOut.model_validate(l) for l in
                        db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(8)],
    }


@router.get("/users", response_model=Page[UserOut])
def list_users(q: str | None = Query(None, max_length=100), role: str | None = Query(None, pattern="^(USER|ADMIN)$"),
               active: bool | None = None, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
               db: Session = Depends(get_db)):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like), User.username.ilike(like)))
    if role:
        query = query.filter(User.role == role)
    if active is not None:
        query = query.filter(User.is_active.is_(active))
    return paginate(query.order_by(User.created_at.desc(), User.id.desc()), page, page_size)


@router.get("/users/{uid}")
def user_detail(uid: int, db: Session = Depends(get_db)):
    """Hesap detayları ve sayısal özetler. Sağlık değerleri bilinçli olarak döndürülmez."""
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı.")
    return {
        "user": UserOut.model_validate(user),
        "has_profile": db.query(HealthProfile).filter_by(user_id=uid).count() > 0,
        "record_count": db.query(HealthRecord).filter_by(user_id=uid).count(),
        "measurement_count": db.query(HealthMeasurement).filter_by(user_id=uid).count(),
        "document_count": db.query(UploadedDocument).filter_by(user_id=uid).count(),
        "recent_activity": [AuditLogOut.model_validate(l) for l in db.query(AuditLog).filter_by(user_id=uid)
                            .order_by(AuditLog.created_at.desc()).limit(10)],
    }


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: AdminUserCreate, request: Request, admin: User = Depends(security.require_admin),
                db: Session = Depends(get_db)):
    if db.query(User).filter(func.lower(User.email) == data.email.lower()).first():
        raise HTTPException(409, "Bu e-posta adresi zaten kayıtlı.")
    user = User(email=data.email.lower(), full_name=data.full_name, role=data.role,
                hashed_password=security.hash_password(data.password), profile=HealthProfile())
    db.add(user)
    db.flush()
    audit.log(db, request, "USER_CREATE", f"Yönetici yeni kullanıcı oluşturdu (rol: {data.role})", user=admin,
              entity_type="users", entity_id=user.id)
    return user


@router.patch("/users/{uid}/status", response_model=UserOut)
def set_status(uid: int, data: UserStatusIn, request: Request, admin: User = Depends(security.require_admin),
               db: Session = Depends(get_db)):
    user = db.get(User, uid)
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı.")
    if user.id == admin.id:
        raise HTTPException(400, "Kendi hesabınızı pasif hâle getiremezsiniz.")
    user.is_active = data.is_active
    if not data.is_active:
        security.revoke_all_user_tokens(db, user.id)  # açık oturumları sonlandır
    audit.log(db, request, "USER_STATUS_CHANGE",
              f"{user.email} hesabı {'aktif' if data.is_active else 'pasif'} yapıldı", user=admin,
              entity_type="users", entity_id=user.id)
    return user


@router.get("/logs", response_model=Page[AuditLogOut])
def logs(user_id: int | None = None, action: str | None = Query(None, max_length=40), success: bool | None = None,
         date_from: date | None = None, date_to: date | None = None, q: str | None = Query(None, max_length=100),
         page: int = Query(1, ge=1), page_size: int = Query(15, ge=1, le=100), db: Session = Depends(get_db)):
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if success is not None:
        query = query.filter(AuditLog.success.is_(success))
    if date_from:
        query = query.filter(AuditLog.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.filter(AuditLog.created_at <= datetime.combine(date_to, time.max))
    if q:
        query = query.filter(or_(AuditLog.description.ilike(f"%{q}%"), AuditLog.actor.ilike(f"%{q}%")))
    return paginate(query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()), page, page_size)


@router.get("/logs/actions", response_model=list[str])
def log_actions(db: Session = Depends(get_db)):
    return [a for (a,) in db.query(AuditLog.action).distinct().order_by(AuditLog.action)]


@router.get("/demo")
def demo_status(db: Session = Depends(get_db)):
    return {
        "environment": settings.environment,
        "seed_enabled": settings.seed_demo_data and not settings.is_production,
        "demo_users": [UserOut.model_validate(u) for u in db.query(User).filter_by(is_demo=True).order_by(User.id)],
        "demo_records": db.query(HealthRecord).filter_by(is_demo=True).count(),
        "demo_measurements": db.query(HealthMeasurement).filter_by(is_demo=True).count(),
        "demo_documents": db.query(UploadedDocument).filter_by(is_demo=True).count(),
        "demo_logs": db.query(AuditLog).filter_by(is_demo=True).count(),
    }
