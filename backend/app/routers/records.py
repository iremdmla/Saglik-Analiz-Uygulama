from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, selectinload

from .. import audit
from ..database import get_db
from ..models import HealthMeasurement, HealthRecord, User
from ..schemas import Page, RecordIn, RecordOut
from ..security import get_current_user
from ..utils import get_owned, measurement_out, paginate
from .measurements import apply_measurement

router = APIRouter(prefix="/api/records", tags=["records"])


def record_out(r: HealthRecord) -> dict:
    ms = [measurement_out(m) for m in sorted(r.measurements, key=lambda m: (m.type.category, m.type.name))]
    return {
        **{k: getattr(r, k) for k in ("id", "title", "category", "record_date", "source", "notes",
                                      "document_id", "is_demo", "created_at")},
        "measurements": ms,
        "abnormal_count": sum(1 for m in ms if m["status"] in ("low", "high")),
    }


def _save(db: Session, user: User, r: HealthRecord, data: RecordIn) -> None:
    r.title, r.category, r.record_date = data.title.strip(), data.category, data.record_date
    r.source, r.notes = data.source, data.notes
    r.measurements.clear()  # düzenlemede ölçüm listesi yenisiyle değiştirilir
    db.flush()
    for mi in data.measurements:
        mi.measured_at = data.record_date
        mi.source = data.source
        apply_measurement(db, user, mi, record=r)


@router.get("", response_model=Page[RecordOut])
def list_records(
    category: str | None = None, q: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1), page_size: int = Query(8, ge=1, le=50),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    query = db.query(HealthRecord).options(
        selectinload(HealthRecord.measurements).joinedload(HealthMeasurement.type)
    ).filter(HealthRecord.user_id == user.id)
    if category:
        query = query.filter(HealthRecord.category == category)
    if q:
        query = query.filter(HealthRecord.title.ilike(f"%{q}%"))  # parametreli sorgu, injection güvenli
    query = query.order_by(HealthRecord.record_date.desc(), HealthRecord.id.desc())
    result = paginate(query, page, page_size)
    result["items"] = [record_out(r) for r in result["items"]]
    return result


@router.get("/{rid}", response_model=RecordOut)
def get_record(rid: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return record_out(get_owned(db, HealthRecord, rid, user, request))


@router.post("", response_model=RecordOut, status_code=201)
def create_record(data: RecordIn, request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    r = HealthRecord(user_id=user.id)
    db.add(r)
    _save(db, user, r, data)
    db.flush()
    audit.log(db, request, "RECORD_CREATE", f"Sağlık kaydı eklendi ({len(data.measurements)} ölçüm)",
              user=user, entity_type="health_records", entity_id=r.id)
    db.refresh(r)
    return record_out(r)


@router.put("/{rid}", response_model=RecordOut)
def update_record(rid: int, data: RecordIn, request: Request, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    r = get_owned(db, HealthRecord, rid, user, request)
    _save(db, user, r, data)
    audit.log(db, request, "RECORD_UPDATE", "Sağlık kaydı güncellendi", user=user,
              entity_type="health_records", entity_id=r.id)
    db.refresh(r)
    return record_out(r)


@router.delete("/{rid}", status_code=204)
def delete_record(rid: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = get_owned(db, HealthRecord, rid, user, request)
    db.delete(r)
    audit.log(db, request, "RECORD_DELETE", "Sağlık kaydı ve ölçümleri silindi", user=user,
              entity_type="health_records", entity_id=rid)
