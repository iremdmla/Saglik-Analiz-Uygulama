"""Router'larda tekrar kullanılan küçük yardımcılar."""
from fastapi import HTTPException, Request
from sqlalchemy.orm import Query, Session

from . import audit
from .models import HealthMeasurement, User
from .services.analysis import measurement_status


def get_owned(db: Session, model, obj_id: int, user: User, request: Request):
    """Kaydı yalnızca sahibine döndürür. Başkasının kaydına erişim denemesi loglanır
    ve kaydın varlığını sızdırmamak için 404 döner."""
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(404, "Kayıt bulunamadı.")
    if obj.user_id != user.id:
        audit.log(db, request, "UNAUTHORIZED_ACCESS", f"Başka kullanıcıya ait {model.__tablename__} kaydına erişim denemesi",
                  user=user, entity_type=model.__tablename__, entity_id=obj_id, success=False)
        raise HTTPException(404, "Kayıt bulunamadı.")
    return obj


def paginate(query: Query, page: int, page_size: int) -> dict:
    total = query.order_by(None).count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def measurement_out(m: HealthMeasurement) -> dict:
    return {
        "id": m.id, "record_id": m.record_id, "type_id": m.type_id, "type_code": m.type.code,
        "type_name": m.type.name, "category": m.type.category, "value": m.value, "unit": m.unit,
        "measured_at": m.measured_at, "ref_min": m.ref_min, "ref_max": m.ref_max, "source": m.source,
        "note": m.note, "is_demo": m.is_demo, "status": measurement_status(m.value, m.ref_min, m.ref_max),
    }
