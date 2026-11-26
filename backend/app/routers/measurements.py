from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from .. import audit
from ..database import get_db
from ..models import HealthMeasurement, HealthRecord, MeasurementType, User
from ..schemas import MeasurementIn, MeasurementOut, MeasurementTypeOut, Page
from ..security import get_current_user
from ..utils import get_owned, measurement_out, paginate

router = APIRouter(prefix="/api/measurements", tags=["measurements"])


def apply_measurement(db: Session, user: User, data: MeasurementIn, m: HealthMeasurement | None = None,
                      record: HealthRecord | None = None) -> HealthMeasurement:
    """Ölçümü oluşturur/günceller. Birim veya referans verilmezse katalog değerleri kullanılır."""
    mtype = db.get(MeasurementType, data.type_id)
    if not mtype:
        raise HTTPException(422, "Geçersiz ölçüm türü.")
    m = m or HealthMeasurement(user_id=user.id)
    m.type = mtype
    m.value = data.value
    m.unit = (data.unit or mtype.unit).strip()
    m.measured_at = data.measured_at
    use_catalog_ref = data.ref_min is None and data.ref_max is None
    m.ref_min = mtype.ref_min if use_catalog_ref else data.ref_min
    m.ref_max = mtype.ref_max if use_catalog_ref else data.ref_max
    m.source, m.note = data.source, data.note
    if record is not None:
        m.record = record
    # Kilo ölçümü en güncel ise profildeki kilo da güncellenir (BMI hesabı için)
    if mtype.code == "WEIGHT" and user.profile:
        latest = db.query(HealthMeasurement).filter_by(user_id=user.id, type_id=mtype.id) \
            .order_by(HealthMeasurement.measured_at.desc()).first()
        if not latest or latest.measured_at <= data.measured_at:
            user.profile.weight_kg = data.value
    db.add(m)
    return m


@router.get("/types", response_model=list[MeasurementTypeOut])
def list_types(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(MeasurementType).order_by(MeasurementType.category, MeasurementType.name).all()


@router.get("", response_model=Page[MeasurementOut])
def list_measurements(
    type_id: int | None = None, category: str | None = None,
    date_from: date | None = None, date_to: date | None = None,
    status: str | None = Query(None, pattern="^(normal|low|high|abnormal)$"),
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    q = db.query(HealthMeasurement).options(joinedload(HealthMeasurement.type)) \
        .join(MeasurementType).filter(HealthMeasurement.user_id == user.id)
    if type_id:
        q = q.filter(HealthMeasurement.type_id == type_id)
    if category:
        q = q.filter(MeasurementType.category == category)
    if date_from:
        q = q.filter(HealthMeasurement.measured_at >= date_from)
    if date_to:
        q = q.filter(HealthMeasurement.measured_at <= date_to)
    if status:
        M = HealthMeasurement
        low = and_(M.ref_min.isnot(None), M.value < M.ref_min)
        high = and_(M.ref_max.isnot(None), M.value > M.ref_max)
        has_ref = or_(M.ref_min.isnot(None), M.ref_max.isnot(None))
        q = q.filter({"low": low, "high": high, "abnormal": or_(low, high),
                      "normal": and_(has_ref, ~or_(low, high))}[status])
    q = q.order_by(HealthMeasurement.measured_at.desc(), HealthMeasurement.id.desc())
    result = paginate(q, page, page_size)
    result["items"] = [measurement_out(m) for m in result["items"]]
    return result


@router.get("/history/{type_id}", response_model=list[MeasurementOut])
def history(type_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(HealthMeasurement).options(joinedload(HealthMeasurement.type)) \
        .filter_by(user_id=user.id, type_id=type_id).order_by(HealthMeasurement.measured_at).all()
    return [measurement_out(m) for m in rows]


@router.get("/dates")
def measurement_dates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Ölçüm yapılan tarihler ve o tarihteki ölçüm sayısı (karşılaştırma için)."""
    rows = db.query(HealthMeasurement.measured_at, func.count()).filter_by(user_id=user.id) \
        .group_by(HealthMeasurement.measured_at).order_by(HealthMeasurement.measured_at.desc()).all()
    return [{"date": d, "count": c} for d, c in rows]


@router.get("/compare")
def compare(date_a: date, date_b: date, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """İki tarihteki ortak ölçümleri karşılaştırır. Birimi farklı olanlar karşılaştırılmaz."""
    rows = db.query(HealthMeasurement).options(joinedload(HealthMeasurement.type)).filter(
        HealthMeasurement.user_id == user.id, HealthMeasurement.measured_at.in_([date_a, date_b])).all()
    by_type: dict[int, dict] = {}
    for m in rows:
        slot = by_type.setdefault(m.type_id, {"type_id": m.type_id, "name": m.type.name, "category": m.type.category})
        slot["a" if m.measured_at == date_a else "b"] = measurement_out(m)
    result = []
    for slot in by_type.values():
        a, b = slot.get("a"), slot.get("b")
        item = {**slot, "comparable": bool(a and b and a["unit"] == b["unit"]), "change": None, "change_pct": None}
        if a and b and not item["comparable"]:
            item["note"] = "Birimler farklı olduğu için karşılaştırılamaz."
        elif item["comparable"]:
            item["change"] = round(b["value"] - a["value"], 2)
            item["change_pct"] = round(item["change"] / a["value"] * 100, 1) if a["value"] else None
        result.append(item)
    return sorted(result, key=lambda x: (x["category"], x["name"]))


@router.post("", response_model=MeasurementOut, status_code=201)
def create(data: MeasurementIn, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = apply_measurement(db, user, data)
    db.flush()
    audit.log(db, request, "MEASUREMENT_CREATE", f"Ölçüm eklendi: {m.type.name}", user=user,
              entity_type="health_measurements", entity_id=m.id)
    return measurement_out(m)


@router.put("/{mid}", response_model=MeasurementOut)
def update(mid: int, data: MeasurementIn, request: Request, user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    m = apply_measurement(db, user, data, get_owned(db, HealthMeasurement, mid, user, request))
    audit.log(db, request, "MEASUREMENT_UPDATE", f"Ölçüm güncellendi: {m.type.name}", user=user,
              entity_type="health_measurements", entity_id=m.id)
    return measurement_out(m)


@router.delete("/{mid}", status_code=204)
def delete(mid: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = get_owned(db, HealthMeasurement, mid, user, request)
    name = m.type.name
    db.delete(m)
    audit.log(db, request, "MEASUREMENT_DELETE", f"Ölçüm silindi: {name}", user=user,
              entity_type="health_measurements", entity_id=mid)

