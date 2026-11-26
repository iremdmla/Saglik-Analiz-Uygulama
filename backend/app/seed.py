"""Başlangıç verileri: ölçüm kataloğu, ilk admin ve SENTETİK demo verileri.

Tekrar çalıştırılabilir: katalog güncellenir; var olan kullanıcılar ve verileri asla ezilmez/çoğaltılmaz.
Üretim ortamında (ENVIRONMENT=production) demo verisi oluşturulmaz.
Buradaki tüm sağlık değerleri kurgusaldır; gerçek kişilere ait değildir.
"""
import logging
import random
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .config import settings
from .models import (AuditLog, ChatMessage, ChatSession, DocumentExtraction, HealthMeasurement, HealthProfile,
                     HealthRecord, MeasurementType, UploadedDocument, User, utcnow)
from .security import hash_password
from .services import extraction
from .services.catalog import MEASUREMENT_TYPES

log = logging.getLogger("seed")

# Lab panelleri ve içerdikleri ölçümler
PANELS = {
    "Hemogram": ["HGB", "WBC", "RBC", "HCT", "PLT", "MCV"],
    "Biyokimya": ["GLU", "HBA1C", "CHOL", "LDL", "HDL", "TG", "ALT", "AST", "CREA", "UREA"],
    "Vitamin ve Mineral": ["B12", "VITD", "FE", "FERRITIN"],
    "Tiroid": ["TSH", "FT4"],
}
LAB_OFFSETS = [330, 230, 130, 35]  # bugünden kaç gün önce
MONTHLY = 12
DEFAULTS = {
    "HGB": 13.8, "WBC": 6.5, "RBC": 4.7, "HCT": 41, "PLT": 260, "MCV": 88, "GLU": 88, "HBA1C": 5.2, "CHOL": 175,
    "LDL": 100, "HDL": 55, "TG": 110, "ALT": 22, "AST": 21, "CREA": 0.8, "UREA": 28, "TSH": 2.0, "FT4": 1.2,
    "B12": 450, "VITD": 32, "FE": 95, "FERRITIN": 60, "SYS": 115, "DIA": 75, "PULSE": 72, "SLEEP": 7.2, "STEPS": 8000,
}
DECIMALS = {"TSH": 2, "CREA": 2, "FT4": 2, "HGB": 1, "WBC": 1, "RBC": 2, "HCT": 1, "HBA1C": 1, "VITD": 1,
            "WEIGHT": 1, "SLEEP": 1}

# Her demo kullanıcı için farklı bir senaryo: (başlangıç, bitiş) değerleri
DEMO_USERS = [
    {
        "email": "ayse@healthtrack.local", "full_name": "Ayşe Demir", "days_ago": 340,
        "profile": dict(birth_date=date(1991, 4, 12), gender="Kadın", height_cm=165, blood_type="A+",
                        activity_level="Orta", allergies="Penisilin",
                        notes="Demir eksikliği takibi (sentetik senaryo)."),
        "trends": {"HGB": (10.8, 12.9), "HCT": (33.5, 39.8), "MCV": (76, 85), "FERRITIN": (8, 34), "FE": (42, 88),
                   "B12": (180, 410), "VITD": (14, 26), "WEIGHT": (62.5, 61.0), "SLEEP": (6.6, 7.3)},
    },
    {
        "email": "mehmet@healthtrack.local", "full_name": "Mehmet Yılmaz", "days_ago": 320,
        "profile": dict(birth_date=date(1974, 9, 3), gender="Erkek", height_cm=178, blood_type="0+",
                        activity_level="Düşük", chronic_conditions="Prediyabet takibi (sentetik senaryo)"),
        "trends": {"HGB": (15.1, 15.0), "GLU": (112, 99), "HBA1C": (6.2, 5.9), "CHOL": (238, 205), "LDL": (162, 141),
                   "HDL": (37, 44), "TG": (212, 138), "ALT": (61, 38), "AST": (44, 30), "CREA": (1.05, 1.0),
                   "SYS": (144, 126), "DIA": (93, 82), "PULSE": (82, 74), "WEIGHT": (94.5, 86.8),
                   "STEPS": (4300, 8400), "SLEEP": (6.1, 6.9)},
    },
    {
        "email": "elif@healthtrack.local", "full_name": "Elif Kaya", "days_ago": 300,
        "profile": dict(birth_date=date(1998, 1, 25), gender="Kadın", height_cm=170, blood_type="B+",
                        activity_level="Yüksek", medications="Tiroid hormonu (sentetik senaryo)"),
        "trends": {"TSH": (5.9, 2.3), "FT4": (0.78, 1.25), "VITD": (21, 27), "WEIGHT": (66.0, 63.4),
                   "PULSE": (64, 61), "SLEEP": (6.2, 7.5), "STEPS": (9800, 11200), "SYS": (108, 110), "DIA": (68, 70)},
    },
]


def sync_measurement_types(db: Session) -> None:
    existing = {t.code: t for t in db.query(MeasurementType).all()}
    for code, name, cat, unit, rmin, rmax, desc, aliases in MEASUREMENT_TYPES:
        t = existing.get(code) or MeasurementType(code=code)
        t.name, t.category, t.unit, t.ref_min, t.ref_max, t.description, t.aliases = \
            name, cat, unit, rmin, rmax, desc, aliases
        db.add(t)
    db.commit()


def ensure_admin(db: Session) -> None:
    exists = db.query(User).filter(or_(func.lower(User.email) == settings.admin_email.lower(),
                                       User.username == settings.admin_username)).first()
    if exists:
        return
    if not settings.admin_password:
        log.warning("ADMIN_PASSWORD tanımlı değil; yönetici hesabı oluşturulmadı.")
        return
    if settings.is_production and len(settings.admin_password) < 12:
        raise SystemExit("Üretimde ADMIN_PASSWORD en az 12 karakter olmalı.")
    db.add(User(email=settings.admin_email.lower(), username=settings.admin_username, full_name="Sistem Yöneticisi",
                role="ADMIN", hashed_password=hash_password(settings.admin_password), profile=HealthProfile(),
                is_demo=not settings.is_production, created_at=utcnow() - timedelta(days=365)))
    db.add(AuditLog(action="USER_CREATE", description="İlk yönetici hesabı başlangıç komutuyla oluşturuldu",
                    actor=settings.admin_email, entity_type="users", success=True))
    db.commit()
    log.info("Yönetici hesabı oluşturuldu: %s", settings.admin_email)


def _series(rng: random.Random, code: str, trends: dict, n: int) -> list[float]:
    start, end = trends[code] if code in trends else (DEFAULTS[code], DEFAULTS[code])
    noise = abs(end - start) * 0.06 + DEFAULTS.get(code, start) * 0.025
    values = []
    for i in range(n):
        base = start + (end - start) * (i / (n - 1))
        v = base if i in (0, n - 1) else base + rng.uniform(-noise, noise)
        values.append(round(v, DECIMALS.get(code, 0)))
    return values


def _add_record(db, user, types, title, category, day, codes_values, source, document_id=None):
    rec = HealthRecord(user_id=user.id, title=title, category=category, record_date=day, source=source,
                       document_id=document_id, is_demo=True,
                       created_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=10))
    for code, value in codes_values:
        t = types[code]
        rec.measurements.append(HealthMeasurement(
            user_id=user.id, type_id=t.id, value=value, unit=t.unit, measured_at=day,
            ref_min=t.ref_min, ref_max=t.ref_max, source=source, is_demo=True))
    db.add(rec)
    return rec


def _ascii(s: str) -> str:
    return s.translate(str.maketrans("çğıöşüÇĞİÖŞÜµ–", "cgiosuCGIOSUu-"))


def _demo_document(db, user, types, title, day, values: dict, status: str) -> UploadedDocument:
    """Sentetik bir laboratuvar PDF'i üretir, saklar ve metin çıkarımını çalıştırır."""
    lines = ["HEALTHTRACK DEMO LABORATUVARI - SENTETIK ORNEK RAPOR", "Bu belge gercek bir kisiye ait degildir.", "",
             f"Hasta: {_ascii(user.full_name)}    Tarih: {day.strftime('%d.%m.%Y')}", "",
             "Test                     Sonuc     Birim       Referans", "-" * 60]
    for code, v in values.items():
        t = types[code]
        ref = f"{t.ref_min:g} - {t.ref_max:g}" if t.ref_min is not None and t.ref_max is not None else \
            (f"< {t.ref_max:g}" if t.ref_max is not None else f"> {t.ref_min:g}")
        lines.append(f"{_ascii(t.name):<25}{v:<10g}{_ascii(t.unit):<12}{ref}")
    pdf = extraction.make_text_pdf(lines)
    doc = UploadedDocument(user_id=user.id, title=title, original_name=f"lab_{day.isoformat()}.pdf",
                           stored_name=f"{uuid.uuid4().hex}.pdf", content_type="application/pdf",
                           size_bytes=len(pdf), status=status, is_demo=True,
                           uploaded_at=datetime.combine(day, datetime.min.time()) + timedelta(hours=14))
    path = Path(settings.upload_dir) / str(user.id) / doc.stored_name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pdf)
    method, text, msg = extraction.extract_text(path, doc.content_type)
    doc.extraction = DocumentExtraction(method=method, raw_text=text, message=msg,
                                        items=extraction.parse_measurements(text, list(types.values())),
                                        confirmed_at=utcnow() if status == "imported" else None)
    db.add(doc)
    db.flush()
    return doc


def _demo_logs(db, user, rng: random.Random) -> None:
    now = utcnow()
    events = [("LOGIN", "Kullanıcı giriş yaptı", True), ("RECORD_CREATE", "Sağlık kaydı eklendi", True),
              ("MEASUREMENT_CREATE", "Ölçüm eklendi", True), ("DOCUMENT_UPLOAD", "Rapor yüklendi (application/pdf)", True),
              ("LOGOUT", "Kullanıcı çıkış yaptı", True), ("LOGIN_FAILED", "Hatalı kullanıcı adı veya şifre", False),
              ("PROFILE_UPDATE", "Sağlık profili güncellendi", True), ("ANALYSIS_RUN", "Sağlık verisi analizi oluşturuldu", True)]
    for _ in range(14):
        action, desc, ok = rng.choice(events)
        db.add(AuditLog(user_id=user.id, actor=user.email, action=action, description=desc, success=ok,
                        ip_address=f"172.18.0.{rng.randint(2, 40)}", is_demo=True,
                        created_at=now - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 23),
                                                   minutes=rng.randint(0, 59))))


def seed_demo_user(db: Session, spec: dict, password: str, idx: int) -> None:
    if db.query(User).filter(func.lower(User.email) == spec["email"]).first():
        return  # var olan kullanıcıya dokunma
    rng = random.Random(idx * 7919)
    today = date.today()
    types = {t.code: t for t in db.query(MeasurementType).all()}
    trends = spec["trends"]
    user = User(email=spec["email"], full_name=spec["full_name"], hashed_password=hash_password(password),
                is_demo=True, created_at=utcnow() - timedelta(days=spec["days_ago"]),
                last_login_at=utcnow() - timedelta(days=rng.randint(0, 3)))
    user.profile = HealthProfile(**spec["profile"], weight_kg=trends.get("WEIGHT", (65, 65))[1])
    db.add(user)
    db.flush()

    # Laboratuvar panelleri (4 farklı tarih)
    series = {c: _series(rng, c, trends, len(LAB_OFFSETS)) for codes in PANELS.values() for c in codes}
    for i, off in enumerate(LAB_OFFSETS):
        day = today - timedelta(days=off)
        for panel, codes in PANELS.items():
            _add_record(db, user, types, f"{panel} – {day.strftime('%d.%m.%Y')}", panel, day,
                        [(c, series[c][i]) for c in codes], "Laboratuvar")

    # Aylık vital bulgular ve yaşam tarzı ölçümleri
    weight = _series(rng, "WEIGHT", trends, MONTHLY)
    monthly = {c: _series(rng, c, trends, MONTHLY) for c in ("SYS", "DIA", "PULSE", "SLEEP", "STEPS")}
    for i in range(MONTHLY):
        day = today - timedelta(days=(MONTHLY - 1 - i) * 30 + 5)
        _add_record(db, user, types, "Tansiyon ve Nabız Ölçümü", "Vital Bulgular", day,
                    [(c, monthly[c][i]) for c in ("SYS", "DIA", "PULSE")], "Ev tipi cihaz")
        _add_record(db, user, types, "Vücut ve Yaşam Tarzı", "Yaşam Tarzı", day,
                    [("WEIGHT", weight[i]), ("SLEEP", monthly["SLEEP"][i]), ("STEPS", monthly["STEPS"][i])],
                    "Akıllı saat / tartı")

    # Raporlar: son panelin PDF'i (aktarılmış) + onay bekleyen yeni bir kontrol raporu
    last_day = today - timedelta(days=LAB_OFFSETS[-1])
    doc = _demo_document(db, user, types, "Kapsamlı Kan Tahlili", last_day,
                         {c: series[c][-1] for c in PANELS["Hemogram"] + PANELS["Vitamin ve Mineral"]}, "imported")
    db.query(HealthRecord).filter(HealthRecord.user_id == user.id, HealthRecord.record_date == last_day,
                                  HealthRecord.category.in_(["Hemogram", "Vitamin ve Mineral"])) \
        .update({"document_id": doc.id}, synchronize_session=False)
    check_day = today - timedelta(days=6)
    check_codes = ["HGB", "FERRITIN", "B12", "VITD", "GLU", "TSH"]
    _demo_document(db, user, types, "Kontrol Tahlili", check_day,
                   {c: round(series[c][-1] * rng.uniform(1.0, 1.06), DECIMALS.get(c, 0)) for c in check_codes},
                   "extracted")

    # Örnek asistan sohbeti
    chat = ChatSession(user_id=user.id, title="Değerlerim hakkında genel bilgi",
                       created_at=utcnow() - timedelta(days=2))
    chat.messages = [
        ChatMessage(role="user", content="Son tahlil sonuçlarıma göre genel durumum nasıl?"),
        ChatMessage(role="assistant", content="Analizler sayfasında referans dışındaki değerleriniz ve önceki "
                    "ölçümlere göre değişimler listelenir. Bu bilgiler teşhis yerine geçmez; sonuçlarınızı "
                    "doktorunuzla değerlendirmeniz önerilir. (Örnek demo sohbeti)"),
    ]
    db.add(chat)
    _demo_logs(db, user, rng)
    db.add(AuditLog(user_id=user.id, actor=user.email, action="REGISTER", description="Demo kullanıcı oluşturuldu",
                    entity_type="users", entity_id=user.id, is_demo=True, created_at=user.created_at))
    db.commit()
    log.info("Demo kullanıcı oluşturuldu: %s", spec["email"])


def run(db: Session) -> None:
    sync_measurement_types(db)
    ensure_admin(db)
    if settings.is_production or not settings.seed_demo_data:
        log.info("Demo verisi oluşturma kapalı.")
        return
    if not settings.demo_user_password:
        log.warning("DEMO_USER_PASSWORD tanımlı değil; demo kullanıcılar oluşturulmadı.")
        return
    for i, spec in enumerate(DEMO_USERS, 1):
        seed_demo_user(db, spec, settings.demo_user_password, i)
    # Birkaç sistem geneli örnek log (yalnızca ilk kurulumda)
    if not db.query(AuditLog).filter_by(is_demo=True, action="UNAUTHORIZED_ACCESS").first():
        now = utcnow()
        db.add_all([
            AuditLog(actor="bilinmeyen@ornek.com", action="LOGIN_FAILED", description="Hatalı kullanıcı adı veya şifre",
                     success=False, ip_address="172.18.0.77", is_demo=True, created_at=now - timedelta(days=1, hours=3)),
            AuditLog(actor="mehmet@healthtrack.local", action="UNAUTHORIZED_ACCESS",
                     description="Yönetici alanına erişim denemesi: /api/admin/users", success=False,
                     ip_address="172.18.0.12", is_demo=True, created_at=now - timedelta(days=2, hours=5)),
        ])
        db.commit()


def reset_demo(db: Session) -> None:
    """Yalnızca is_demo=True işaretli kullanıcı ve kayıtları siler (admin hariç), ardından yeniden oluşturur."""
    import shutil
    if settings.is_production:
        raise SystemExit("Üretim ortamında demo sıfırlama yapılamaz.")
    for u in db.query(User).filter(User.is_demo.is_(True), User.role != "ADMIN").all():
        shutil.rmtree(Path(settings.upload_dir) / str(u.id), ignore_errors=True)
        db.delete(u)
    db.query(AuditLog).filter(AuditLog.is_demo.is_(True)).delete()
    db.commit()
    run(db)
