"""Ölçüm kataloğu. Referans aralıkları erişkinler için yaklaşık genel değerlerdir;
laboratuvara, yaşa ve cinsiyete göre değişebilir. Ölçüm girerken laboratuvarın
kendi aralığı yazılırsa o değer kullanılır."""

# code, ad, kategori, birim, ref_min, ref_max, açıklama, rapor eşleştirme anahtarları
MEASUREMENT_TYPES: list[tuple] = [
    ("HGB", "Hemoglobin", "Hemogram", "g/dL", 12.0, 16.0, "Kanın oksijen taşıyan proteini.", "hemoglobin|hgb|hb"),
    ("WBC", "Lökosit (WBC)", "Hemogram", "10^3/µL", 4.0, 10.0, "Beyaz kan hücresi sayısı.", "lökosit|lokosit|wbc"),
    ("RBC", "Eritrosit (RBC)", "Hemogram", "10^6/µL", 4.2, 5.9, "Kırmızı kan hücresi sayısı.", "eritrosit|rbc"),
    ("HCT", "Hematokrit", "Hemogram", "%", 36.0, 50.0, "Kan hücrelerinin kan hacmine oranı.", "hematokrit|hct"),
    ("PLT", "Trombosit (PLT)", "Hemogram", "10^3/µL", 150.0, 400.0, "Pıhtılaşmada görevli hücreler.", "trombosit|plt"),
    ("MCV", "MCV", "Hemogram", "fL", 80.0, 100.0, "Ortalama eritrosit hacmi.", "mcv"),
    ("B12", "B12 Vitamini", "Vitaminler", "pg/mL", 200.0, 900.0, "Sinir sistemi ve kan yapımı için gerekli vitamin.", "b12|kobalamin"),
    ("VITD", "D Vitamini (25-OH)", "Vitaminler", "ng/mL", 30.0, 100.0, "Kemik ve bağışıklık sağlığı ile ilişkili.", "d vitamini|25-oh|25 oh|vitamin d"),
    ("FE", "Demir (Serum)", "Demir", "µg/dL", 60.0, 170.0, "Kandaki demir düzeyi.", "serum demir|demir|iron"),
    ("FERRITIN", "Ferritin", "Demir", "ng/mL", 15.0, 150.0, "Vücut demir depolarının göstergesi.", "ferritin"),
    ("GLU", "Açlık Kan Şekeri", "Şeker", "mg/dL", 70.0, 100.0, "En az 8 saat açlık sonrası glikoz.", "glukoz|glikoz|glucose|açlık kan şekeri"),
    ("HBA1C", "HbA1c", "Şeker", "%", 4.0, 5.6, "Son 2-3 ayın ortalama kan şekeri göstergesi.", "hba1c|a1c"),
    ("CHOL", "Total Kolesterol", "Kolesterol", "mg/dL", None, 200.0, "Kandaki toplam kolesterol.", "total kolesterol|kolesterol"),
    ("LDL", "LDL Kolesterol", "Kolesterol", "mg/dL", None, 130.0, "'Kötü' kolesterol olarak bilinir.", "ldl"),
    ("HDL", "HDL Kolesterol", "Kolesterol", "mg/dL", 40.0, None, "'İyi' kolesterol olarak bilinir.", "hdl"),
    ("TG", "Trigliserit", "Kolesterol", "mg/dL", None, 150.0, "Kandaki yağ türü.", "trigliserit|trigliserid|tg"),
    ("ALT", "ALT", "Karaciğer", "U/L", 7.0, 56.0, "Karaciğer enzimi.", "alt|sgpt"),
    ("AST", "AST", "Karaciğer", "U/L", 10.0, 40.0, "Karaciğer ve kas enzimi.", "ast|sgot"),
    ("CREA", "Kreatinin", "Böbrek", "mg/dL", 0.6, 1.2, "Böbrek fonksiyon göstergesi.", "kreatinin|creatinine"),
    ("UREA", "Üre", "Böbrek", "mg/dL", 17.0, 43.0, "Protein yıkım ürünü, böbrek göstergesi.", "üre|ure|urea"),
    ("TSH", "TSH", "Tiroid", "mIU/L", 0.4, 4.0, "Tiroid uyarıcı hormon.", "tsh"),
    ("FT4", "Serbest T4", "Tiroid", "ng/dL", 0.9, 1.7, "Tiroid hormonu.", "serbest t4|ft4|free t4"),
    ("SYS", "Sistolik Tansiyon", "Vital Bulgular", "mmHg", 90.0, 120.0, "Büyük tansiyon.", "sistolik"),
    ("DIA", "Diyastolik Tansiyon", "Vital Bulgular", "mmHg", 60.0, 80.0, "Küçük tansiyon.", "diyastolik"),
    ("PULSE", "Nabız", "Vital Bulgular", "atım/dk", 60.0, 100.0, "Dinlenme nabzı.", "nabız|nabiz|pulse"),
    ("WEIGHT", "Kilo", "Vücut Ölçüleri", "kg", None, None, "Vücut ağırlığı.", "kilo|ağırlık"),
    ("SLEEP", "Uyku Süresi", "Yaşam Tarzı", "saat", 7.0, 9.0, "Gece uyku süresi.", "uyku"),
    ("STEPS", "Günlük Adım", "Yaşam Tarzı", "adım", 7000.0, None, "Günlük ortalama adım sayısı.", "adım|adim|steps"),
]
