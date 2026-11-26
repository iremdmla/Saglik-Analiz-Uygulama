"""Rapor metni çıkarma (PDF metni / görsel OCR) ve ölçüm önerisi üretme.
Çıkarılan değerler yalnızca ÖNERİDİR; kullanıcı onaylamadan kaydedilmez."""
import re
import shutil
from pathlib import Path

from ..models import MeasurementType

NUM = r"(\d+(?:[.,]\d+)?)"


def extract_text(path: Path, content_type: str) -> tuple[str, str, str | None]:
    """(method, text, message) döndürür."""
    if content_type == "application/pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        text = "\n".join((p.extract_text() or "") for p in reader.pages[:20])
        if not text.strip():
            return "pdf_text", "", "PDF içinde metin bulunamadı (taranmış belge olabilir)."
        return "pdf_text", text, None

    # Görsel: Tesseract kuruluysa OCR, değilse anlaşılır mesaj
    if not shutil.which("tesseract"):
        return "none", "", "OCR motoru (Tesseract) bu ortamda kurulu değil."
    import pytesseract
    from PIL import Image

    with Image.open(path) as img:
        try:
            text = pytesseract.image_to_string(img, lang="tur+eng")
        except pytesseract.TesseractError:
            text = pytesseract.image_to_string(img)
    return "ocr", text, None if text.strip() else "Görselde okunabilir metin bulunamadı."


def _to_float(s: str) -> float:
    return float(s.replace(",", "."))


_FOLD = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def _norm(s: str) -> str:
    """Karşılaştırma için küçük harfe çevirir ve Türkçe karakterleri sadeleştirir (ş→s, ı→i...)."""
    return s.translate(_FOLD).lower().replace("µ", "u")


def parse_measurements(text: str, types: list[MeasurementType]) -> list[dict]:
    """Her satırda katalogdaki bir ölçüm adını arar; değer, birim ve referans aralığını çıkarır."""
    alias_map = [
        (_norm(alias.strip()), t) for t in types for alias in (t.aliases or t.name).split("|") if alias.strip()
    ]
    items, seen = [], set()
    for line in text.splitlines():
        line = line.strip()
        low = _norm(line)
        best = None  # (pozisyon, -uzunluk, tür, alias)
        for alias, t in alias_map:
            m = re.search(rf"(?<![\w]){re.escape(alias)}(?![\w])", low)
            if m and m.start() <= 4:  # test adı satır başında olmalı (ör. 'Hasta: Ayşe Demir' eşleşmesin)
                cand = (m.start(), -len(alias), t, m.end())
                if best is None or cand[:2] < best[:2]:
                    best = cand
        if not best or best[2].id in seen:
            continue
        t = best[2]
        rest = re.sub(r"\([^)]*\)", " ", line[best[3]:])  # '(25-OH)' gibi parantez içlerini atla
        value_m = re.search(NUM, rest)
        if not value_m:
            continue
        after = rest[value_m.end():]
        unit = t.unit if _norm(t.unit) in _norm(after) else None
        after_clean = after.replace(t.unit, " ").replace("10^3", " ").replace("10^6", " ")
        ref_min = ref_max = None
        rng = re.search(rf"{NUM}\s*[-–]\s*{NUM}", after_clean)
        if rng:
            ref_min, ref_max = _to_float(rng.group(1)), _to_float(rng.group(2))
        elif lt := re.search(rf"<\s*{NUM}", after_clean):
            ref_max = _to_float(lt.group(1))
        elif gt := re.search(rf">\s*{NUM}", after_clean):
            ref_min = _to_float(gt.group(1))
        seen.add(t.id)
        items.append({
            "type_id": t.id, "type_name": t.name, "label": line.strip()[:120],
            "value": _to_float(value_m.group(1)), "unit": unit or t.unit,
            "ref_min": ref_min if ref_min is not None else t.ref_min,
            "ref_max": ref_max if ref_max is not None else t.ref_max,
        })
    return items


def make_text_pdf(lines: list[str]) -> bytes:
    """Demo raporları için bağımlılıksız, tek sayfalık basit metin PDF'i üretir (ASCII)."""
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    stream = "BT /F1 11 Tf 50 790 Td 15 TL\n" + "".join(f"({esc(l)}) Tj T*\n" for l in lines) + "ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")
