from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, joinedload

from .. import audit
from ..database import get_db
from ..models import Analysis, HealthMeasurement, HealthRecord, UploadedDocument, User
from ..security import get_current_user
from ..services.analysis import analyze
from ..utils import measurement_out

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def compute_for(db: Session, user: User) -> dict:
    rows = db.query(HealthMeasurement).options(joinedload(HealthMeasurement.type)).filter_by(user_id=user.id).all()
    return analyze(rows, user.profile)


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard için anlık (kaydedilmeyen) özet."""
    result = compute_for(db, user)
    recent = db.query(HealthMeasurement).options(joinedload(HealthMeasurement.type)).filter_by(user_id=user.id) \
        .order_by(HealthMeasurement.measured_at.desc(), HealthMeasurement.id.desc()).limit(6).all()
    result["recent_measurements"] = [measurement_out(m) for m in recent]
    result["record_count"] = db.query(HealthRecord).filter_by(user_id=user.id).count()
    result["measurement_count"] = db.query(HealthMeasurement).filter_by(user_id=user.id).count()
    result["recent_documents"] = [
        {"id": d.id, "title": d.title, "status": d.status, "uploaded_at": d.uploaded_at, "is_demo": d.is_demo}
        for d in db.query(UploadedDocument).filter_by(user_id=user.id).order_by(UploadedDocument.uploaded_at.desc()).limit(3)
    ]
    return result


@router.post("/run", status_code=201)
def run(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = compute_for(db, user)
    a = Analysis(user_id=user.id, summary=result)
    db.add(a)
    db.flush()
    audit.log(db, request, "ANALYSIS_RUN", "Sağlık verisi analizi oluşturuldu", user=user, entity_type="analyses", entity_id=a.id)
    return {"id": a.id, "created_at": a.created_at, **result}


@router.get("/history")
def history(page: int = Query(1, ge=1), page_size: int = Query(5, ge=1, le=20),
            user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Analysis).filter_by(user_id=user.id).order_by(Analysis.created_at.desc())
    total = q.count()
    items = [{"id": a.id, "created_at": a.created_at, "abnormal_count": a.summary.get("abnormal_count"),
              "total_types": a.summary.get("total_types")} for a in q.offset((page - 1) * page_size).limit(page_size)]
    return {"items": items, "total": total, "page": page, "page_size": page_size}
