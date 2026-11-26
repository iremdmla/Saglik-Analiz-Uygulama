"""Deterministik sağlık verisi analizi (yapay zekâ kullanılmaz).
- Referans aralığı karşılaştırması
- Önceki ölçümle değişim ve doğrusal eğilim (NumPy)
- Birim uyuşmazlığı, tek ölçüm, eski veri kontrolleri
"""
from datetime import date

import numpy as np
import pandas as pd

from ..models import HealthMeasurement, HealthProfile, utcnow

STATUS_TEXT = {"low": "referansın altında", "high": "referansın üstünde", "normal": "referans aralığında"}


def measurement_status(value: float, ref_min: float | None, ref_max: float | None) -> str:
    if ref_min is None and ref_max is None:
        return "unknown"
    if ref_min is not None and value < ref_min:
        return "low"
    if ref_max is not None and value > ref_max:
        return "high"
    return "normal"


def bmi_info(height_cm: float | None, weight_kg: float | None) -> tuple[float | None, str | None]:
    if not height_cm or not weight_kg:
        return None, None
    bmi = round(weight_kg / (height_cm / 100) ** 2, 1)
    if bmi < 18.5:
        cat = "Zayıf"
    elif bmi < 25:
        cat = "Normal"
    elif bmi < 30:
        cat = "Fazla kilolu"
    else:
        cat = "Obez"
    return bmi, cat


def age_from(birth: date | None) -> int | None:
    if not birth:
        return None
    t = date.today()
    return t.year - birth.year - ((t.month, t.day) < (birth.month, birth.day))


def analyze(measurements: list[HealthMeasurement], profile: HealthProfile | None = None) -> dict:
    """Kullanıcının tüm ölçümlerini ölçüm türü bazında özetler."""
    items: list[dict] = []
    if measurements:
        df = pd.DataFrame([{
            "type_id": m.type_id, "code": m.type.code, "name": m.type.name, "category": m.type.category,
            "value": m.value, "unit": m.unit, "date": pd.Timestamp(m.measured_at),
            "ref_min": m.ref_min, "ref_max": m.ref_max,
        } for m in measurements]).sort_values("date")

        for _, g in df.groupby("type_id", sort=False):
            latest = g.iloc[-1]
            notes: list[str] = []
            # Farklı birimdeki değerler doğrudan karşılaştırılmaz
            same = g[g["unit"] == latest["unit"]]
            if len(same) < len(g):
                notes.append(f"{len(g) - len(same)} ölçüm farklı birimde olduğu için karşılaştırmaya alınmadı.")
            ref_min = None if pd.isna(latest["ref_min"]) else float(latest["ref_min"])
            ref_max = None if pd.isna(latest["ref_max"]) else float(latest["ref_max"])
            status = measurement_status(float(latest["value"]), ref_min, ref_max)

            prev_value = change = change_pct = slope_30d = None
            trend = "insufficient"
            if len(same) >= 2:
                prev_value = float(same.iloc[-2]["value"])
                change = round(float(latest["value"]) - prev_value, 2)
                change_pct = round(change / prev_value * 100, 1) if prev_value else None
                trend = "stable" if change_pct is not None and abs(change_pct) < 3 else ("up" if change > 0 else "down")
            else:
                notes.append("Karşılaştırma için en az iki ölçüm gerekir.")
            if len(same) >= 3:
                days = (same["date"] - same["date"].iloc[0]).dt.days.to_numpy(dtype=float)
                if days[-1] > 0:
                    slope_30d = round(float(np.polyfit(days, same["value"].to_numpy(dtype=float), 1)[0]) * 30, 3)
            age_days = (pd.Timestamp(date.today()) - latest["date"]).days
            if age_days > 365:
                notes.append("Son ölçüm bir yıldan eski; güncel olmayabilir.")
            if status == "unknown":
                notes.append("Referans aralığı tanımlı değil.")

            items.append({
                "type_id": int(latest["type_id"]), "code": latest["code"], "name": latest["name"],
                "category": latest["category"], "unit": latest["unit"],
                "latest_value": float(latest["value"]), "latest_date": latest["date"].date().isoformat(),
                "previous_value": prev_value, "change": change, "change_pct": change_pct,
                "trend": trend, "slope_per_30_days": slope_30d,
                "ref_min": ref_min, "ref_max": ref_max, "status": status,
                "count": int(len(g)), "notes": notes,
            })

    abnormal = [i for i in items if i["status"] in ("low", "high")]
    insights = [
        f"{i['name']} son ölçümde ({i['latest_value']} {i['unit']}) {STATUS_TEXT[i['status']]}."
        for i in abnormal
    ]
    improved = [
        i for i in items
        if i["status"] == "normal" and i["trend"] in ("up", "down") and i["previous_value"] is not None
        and measurement_status(i["previous_value"], i["ref_min"], i["ref_max"]) != "normal"
    ]
    insights += [f"{i['name']} önceki ölçümde referans dışındaydı, son ölçümde aralığa girdi." for i in improved]

    bmi, bmi_cat = bmi_info(profile.height_cm if profile else None, profile.weight_kg if profile else None)
    return {
        "generated_at": utcnow().isoformat(),
        "total_types": len(items),
        "normal_count": sum(1 for i in items if i["status"] == "normal"),
        "abnormal_count": len(abnormal),
        "unknown_count": sum(1 for i in items if i["status"] == "unknown"),
        "bmi": bmi, "bmi_category": bmi_cat,
        "items": sorted(items, key=lambda i: (i["status"] not in ("low", "high"), i["category"], i["name"])),
        "insights": insights,
        "disclaimer": "Bu analiz bilgilendirme amaçlıdır; tıbbi teşhis veya tedavi yerine geçmez. "
                      "Sonuçlarınızı doktorunuzla değerlendiriniz.",
    }
