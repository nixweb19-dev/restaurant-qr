# RestaurantQR Master

> **ÖNEMLİ BİLGİLENDİRME:**
> Master Template asla müşteri için kullanılmayacaktır.
> Bu klasör sadece referans (golden template) olarak korunacaktır.
> Her yeni müşteri için yalnızca bu klasör kopyalanacaktır.
> Master Template üzerinde yapılan tüm geliştirmeler önce test edilecek, ardından yeni müşteriler için kullanılacaktır.

## Versiyon Bilgisi
- **Sürüm:** v1.0.0
- **Durum:** Stable Release (Production Ready)
- **Son Güncelleme:** 28.07.2026

## Güncelleme Politikası
Master Template'e eklenen yeni özellikler eski müşterilere **otomatik gitmeyecektir.**
Eğer eski bir müşteri yeni bir özellik talep ederse, yalnızca o müşterinin ilgili projesi manuel olarak güncellenecek ve test edilecektir. Bu politika, eski projelerin stabilitesini korumak için esastır.

## Dosya Yapısı Standardı
Müşteri sayısının artmasıyla karışıklık yaşanmaması için sistem aşağıdaki gibi organize edilmelidir:
- `/customer-projects/`: Tüm müşteri klasörlerinin (kopyalarının) barınacağı alan. (Bu klasör Git'te yoksayılır).
- `/master/` veya ana dizin: Golden Template'in bulunduğu yer.
- `/docs/`: Proje dokümantasyonları.
- `/changelog/`: Sürüm notları (Örn. v1.1 neler geldi).
- `/releases/`: İleriye dönük zip veya farklı yayın dosyaları.

## Kurulum Checklist'i (Yeni Müşteri Geldiğinde)
Yeni bir müşteri ile anlaşıldığında, kurulum sürecini kusursuz tamamlamak için aşağıdaki listeyi takip edin:
- [ ] Master klasörü kopyalandı (ve adı müşteriye göre değiştirildi)
- [ ] Yeni Supabase projesi oluşturuldu
- [ ] SQL şeması (`supabase_master_schema.md`) çalıştırıldı
- [ ] `js/config.js` güncellendi (Restoran adı, renkler, yeni supabase bilgileri vb.)
- [ ] Logo değiştirildi (Gerekirse `assets` vb. alanlara yeni logolar yüklendi)
- [ ] Müşterinin menüsü sisteme girildi (Admin panelinden)
- [ ] WhatsApp numarası ve telefon güncellendi
- [ ] Müşteriye özel Domain (Alan Adı) Vercel'de bağlandı
- [ ] Test siparişi oluşturuldu ve çalışırlığı doğrulandı
- [ ] Admin panel fonksiyonları (QR çıkarma, sipariş onay vb.) test edildi
- [ ] Mobil cihazda görünüm (Responsive yapı) test edildi
- [ ] Proje canlı yayına alındı!
