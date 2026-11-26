# HealthTrack AI

**Yapay Zekâ Destekli Kişisel Sağlık Verilerinin Analizi, Takibi ve Akıllı Bilgilendirme Sistemi**

HealthTrack AI, kişisel sağlık verilerinin tek bir yerde saklanıp takip edilebildiği bir web uygulamasıdır. Kullanıcılar kan tahlili sonuçlarını, tansiyon, kilo, uyku gibi ölçümlerini kaydedebilir; bu değerlerin zaman içindeki değişimini grafiklerle izleyebilir, referans aralıklarıyla karşılaştırabilir ve yapay zekâ asistanından anlaşılır açıklamalar alabilir.

> Uygulama teşhis veya tedavi amacı taşımaz; bilgilendirme amaçlıdır. Demo hesaplarındaki tüm sağlık verileri sentetiktir.

![Dashboard](docs/screenshots/02-dashboard.jpg)

## Özellikler

- **Sağlık verileri:** Tahlil ve ölçüm kayıtları ekleme, düzenleme, silme; geçmiş ölçümleri grafiklerle izleme ve iki tarihi karşılaştırma
- **Rapor yükleme:** PDF veya görsel rapordan değerlerin otomatik çıkarılması; kullanıcı onayladıktan sonra kayıtlara aktarılması
- **Analiz:** Referans aralığı kontrolü, değişim ve eğilim hesaplama
- **Yapay zekâ asistanı:** Kullanıcının kendi verileri ve genel sağlık bilgileri hakkında kaynak gösteren sohbet (Gemini API ile; API anahtarı yoksa yedek modda çalışır)
- **Yönetici paneli:** Kullanıcı yönetimi, sistem logları ve istatistikler
- **Güvenlik:** JWT ile kimlik doğrulama, rol bazlı yetkilendirme, kullanıcı verilerinin birbirinden izolasyonu
- Açık / koyu tema, mobil uyumlu tasarım

**Kullanılan teknolojiler:** React, TypeScript, Material UI, Recharts · Python, FastAPI, SQLAlchemy · SQLite, Alembic · Pandas, NumPy, scikit-learn · Docker

## Kurulum

Bilgisayarda yalnızca [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu olması yeterlidir.

```bash
git clone https://github.com/iremdmla/saglik-analiz-uygulama.git
cd saglik-analiz-uygulama
docker compose up --build
```

İlk çalıştırma birkaç dakika sürebilir. Veritabanı, demo kullanıcılar ve örnek veriler otomatik olarak oluşturulur.

Uygulama adresi: **http://localhost:8080**

| Rol | Kullanıcı adı / E-posta | Şifre |
|---|---|---|
| Yönetici | `admin` | `Admin.Demo2026` |
| Kullanıcı | `ayse@healthtrack.local` | `Demo.User2026` |
| Kullanıcı | `mehmet@healthtrack.local` | `Demo.User2026` |
| Kullanıcı | `elif@healthtrack.local` | `Demo.User2026` |

**Diğer komutlar**

```bash
docker compose up -d --build   # arka planda başlatma
docker compose down            # durdurma (veriler korunur)
docker compose logs -f         # logları görüntüleme
```

> ⚠️ `docker compose down -v` komutu veritabanını ve yüklenen raporları kalıcı olarak siler.

**İsteğe bağlı ayarlar:** Şifreleri, portu veya Gemini API anahtarını değiştirmek için `.env.example` dosyasını `.env` olarak kopyalayıp düzenleyebilirsiniz.
