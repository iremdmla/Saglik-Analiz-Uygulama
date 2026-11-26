import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from .. import audit
from ..config import settings
from ..database import get_db
from ..models import DocumentExtraction, HealthRecord, MeasurementType, UploadedDocument, User, utcnow
from ..schemas import DocumentOut, ImportIn, Page, RecordOut
from ..security import get_current_user
from ..services import extraction
from ..utils import get_owned, paginate
from .measurements import apply_measurement
from .records import record_out

router = APIRouter(prefix="/api/documents", tags=["documents"])

# İçerik türü istemcinin beyanına değil, dosyanın ilk baytlarına göre belirlenir
MAGIC = {b"%PDF": ("application/pdf", ".pdf"), b"\x89PNG": ("image/png", ".png"), b"\xff\xd8\xff": ("image/jpeg", ".jpg")}


def _file_path(doc: UploadedDocument) -> Path:
    return Path(settings.upload_dir) / str(doc.user_id) / doc.stored_name


def run_extraction(db: Session, doc: UploadedDocument) -> None:
    try:
        method, text, message = extraction.extract_text(_file_path(doc), doc.content_type)
        items = extraction.parse_measurements(text, db.query(MeasurementType).all()) if text else []
        if text and not items:
            message = "Metin çıkarıldı ancak tanınan bir ölçüm bulunamadı. Değerleri manuel ekleyebilirsiniz."
        doc.status = "extracted"
    except Exception:
        method, text, items, message = "none", "", [], "Dosya okunamadı."
        doc.status = "failed"
    ex = doc.extraction or DocumentExtraction(document=doc)
    ex.method, ex.raw_text, ex.items, ex.message = method, text[:20000], items, message
    db.add(ex)


@router.get("", response_model=Page[DocumentOut])
def list_documents(page: int = Query(1, ge=1), page_size: int = Query(6, ge=1, le=50),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(UploadedDocument).options(joinedload(UploadedDocument.extraction)) \
        .filter_by(user_id=user.id).order_by(UploadedDocument.uploaded_at.desc())
    return paginate(q, page, page_size)


@router.post("", response_model=DocumentOut, status_code=201)
async def upload(request: Request, file: UploadFile = File(...), title: str = Form("", max_length=150),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, f"Dosya en fazla {settings.max_upload_mb} MB olabilir.")
    detected = next((v for k, v in MAGIC.items() if content.startswith(k)), None)
    if not detected:
        audit.log(db, request, "DOCUMENT_UPLOAD", "Desteklenmeyen dosya türü reddedildi", user=user, success=False)
        raise HTTPException(415, "Yalnızca PDF, PNG veya JPEG dosyaları yüklenebilir.")
    content_type, ext = detected
    original = Path(file.filename or "rapor").name[:200]
    doc = UploadedDocument(user_id=user.id, title=(title.strip() or Path(original).stem)[:150], original_name=original,
                           stored_name=f"{uuid.uuid4().hex}{ext}", content_type=content_type, size_bytes=len(content))
    path = _file_path(doc)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    db.add(doc)
    db.flush()
    run_extraction(db, doc)
    audit.log(db, request, "DOCUMENT_UPLOAD", f"Rapor yüklendi ({content_type})", user=user,
              entity_type="uploaded_documents", entity_id=doc.id)
    db.refresh(doc)
    return doc


@router.get("/{did}", response_model=DocumentOut)
def get_document(did: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned(db, UploadedDocument, did, user, request)


@router.get("/{did}/file")
def download(did: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = get_owned(db, UploadedDocument, did, user, request)
    path = _file_path(doc)
    if not path.exists():
        raise HTTPException(404, "Dosya bulunamadı.")
    return FileResponse(path, media_type=doc.content_type, filename=doc.original_name,
                        headers={"Cache-Control": "no-store"})


@router.post("/{did}/extract", response_model=DocumentOut)
def re_extract(did: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = get_owned(db, UploadedDocument, did, user, request)
    run_extraction(db, doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/{did}/import", response_model=RecordOut, status_code=201)
def import_items(did: int, data: ImportIn, request: Request, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Kullanıcının kontrol edip onayladığı değerleri sağlık kaydı olarak kaydeder."""
    doc = get_owned(db, UploadedDocument, did, user, request)
    record = HealthRecord(user_id=user.id, title=data.title or doc.title, category="Laboratuvar",
                          record_date=data.record_date, source="Rapor (kullanıcı onaylı)", document_id=doc.id)
    db.add(record)
    for item in data.items:
        item.measured_at, item.source = data.record_date, "Rapor (kullanıcı onaylı)"
        apply_measurement(db, user, item, record=record)
    doc.status = "imported"
    if doc.extraction:
        doc.extraction.confirmed_at = utcnow()
    db.flush()
    audit.log(db, request, "DOCUMENT_IMPORT", f"Rapordan {len(data.items)} ölçüm onaylanarak aktarıldı", user=user,
              entity_type="uploaded_documents", entity_id=doc.id)
    db.refresh(record)
    return record_out(record)


@router.delete("/{did}", status_code=204)
def delete_document(did: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = get_owned(db, UploadedDocument, did, user, request)
    _file_path(doc).unlink(missing_ok=True)
    db.delete(doc)
    audit.log(db, request, "DOCUMENT_DELETE", "Rapor silindi", user=user, entity_type="uploaded_documents", entity_id=did)
