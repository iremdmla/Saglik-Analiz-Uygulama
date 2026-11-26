"""Veritabanı modelleri. Tüm sağlık verileri user_id ile kullanıcıya bağlıdır."""
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10), default="USER")  # ADMIN | USER
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    profile: Mapped["HealthProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class HealthProfile(Base):
    __tablename__ = "health_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(5), nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="profile")


class MeasurementType(Base):
    """Ölçüm kataloğu: ad, kategori, standart birim ve varsayılan referans aralığı."""
    __tablename__ = "measurement_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(40))
    unit: Mapped[str] = mapped_column(String(20))
    ref_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    aliases: Mapped[str | None] = mapped_column(String(255), nullable=True)  # rapor eşleştirme


class HealthRecord(Base):
    """Bir sağlık kaydı (ör. 'Hemogram – Mart 2026'); birden çok ölçüm içerir."""
    __tablename__ = "health_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    category: Mapped[str] = mapped_column(String(40), default="Laboratuvar")
    record_date: Mapped[date] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(60), default="Manuel giriş")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("uploaded_documents.id", ondelete="SET NULL"), nullable=True
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    measurements: Mapped[list["HealthMeasurement"]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class HealthMeasurement(Base):
    __tablename__ = "health_measurements"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    record_id: Mapped[int | None] = mapped_column(
        ForeignKey("health_records.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type_id: Mapped[int] = mapped_column(ForeignKey("measurement_types.id"), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    measured_at: Mapped[date] = mapped_column(Date, index=True)
    ref_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(60), default="Manuel giriş")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    type: Mapped[MeasurementType] = relationship()
    record: Mapped[HealthRecord | None] = relationship(back_populates="measurements")


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(80), unique=True)
    content_type: Mapped[str] = mapped_column(String(50))
    size_bytes: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")  # uploaded|extracted|imported|failed
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    extraction: Mapped["DocumentExtraction | None"] = relationship(
        back_populates="document", cascade="all, delete-orphan", uselist=False
    )


class DocumentExtraction(Base):
    __tablename__ = "document_extractions"
    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("uploaded_documents.id", ondelete="CASCADE"), unique=True
    )
    method: Mapped[str] = mapped_column(String(20))  # pdf_text | ocr | none
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    items: Mapped[list] = mapped_column(JSON, default=list)  # önerilen ölçümler (onay bekler)
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    document: Mapped[UploadedDocument] = relationship(back_populates="extraction")


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150), default="Yeni sohbet")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.id"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(10))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    session: Mapped[ChatSession] = relationship(back_populates="messages")


class RefreshToken(Base):
    """Refresh token'lar yalnızca SHA-256 hash olarak saklanır."""
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint("token_hash"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64))
    family_id: Mapped[str] = mapped_column(String(36), index=True)  # rotation zinciri
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor: Mapped[str | None] = mapped_column(String(255), nullable=True)  # e-posta (silinse de kalır)
    action: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[str] = mapped_column(String(255))
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
