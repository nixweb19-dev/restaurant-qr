# RestaurantQR Master - Sürüm Notları (Changelog)

## v1.0.0 (28.07.2026)
- **Mimari:** Multi-Tenant (SaaS) yapısından "Single-Tenant Master Template" stratejisine geçiş yapıldı.
- **Karekod (QR) Sistemi:** Admin panelinden tek tuşla sınırsız QR kodu üretme, masa bilgilerini QR içine entegre etme eklendi. (api.qrserver.com entegrasyonu)
- **Otomatik Masa Tanıma:** `?m=X` parametresiyle müşterilerin masası otomatik seçilir hale getirildi. "Masa Seçin" dropdown menüsü müşteriler için gizlendi.
- **Config Sistemi:** Yeni restoranlara kurulumu 2 dakikaya düşürmek için `js/config.js` dosyası eklendi.
- **Admin Girişi:** Karmaşık Supabase Auth sistemi yerine, `config.js` içerisinden belirlenen basit şifre kontrolü getirildi (`login.html` silindi).
- **Güvenlik & Optimizasyon:** `workspace_id` kontrolleri tamamen temizlendi, SQL sorguları hızlandırıldı, Supabase güvenlik kuralları single-tenant yapıya göre baştan yazıldı.
- **Tasarım:** Premium akıcı tasarım, Lens scroll, animasyonlu sepet ve modal yönetimleri korundu.

> *Not: Sonraki geliştirmeler yukarıya v1.1.0 vb. şeklinde eklenecektir.*
