"""Uçtan uca API testleri (geçici SQLite veritabanı ile)."""
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ.update(DATABASE_URL=f"sqlite:///{_tmp}/test.db", UPLOAD_DIR=f"{_tmp}/uploads",
                  ADMIN_PASSWORD="AdminPass123!", DEMO_USER_PASSWORD="DemoPass123!", GEMINI_API_KEY="")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import seed  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.extraction import make_text_pdf  # noqa: E402


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed.run(db)
        seed.run(db)  # tekrar çalıştırma veri çoğaltmamalı
    return TestClient(app)


def login(client, ident, pw):
    r = client.post("/api/auth/login", json={"identifier": ident, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_seed_idempotent(client):
    h = login(client, "admin", "AdminPass123!")
    s = client.get("/api/admin/stats", headers=h).json()
    assert s["total_users"] == 4
    assert s["total_records"] == 120


def test_login_fail_and_role_guard(client):
    assert client.post("/api/auth/login", json={"identifier": "ayse@healthtrack.local", "password": "x"}).status_code == 401
    h = login(client, "ayse@healthtrack.local", "DemoPass123!")
    assert client.get("/api/admin/users", headers=h).status_code == 403
    assert client.get("/api/records").status_code == 401


def test_data_isolation(client):
    ha = login(client, "ayse@healthtrack.local", "DemoPass123!")
    hm = login(client, "mehmet@healthtrack.local", "DemoPass123!")
    rid = client.get("/api/records", headers=ha).json()["items"][0]["id"]
    assert client.get(f"/api/records/{rid}", headers=ha).status_code == 200
    assert client.get(f"/api/records/{rid}", headers=hm).status_code == 404
    assert client.delete(f"/api/records/{rid}", headers=hm).status_code == 404
    ha_admin = login(client, "admin", "AdminPass123!")
    logs = client.get("/api/admin/logs?action=UNAUTHORIZED_ACCESS&success=false", headers=ha_admin).json()
    assert logs["total"] >= 1


def test_refresh_rotation_and_csrf(client):
    c = TestClient(app)
    c.post("/api/auth/login", json={"identifier": "elif@healthtrack.local", "password": "DemoPass123!"})
    old_refresh = c.cookies.get("refresh_token")
    assert c.post("/api/auth/refresh").status_code == 403  # CSRF başlığı yok
    r = c.post("/api/auth/refresh", headers={"X-CSRF-Token": c.cookies.get("csrf_token")})
    assert r.status_code == 200 and c.cookies.get("refresh_token") != old_refresh
    # Eski token'ın tekrar kullanımı reddedilir ve zincir iptal edilir
    c2 = TestClient(app)
    c2.cookies.set("refresh_token", old_refresh, path="/api/auth")
    c2.cookies.set("csrf_token", "t")
    # Birkaç saniye içindeki tekrar (çoklu sekme yarışı) reddedilir ama zincir korunur
    assert c2.post("/api/auth/refresh", headers={"X-CSRF-Token": "t"}).status_code == 401
    assert c.post("/api/auth/refresh", headers={"X-CSRF-Token": c.cookies.get("csrf_token")}).status_code == 200
    # Eski token sonradan tekrar kullanılırsa (hırsızlık şüphesi) tüm zincir iptal edilir
    from datetime import timedelta
    from app.models import RefreshToken
    with SessionLocal() as db:
        for t in db.query(RefreshToken).filter(RefreshToken.revoked_at.isnot(None)):
            t.revoked_at -= timedelta(minutes=5)
        db.commit()
    assert c2.post("/api/auth/refresh", headers={"X-CSRF-Token": "t"}).status_code == 401
    assert c.post("/api/auth/refresh", headers={"X-CSRF-Token": c.cookies.get("csrf_token")}).status_code == 401


def test_record_crud_and_analysis(client):
    h = login(client, "mehmet@healthtrack.local", "DemoPass123!")
    types = {t["code"]: t["id"] for t in client.get("/api/measurements/types", headers=h).json()}
    body = {"title": "Test kaydı", "record_date": "2026-01-10", "measurements": [
        {"type_id": types["GLU"], "value": 130, "measured_at": "2026-01-10"}]}
    r = client.post("/api/records", json=body, headers=h)
    assert r.status_code == 201 and r.json()["abnormal_count"] == 1
    rid = r.json()["id"]
    body["measurements"][0]["value"] = 90
    assert client.put(f"/api/records/{rid}", json=body, headers=h).json()["abnormal_count"] == 0
    assert client.delete(f"/api/records/{rid}", headers=h).status_code == 204
    a = client.get("/api/analysis/overview", headers=h).json()
    assert a["total_types"] > 10 and a["bmi"]
    future = {**body, "record_date": "2999-01-01"}
    assert client.post("/api/records", json=future, headers=h).status_code == 422


def test_upload_extract_import(client):
    h = login(client, "elif@healthtrack.local", "DemoPass123!")
    pdf = make_text_pdf(["Hemoglobin 13.1 g/dL 12 - 16", "TSH 2.4 mIU/L 0.4 - 4.0", "Aclik Kan Sekeri 91 mg/dL 70 - 100"])
    r = client.post("/api/documents", headers=h, files={"file": ("lab.pdf", pdf, "application/pdf")})
    assert r.status_code == 201
    doc = r.json()
    assert {i["type_name"] for i in doc["extraction"]["items"]} == {"Hemoglobin", "TSH", "Açlık Kan Şekeri"}
    items = [{"type_id": i["type_id"], "value": i["value"], "unit": i["unit"], "measured_at": "2026-02-01"}
             for i in doc["extraction"]["items"]]
    r = client.post(f"/api/documents/{doc['id']}/import", headers=h, json={"record_date": "2026-02-01", "items": items})
    assert r.status_code == 201 and len(r.json()["measurements"]) == 3
    bad = client.post("/api/documents", headers=h, files={"file": ("x.pdf", b"MZ fake exe", "application/pdf")})
    assert bad.status_code == 415


def test_assistant_fallback(client):
    h = login(client, "ayse@healthtrack.local", "DemoPass123!")
    assert client.get("/api/assistant/status", headers=h).json()["configured"] is False
    r = client.post("/api/assistant/chat", headers=h, json={"message": "Ferritin değerim nasıl?"})
    assert r.status_code == 200 and "Ferritin" in r.json()["reply"]


def test_admin_deactivate(client):
    ha = login(client, "admin", "AdminPass123!")
    users = client.get("/api/admin/users?q=elif", headers=ha).json()["items"]
    uid = users[0]["id"]
    assert client.patch(f"/api/admin/users/{uid}/status", headers=ha, json={"is_active": False}).status_code == 200
    assert client.post("/api/auth/login", json={"identifier": "elif@healthtrack.local",
                                                "password": "DemoPass123!"}).status_code == 403
    client.patch(f"/api/admin/users/{uid}/status", headers=ha, json={"is_active": True})
    detail = client.get(f"/api/admin/users/{uid}", headers=ha).json()
    assert "measurements" not in detail and detail["measurement_count"] > 0
