// ==========================================
// MASTER TEMPLATE CONFIG
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
    TABLE_COUNT: 50, // Restorandaki masa sayısı (Seçenekleri otomatik oluşturur)
    PHONE_NUMBER: "0555 555 55 55",
    WHATSAPP_NUMBER: "905555555555",
    ADDRESS: "Kadıköy, İstanbul",

    // 3. ADMIN PANELİ ŞİFRESİ
    ADMIN_PASSWORD: "123", // admin.html sayfasına girişte sorulacak şifre

    // 4. TEMA VE GÖRÜNÜM AYARLARI
    THEME: {
        PRIMARY_COLOR: "#ff4757", // Ana Tema Rengi (Örn: #ff4757)
        ACCENT_COLOR: "#ffa502",  // Vurgu Rengi
        BG_COLOR: "#fdfbf9",      // Arka Plan Rengi
        SURFACE_COLOR: "#ffffff", // Kart Arka Planları
        TEXT_MAIN: "#2f3542",     // Ana Metin Rengi
        TEXT_MUTED: "#747d8c",    // Soluk Metin Rengi
    },

    // 5. METİN VE AÇIKLAMALAR
    HERO_TITLE: "Hoş Geldiniz",
    HERO_SUBTITLE: "En özel lezzetleri sizin için özenle hazırlıyoruz. Hemen siparişinizi oluşturun.",
    FOOTER_TEXT: "© 2026 LSEMD Yazılım - Tüm Hakları Saklıdır.",
    
    // 6. ÖZELLİK AÇ/KAPA (FEATURE FLAGS)
    ENABLE_WAITER_CALL: true,     // Garson Çağırma Butonu aktif mi?
    ENABLE_ORDER_NOTES: true,     // Sipariş notu aktif mi?

    // 7. STATİK MENÜ VERİSİ
    MENU_DATA: [
        {
            category: 'Sıcak Kahveler',
            products: [
                { id: 'c1', name: 'Caramel Macchiato', price: 95.00, desc: 'Taze espresso, buharda ısıtılmış süt ve karamel şurubu.' },
                { id: 'c2', name: 'Caffè Mocha', price: 105.00, desc: 'Espresso, mocha sosu, sıcak süt ve çırpılmış krema.' },
                { id: 'c3', name: 'Flat White', price: 85.00, desc: 'İki shot ristretto ve ince köpüklü sıcak süt.' },
                { id: 'c4', name: 'Americano', price: 70.00, desc: 'Sıcak su ile inceltilmiş yoğun espresso.' }
            ]
        },
        {
            category: 'Soğuk İçecekler',
            products: [
                { id: 'i1', name: 'Iced White Mocha', price: 115.00, desc: 'Beyaz çikolata sosu, espresso, soğuk süt ve buz.' },
                { id: 'i2', name: 'Cold Brew', price: 90.00, desc: '12 saat soğuk suda demlenmiş yoğun kahve.' },
                { id: 'i3', name: 'Çilekli Frappuccino', price: 125.00, desc: 'Çilek sosu, süt, buz ve çırpılmış krema.' },
                { id: 'i4', name: 'Cool Lime', price: 95.00, desc: 'Ferahlatıcı limon ve nane özü, buzlu.' }
            ]
        },
        {
            category: 'Tatlılar & Fırın',
            products: [
                { id: 'd1', name: 'San Sebastian Cheesecake', price: 150.00, desc: 'Orijinal İspanyol tarifi, üzeri yanık, içi akışkan peynir keki.' },
                { id: 'd2', name: 'Çikolatalı Kruvasan', price: 85.00, desc: 'Taze fırınlanmış, içi Belçika çikolatası dolgulu.' },
                { id: 'd3', name: 'Tiramisu', price: 130.00, desc: 'Espresso ile ıslatılmış kedi dili ve mascarpone kreması.' },
                { id: 'd4', name: 'Havuçlu Cevizli Kek', price: 90.00, desc: 'Tarçın aromalı, cevizli ve havuçlu ev keki.' }
            ]
        }
    ]
};
