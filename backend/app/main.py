import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import settings
from .database import SessionLocal
from .routers import admin, analysis, assistant, auth, documents, measurements, profile, records

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("healthtrack")

app = FastAPI(
    title=f"{settings.app_name} API",
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)

if settings.cors_origin_list:  # aynı origin (nginx proxy) kullanıldığında CORS gerekmez
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                       allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    # Girdi değerlerini geri yansıtmadan sade hata listesi döndür
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"].replace("Value error, ", "")}
              for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Girilen bilgileri kontrol edin.", "errors": errors})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("Beklenmeyen hata: %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."})


for r in (auth, profile, records, measurements, documents, analysis, assistant, admin):
    app.include_router(r.router)


@app.get("/api/health", tags=["system"])
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok", "environment": settings.environment}
