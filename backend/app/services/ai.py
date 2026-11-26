"""Yapay zekâ asistanı. Gemini API anahtarı yoksa kural tabanlı yedek cevap üretir.

Güvenlik ilkeleri:
- Model yalnızca backend'de, .env'deki anahtarla çağrılır.
- Modele kullanıcının adı/e-postası gönderilmez; yalnızca deterministik analiz özeti gönderilir.
- Tıbbi değerleri model hesaplamaz; değerler analiz motorundan gelir.
- Sistem talimatı teşhis/tedavi önerisini yasaklar.
"""
import logging

import httpx

from ..config import settings
from . import knowledge

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sen HealthTrack AI uygulamasının Türkçe konuşan sağlık bilgilendirme asistanısın.
Kurallar:
1. Teşhis koyma, tedavi, ilaç veya doz önerme. Gerekirse kullanıcıyı hekime yönlendir.
2. Kullanıcının sağlık değerlerini yalnızca sana verilen 'ANALİZ ÖZETİ' bölümünden kullan; değer uydurma veya hesaplama yapma.
3. Bilgi verirken belirsizliği açıkça belirt ve mümkünse 'KAYNAKLAR' bölümündeki kaynakları göster.
4. Acil belirtilerde (göğüs ağrısı, nefes darlığı, bilinç kaybı vb.) 112'yi aramasını söyle.
5. Uygulama kullanımıyla ilgili sorularda menüleri tarif et: Dashboard, Sağlık Profilim, Sağlık Verilerim, Ölçümlerim, Raporlarım, Analizler, Yapay Zekâ Asistanı, Ayarlar.
Cevapların kısa, anlaşılır ve nazik olsun."""

APP_HELP = {
    ("ekle", "kayıt", "veri gir", "nasıl gir"): "Yeni veri eklemek için 'Sağlık Verilerim' sayfasında 'Yeni Kayıt' butonunu "
        "veya 'Ölçümlerim' sayfasında 'Ölçüm Ekle' butonunu kullanabilirsiniz.",
    ("rapor", "pdf", "yükle", "tahlil sonucu"): "'Raporlarım' sayfasından PDF veya görsel rapor yükleyebilirsiniz. Sistem metni "
        "çıkarır ve önerilen değerleri gösterir; siz onaylamadan hiçbir değer kaydedilmez.",
    ("grafik", "karşılaştır", "değişim"): "'Ölçümlerim' sayfasında bir ölçüm seçerek zaman grafiğini görebilir, "
        "iki tarihi karşılaştırabilirsiniz.",
    ("tema", "karanlık", "koyu"): "Tema değişikliğini üst çubuktaki ay/güneş simgesinden veya 'Ayarlar' sayfasından yapabilirsiniz.",
    ("profil", "boy", "kilo"): "'Sağlık Profilim' sayfasında boy, kilo, kan grubu gibi bilgilerinizi güncelleyebilirsiniz; BMI otomatik hesaplanır.",
}


def build_context(analysis: dict, profile_info: dict) -> str:
    lines = [f"Profil: {profile_info}"]
    for i in analysis.get("items", [])[:40]:
        ref = f"{i['ref_min'] if i['ref_min'] is not None else '-'}–{i['ref_max'] if i['ref_max'] is not None else '-'}"
        change = f", önceki {i['previous_value']} ({i['change_pct']}%)" if i["previous_value"] is not None else ""
        lines.append(f"- {i['name']}: {i['latest_value']} {i['unit']} ({i['latest_date']}), ref {ref}, durum {i['status']}{change}")
    return "\n".join(lines)


def _fallback(question: str, analysis: dict, sources: list[dict], header: bool = True) -> str:
    q = question.lower()
    parts = ["ℹ️ Gemini API yapılandırılmadığı için kural tabanlı yardımcı modu ile yanıt veriyorum."] if header else []
    for keys, answer in APP_HELP.items():
        if any(k in q for k in keys):
            parts.append(answer)
            break
    matched = [i for i in analysis.get("items", []) if i["name"].lower().split(" ")[0] in q or i["code"].lower() in q]
    if matched:
        for i in matched[:3]:
            txt = f"**{i['name']}**: son değer {i['latest_value']} {i['unit']} ({i['latest_date']})"
            if i["status"] != "unknown":
                txt += f", referans aralığına göre durum: {dict(low='düşük', high='yüksek', normal='normal')[i['status']]}"
            if i["change_pct"] is not None:
                txt += f"; önceki ölçüme göre %{i['change_pct']} değişim"
            parts.append(txt + ".")
    elif any(k in q for k in ("özet", "durum", "sonuç", "değerlerim", "genel")):
        parts.append(f"Takip edilen {analysis['total_types']} ölçüm türünden {analysis['abnormal_count']} tanesi son ölçümde referans dışında.")
        parts += [f"• {s}" for s in analysis["insights"][:5]]
    if sources:
        parts.append("Genel bilgi: " + sources[0]["text"])
    if len(parts) <= int(header):
        parts.append("Sorunuzu anlayamadım. Örneğin 'B12 değerim nasıl?', 'Genel durumum özeti' veya 'Rapor nasıl yüklerim?' diye sorabilirsiniz.")
    parts.append("Bu bilgiler tıbbi teşhis yerine geçmez; değerlendirme için doktorunuza danışınız.")
    return "\n\n".join(parts)


def _format_sources(sources: list[dict]) -> str:
    if not sources:
        return ""
    return "\n\n**Kaynaklar:**\n" + "\n".join(f"- [{s['source']}]({s['url']})" for s in sources)


def is_configured() -> bool:
    return bool(settings.gemini_api_key)


def answer(question: str, history: list[tuple[str, str]], analysis: dict, profile_info: dict) -> str:
    sources = knowledge.search(question)
    if not is_configured():
        return _fallback(question, analysis, sources) + _format_sources(sources)

    kb = "\n".join(f"[{s['source']}] {s['text']}" for s in sources) or "Yok"
    system = f"{SYSTEM_PROMPT}\n\nANALİZ ÖZETİ:\n{build_context(analysis, profile_info)}\n\nKAYNAKLAR:\n{kb}"
    contents = [{"role": "user" if r == "user" else "model", "parts": [{"text": c}]} for r, c in history[-10:]]
    contents.append({"role": "user", "parts": [{"text": question}]})
    try:
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
            headers={"x-goog-api-key": settings.gemini_api_key},
            json={"system_instruction": {"parts": [{"text": system}]}, "contents": contents,
                  "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800}},
            timeout=30,
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return text + _format_sources(sources)
    except Exception as exc:  # ağ/anahtar hatası: kullanıcıya teknik detay gösterme
        logger.warning("Gemini çağrısı başarısız: %s", type(exc).__name__)
        return ("⚠️ Yapay zekâ servisine şu anda ulaşılamıyor. Yedek mod ile yanıt veriyorum.\n\n"
                + _fallback(question, analysis, sources, header=False) + _format_sources(sources))
