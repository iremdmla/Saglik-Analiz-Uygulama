"""Pydantic istek/yanıt şemaları."""
from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---------- Auth / kullanıcı ----------
class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def strong(cls, v: str) -> str:
        if not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
            raise ValueError("Şifre en az bir harf ve bir rakam içermeli.")
        return v


class LoginIn(BaseModel):
    identifier: str = Field(min_length=2, max_length=255)  # e-posta veya kullanıcı adı
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORM):
    id: int
    email: str
    username: str | None
    full_name: str
    role: str
    is_active: bool
    is_demo: bool
    created_at: datetime
    last_login_at: datetime | None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# ---------- Profil ----------
class ProfileIn(BaseModel):
    birth_date: date | None = None
    gender: Literal["Kadın", "Erkek", "Diğer", "Belirtmek istemiyorum"] | None = None
    height_cm: float | None = Field(None, ge=50, le=250)
    weight_kg: float | None = Field(None, ge=2, le=400)
    blood_type: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"] | None = None
    chronic_conditions: str | None = Field(None, max_length=1000)
    medications: str | None = Field(None, max_length=1000)
    allergies: str | None = Field(None, max_length=1000)
    activity_level: Literal["Düşük", "Orta", "Yüksek"] | None = None
    notes: str | None = Field(None, max_length=2000)


class ProfileOut(ProfileIn, ORM):
    bmi: float | None = None
    bmi_category: str | None = None
    age: int | None = None
    updated_at: datetime | None = None


# ---------- Ölçümler ----------
class MeasurementTypeOut(ORM):
    id: int
    code: str
    name: str
    category: str
    unit: str
    ref_min: float | None
    ref_max: float | None
    description: str | None


class MeasurementIn(BaseModel):
    type_id: int
    value: float = Field(ge=0, le=100000)
    unit: str | None = Field(None, max_length=20)
    measured_at: date
    ref_min: float | None = None
    ref_max: float | None = None
    source: str = Field("Manuel giriş", max_length=60)
    note: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def check(self):
        if self.measured_at > date.today():
            raise ValueError("Ölçüm tarihi gelecekte olamaz.")
        if self.ref_min is not None and self.ref_max is not None and self.ref_min > self.ref_max:
            raise ValueError("Referans alt sınırı üst sınırdan büyük olamaz.")
        return self


class MeasurementOut(ORM):
    id: int
    record_id: int | None
    type_id: int
    type_code: str
    type_name: str
    category: str
    value: float
    unit: str
    measured_at: date
    ref_min: float | None
    ref_max: float | None
    source: str
    note: str | None
    is_demo: bool
    status: str  # normal | low | high | unknown


# ---------- Sağlık kayıtları ----------
class RecordIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    category: str = Field("Laboratuvar", max_length=40)
    record_date: date
    source: str = Field("Manuel giriş", max_length=60)
    notes: str | None = Field(None, max_length=2000)
    measurements: list[MeasurementIn] = Field(default_factory=list, max_length=60)

    @field_validator("record_date")
    @classmethod
    def not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Kayıt tarihi gelecekte olamaz.")
        return v


class RecordOut(ORM):
    id: int
    title: str
    category: str
    record_date: date
    source: str
    notes: str | None
    document_id: int | None
    is_demo: bool
    created_at: datetime
    measurements: list[MeasurementOut] = []
    abnormal_count: int = 0


# ---------- Raporlar ----------
class ExtractionItem(BaseModel):
    type_id: int | None = None
    type_name: str | None = None
    label: str
    value: float
    unit: str | None = None
    ref_min: float | None = None
    ref_max: float | None = None


class ExtractionOut(ORM):
    method: str
    raw_text: str | None
    items: list[ExtractionItem]
    message: str | None
    confirmed_at: datetime | None


class DocumentOut(ORM):
    id: int
    title: str
    original_name: str
    content_type: str
    size_bytes: int
    status: str
    is_demo: bool
    uploaded_at: datetime
    extraction: ExtractionOut | None = None


class ImportIn(BaseModel):
    record_date: date
    title: str | None = Field(None, max_length=150)
    items: list[MeasurementIn] = Field(min_length=1, max_length=60)


# ---------- Asistan ----------
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: int | None = None


class ChatMessageOut(ORM):
    id: int
    role: str
    content: str
    created_at: datetime


class ChatSessionOut(ORM):
    id: int
    title: str
    created_at: datetime


# ---------- Admin ----------
class UserStatusIn(BaseModel):
    is_active: bool


class AuditLogOut(ORM):
    id: int
    user_id: int | None
    actor: str | None
    action: str
    description: str
    entity_type: str | None
    entity_id: int | None
    success: bool
    ip_address: str | None
    is_demo: bool
    created_at: datetime
