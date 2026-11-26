"""RAG altyapısının başlangıcı: küçük, kaynaklı bir bilgi tabanı ve TF-IDF ile arama.
İleride bu liste bilimsel kaynaklardan oluşturulan bir vektör veritabanıyla değiştirilebilir."""
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

KNOWLEDGE: list[dict] = [
    {"title": "Hemoglobin ve anemi",
     "text": "Hemoglobin kırmızı kan hücrelerinde oksijen taşıyan proteindir. Düşük hemoglobin anemi ile ilişkili "
             "olabilir; demir, B12 veya folat eksikliği yaygın nedenler arasındadır. Neden belirlenmesi için hekim değerlendirmesi gerekir.",
     "source": "MedlinePlus – Hemoglobin Test", "url": "https://medlineplus.gov/lab-tests/hemoglobin-test/"},
    {"title": "Ferritin ve demir depoları",
     "text": "Ferritin vücuttaki demir depolarını yansıtır. Düşük ferritin genellikle demir eksikliğini gösterir; "
             "enfeksiyon veya iltihap durumlarında ferritin yükselebilir.",
     "source": "MedlinePlus – Ferritin Blood Test", "url": "https://medlineplus.gov/lab-tests/ferritin-blood-test/"},
    {"title": "B12 vitamini",
     "text": "B12 vitamini sinir sistemi ve kan hücresi yapımı için gereklidir. Hayvansal gıdalarda bulunur; "
             "vejetaryen beslenme, yaş ve bazı ilaçlar eksiklik riskini artırabilir.",
     "source": "NIH Office of Dietary Supplements – Vitamin B12", "url": "https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/"},
    {"title": "D vitamini",
     "text": "D vitamini kalsiyum emilimi ve kemik sağlığı için önemlidir. Kandaki düzeyi 25-hidroksi D vitamini "
             "testiyle ölçülür. Güneş ışığı ve bazı besinler kaynaktır; takviye kararı hekimle verilmelidir.",
     "source": "NIH Office of Dietary Supplements – Vitamin D", "url": "https://ods.od.nih.gov/factsheets/VitaminD-Consumer/"},
    {"title": "HbA1c ve kan şekeri",
     "text": "HbA1c son 2-3 aylık ortalama kan şekerini yansıtır. Yüzde 5.7 ile 6.4 arası prediyabet, "
             "yüzde 6.5 ve üzeri diyabet ile uyumlu kabul edilir; tanı hekim tarafından konur.",
     "source": "CDC – A1C Test for Diabetes and Prediabetes", "url": "https://www.cdc.gov/diabetes/diabetes-testing/prediabetes-a1c-test.html"},
    {"title": "Açlık kan şekeri",
     "text": "Açlık kan şekeri en az 8 saatlik açlık sonrası ölçülür. 100-125 mg/dL arası değerler bozulmuş açlık "
             "glukozu olarak değerlendirilebilir.",
     "source": "MedlinePlus – Blood Glucose Test", "url": "https://medlineplus.gov/lab-tests/blood-glucose-test/"},
    {"title": "Kolesterol (LDL, HDL, trigliserit)",
     "text": "LDL yüksekliği kalp-damar hastalığı riskini artırabilir; HDL'nin daha yüksek olması genellikle olumlu "
             "kabul edilir. Beslenme, fiziksel aktivite ve genetik faktörler kolesterol düzeylerini etkiler.",
     "source": "MedlinePlus – Cholesterol Levels", "url": "https://medlineplus.gov/lab-tests/cholesterol-levels/"},
    {"title": "TSH ve tiroid",
     "text": "TSH hipofiz bezinden salgılanır ve tiroid bezini uyarır. Yüksek TSH tiroidin az çalıştığına, düşük TSH "
             "fazla çalıştığına işaret edebilir. Serbest T4 ile birlikte değerlendirilir.",
     "source": "MedlinePlus – TSH Test", "url": "https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/"},
    {"title": "Tansiyon",
     "text": "Kan basıncı sistolik (büyük) ve diyastolik (küçük) olarak ölçülür. 120/80 mmHg altı normal kabul edilir. "
             "Tek bir yüksek ölçüm tanı koydurmaz; farklı zamanlarda tekrar ölçüm gerekir.",
     "source": "American Heart Association – Blood Pressure", "url": "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings"},
    {"title": "Beden kitle indeksi (BMI)",
     "text": "BMI kilonun boyun karesine bölünmesiyle hesaplanır. 18.5-24.9 normal, 25-29.9 fazla kilolu, 30 ve üzeri "
             "obez olarak sınıflandırılır. Kas kütlesini ve vücut yağ dağılımını yansıtmaz.",
     "source": "WHO – Obesity and overweight", "url": "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"},
    {"title": "Karaciğer enzimleri (ALT, AST)",
     "text": "ALT ve AST karaciğer hücrelerinde bulunan enzimlerdir. Yükseklikleri karaciğer hasarına işaret edebilir; "
             "yoğun egzersiz ve bazı ilaçlar da değerleri etkileyebilir.",
     "source": "MedlinePlus – Liver Function Tests", "url": "https://medlineplus.gov/lab-tests/liver-function-tests/"},
    {"title": "Kreatinin ve böbrek fonksiyonu",
     "text": "Kreatinin kas metabolizmasının yan ürünüdür ve böbreklerle atılır. Kandaki yüksek düzey böbrek "
             "fonksiyonunun azaldığını gösterebilir; kas kütlesi değerleri etkiler.",
     "source": "MedlinePlus – Creatinine Test", "url": "https://medlineplus.gov/lab-tests/creatinine-test/"},
    {"title": "Uyku ve fiziksel aktivite",
     "text": "Erişkinler için gecede 7 saat veya daha fazla uyku önerilir. Haftada en az 150 dakika orta yoğunlukta "
             "fiziksel aktivite önerilmektedir.",
     "source": "WHO – Physical activity / CDC – Sleep", "url": "https://www.who.int/news-room/fact-sheets/detail/physical-activity"},
]


@lru_cache
def _index():
    docs = [f"{k['title']} {k['text']}" for k in KNOWLEDGE]
    vec = TfidfVectorizer(lowercase=True, ngram_range=(1, 2))
    return vec, vec.fit_transform(docs)


def search(query: str, k: int = 3, min_score: float = 0.05) -> list[dict]:
    vec, matrix = _index()
    scores = cosine_similarity(vec.transform([query]), matrix)[0]
    ranked = sorted(enumerate(scores), key=lambda x: -x[1])[:k]
    return [KNOWLEDGE[i] for i, s in ranked if s >= min_score]
