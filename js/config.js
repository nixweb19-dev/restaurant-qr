// ==========================================
// LSEMD SAAS - MASTER TEMPLATE CONFIG
// ==========================================
// Her yeni restoran (müşteri) kurulumunda SADECE bu dosyayı düzenleyin.
// Diğer hiçbir koda dokunmanıza gerek yoktur.

export const CONFIG = {
    // 1. SUPABASE VERİTABANI BİLGİLERİ (Her müşteri için ayrı oluşturulan projenin bilgileri)
    SUPABASE_URL: "https://ansbueqjqezghtbmhqtw.supabase.co", // Yeni müşterinin Supabase URL'si
    SUPABASE_ANON_KEY: "sb_publishable_deP59WRC7Gm4KK7CGbTOvg_-Cn02H-p", // Yeni müşterinin Anon Key'i

    // 2. İŞLETME BİLGİLERİ
    RESTAURANT_NAME: "NOVA Cafe & Bistro",
    RESTAURANT_SLUG: "nova-cafe", // QR Çıktıları ve URL için kısa isim (Boşluksuz, Türkçe karaktersiz)
    PHONE_NUMBER: "0555 555 55 55",
    WHATSAPP_NUMBER: "905555555555",
    ADDRESS: "Kadıköy, İstanbul",

    // 3. TEMA VE GÖRÜNÜM AYARLARI
    THEME: {
        PRIMARY_COLOR: "#ff4757", // Ana Tema Rengi (Örn: #ff4757)
        ACCENT_COLOR: "#ffa502",  // Vurgu Rengi
        BG_COLOR: "#fdfbf9",      // Arka Plan Rengi
        SURFACE_COLOR: "#ffffff", // Kart Arka Planları
        TEXT_MAIN: "#2f3542",     // Ana Metin Rengi
        TEXT_MUTED: "#747d8c",    // Soluk Metin Rengi
    },

    // 4. METİN VE AÇIKLAMALAR
    HERO_TITLE: "Hoş Geldiniz",
    HERO_SUBTITLE: "En özel lezzetleri sizin için özenle hazırlıyoruz. Hemen siparişinizi oluşturun.",
    FOOTER_TEXT: "© 2026 LSEMD Yazılım - Tüm Hakları Saklıdır.",
    
    // 5. ÖZELLİK AÇ/KAPA (FEATURE FLAGS)
    ENABLE_WAITER_CALL: true,     // Garson Çağırma Butonu aktif mi?
    ENABLE_ORDER_NOTES: true,     // Sipariş notu aktif mi?
};
