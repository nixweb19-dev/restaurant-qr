import { supabase } from './supabaseClient.js';
import { CONFIG } from './config.js';

// --- SİSTEM STATE ---
const urlParams = new URLSearchParams(window.location.search);
const autoTable = urlParams.get('m');
let MENU_DATA = [];

// --- TEMA UYGULAMA ---
function applyTheme() {
    const root = document.documentElement;
    root.style.setProperty('--primary', CONFIG.THEME.PRIMARY_COLOR);
    root.style.setProperty('--accent', CONFIG.THEME.ACCENT_COLOR);
    root.style.setProperty('--bg-color', CONFIG.THEME.BG_COLOR);
    root.style.setProperty('--surface', CONFIG.THEME.SURFACE_COLOR);
    root.style.setProperty('--text-main', CONFIG.THEME.TEXT_MAIN);
    root.style.setProperty('--text-muted', CONFIG.THEME.TEXT_MUTED);
}
applyTheme();

// --- SEPET STATE ---
let cart = [];
let selectedTable = autoTable || '';
let currentProduct = null;
let currentQty = 1;

// --- DOM ELEMANLARI ---
const menuContainer = document.getElementById('menuContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const tableSelector = document.getElementById('tableNumber');

// Table Select Modal (Waiter)
const tableSelectModal = document.getElementById('tableSelectModal');
const closeTableSelectBtn = document.getElementById('closeTableSelectBtn');
const tableSelectGrid = document.getElementById('tableSelectGrid');

// Cart Modal
const cartButton = document.getElementById('cartButton');
const cartItemCount = document.getElementById('cartItemCount');
const cartTotal = document.getElementById('cartTotal');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const modalCartTotal = document.getElementById('modalCartTotal');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');
const orderNotes = document.getElementById('orderNotes');

// Product Modal
const productModal = document.getElementById('productModal');
const closeProductBtn = document.getElementById('closeProductBtn');
const productModalName = document.getElementById('productModalName');
const productModalDesc = document.getElementById('productModalDesc');
const productModalPrice = document.getElementById('productModalPrice');
const productModalQty = document.getElementById('productModalQty');
const qtyMinusBtn = document.getElementById('qtyMinusBtn');
const qtyPlusBtn = document.getElementById('qtyPlusBtn');
const itemNotes = document.getElementById('itemNotes');
const addToCartConfirmBtn = document.getElementById('addToCartConfirmBtn');
const addToCartBtnText = document.getElementById('addToCartBtnText');

// Waiter Button
const callWaiterBtn = document.getElementById('callWaiterBtn');

// Alert Modal
const alertModal = document.getElementById('alertModal');
const alertModalMessage = document.getElementById('alertModalMessage');
const alertModalCloseBtn = document.getElementById('alertModalCloseBtn');
const alertModalIcon = document.getElementById('alertModalIcon');
const alertModalTitle = document.getElementById('alertModalTitle');

// Order Status Modal
const orderStatusBtn = document.getElementById('orderStatusBtn');
const orderStatusModal = document.getElementById('orderStatusModal');
const closeOrderStatusBtn = document.getElementById('closeOrderStatusBtn');
const orderStatusIcon = document.getElementById('orderStatusIcon');
const orderStatusTitle = document.getElementById('orderStatusTitle');
const orderStatusDesc = document.getElementById('orderStatusDesc');
const customerNotificationSound = document.getElementById('customerNotificationSound');

let currentOrderId = localStorage.getItem('lastOrderId');

function playCustomerSound() {
    try {
        if(customerNotificationSound) {
            customerNotificationSound.currentTime = 0;
            customerNotificationSound.play().catch(e => console.log('Otomatik ses çalma engellendi.', e));
        }
    } catch(err) {
        console.error(err);
    }
}

function showCustomAlert(message, type = 'info') {
    alertModalMessage.innerText = message;
    
    if (type === 'success') {
        alertModalIcon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4CAF50;"></i>';
        alertModalTitle.innerText = 'Siparişiniz Alındı!';
    } else if (type === 'error') {
        alertModalIcon.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #F44336;"></i>';
        alertModalTitle.innerText = 'Hata Oluştu';
    } else if (type === 'warning') {
        alertModalIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent);"></i>';
        alertModalTitle.innerText = 'Eksik Seçim';
    } else {
        alertModalIcon.innerHTML = '<i class="fa-solid fa-bell" style="color: var(--primary);"></i>';
        alertModalTitle.innerText = 'Bilgilendirme';
    }

    alertModal.classList.remove('hidden');
    const content = alertModal.querySelector('.modal-content');
    content.style.transform = 'scale(1)';
}

function closeCustomAlert() {
    const content = alertModal.querySelector('.modal-content');
    content.style.transform = 'scale(0.9)';
    setTimeout(() => {
        alertModal.classList.add('hidden');
    }, 150);
}


// --- LENS SMOOTH SCROLL ---
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// --- İLK YÜKLEME ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // Restoran Bilgilerini UI'a Uygula
    document.title = `${CONFIG.RESTAURANT_NAME} | Sipariş Menüsü`;
    document.querySelector('.header-content h1').innerText = CONFIG.RESTAURANT_NAME;
    
    const heroTitle = document.querySelector('.hero-content h2');
    const heroSub = document.querySelector('.hero-content p');
    if(heroTitle) heroTitle.innerText = CONFIG.HERO_TITLE;
    if(heroSub) heroSub.innerText = CONFIG.HERO_SUBTITLE;

    // Özellik bayraklarını uygula
    if (!CONFIG.ENABLE_WAITER_CALL && callWaiterBtn) {
        callWaiterBtn.style.display = 'none';
    }
    if (!CONFIG.ENABLE_ORDER_NOTES && orderNotes) {
        orderNotes.parentElement.style.display = 'none';
    }

    // 2. Menüyü Çek ve Oluştur
    await fetchAndBuildMenu();

    loadingIndicator.classList.add('hidden');
    menuContainer.classList.remove('hidden');

    // Masaları Çek ve Dinle
    fetchTables();
    setupTableSubscription();

    // Sipariş durumunu kontrol et
    if (currentOrderId) {
        orderStatusBtn.classList.remove('hidden');
        setupOrderStatusSubscription();
    }

    // Masa seçimi (Eğer URL'den gelmemişse)
    if (autoTable) {
        // Sepetteki masa seçiciyi gizle
        const cartTableSelector = document.querySelector('.cart-table-selector');
        if (cartTableSelector) cartTableSelector.style.display = 'none';
        
        // Garson çağırırken sorulan masa seçiciyi atla (direkt çağır)
        // Bunun mantığı callWaiter() fonksiyonunda yönetilecek
    } else {
        tableSelector.addEventListener('change', (e) => {
            selectedTable = e.target.value;
        });
    }

    // Cart Modal Kontrolleri
    cartButton.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) closeCart();
    });

    // Product Modal Kontrolleri
    closeProductBtn.addEventListener('click', closeProductModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
    });
    
    qtyMinusBtn.addEventListener('click', () => {
        if(currentQty > 1) {
            currentQty--;
            updateProductModalUI();
        }
    });
    
    qtyPlusBtn.addEventListener('click', () => {
        currentQty++;
        updateProductModalUI();
    });
    
    addToCartConfirmBtn.addEventListener('click', confirmAddToCart);

    // Alert Modal Kontrolleri
    alertModalCloseBtn.addEventListener('click', closeCustomAlert);
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) closeCustomAlert();
    });

    // Garson Çağır
    if (callWaiterBtn) {
        callWaiterBtn.addEventListener('click', callWaiter);
    }
    
    if (closeTableSelectBtn) {
        closeTableSelectBtn.addEventListener('click', () => tableSelectModal.classList.add('hidden'));
    }
    if (tableSelectModal) {
        tableSelectModal.addEventListener('click', (e) => {
            if (e.target === tableSelectModal) tableSelectModal.classList.add('hidden');
        });
    }

    // Sipariş Onay
    confirmOrderBtn.addEventListener('click', submitOrder);

    // Sipariş Durumu
    orderStatusBtn.addEventListener('click', checkOrderStatus);
    closeOrderStatusBtn.addEventListener('click', closeOrderStatus);
    orderStatusModal.addEventListener('click', (e) => {
        if (e.target === orderStatusModal) closeOrderStatus();
    });
});

// --- FONKSİYONLAR ---

async function fetchAndBuildMenu() {
    MENU_DATA = CONFIG.MENU_DATA;
    
    if (!MENU_DATA || MENU_DATA.length === 0) {
        menuContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Restoran henüz menü eklememiş.</div>';
    } else {
        renderMenu();
    }
}

async function fetchTables() {
    const { data: tables, error } = await supabase
        .from('tables')
        .select('table_number, status')
        .order('table_number', { ascending: true });

    if (error) {
        console.error('Masalar çekilirken hata oluştu:', error);
        return;
    }

    // Mevcut seçimi kaydet
    const currentSelection = tableSelector.value;
    
    // Select içeriğini temizle ama ilk seçeneği bırak
    tableSelector.innerHTML = '<option value="" disabled selected>Lütfen Masanızı Seçiniz</option>';
    
    let isCurrentSelectionAvailable = false;

    let gridHtml = '';

    tables.forEach(table => {
        const option = document.createElement('option');
        option.value = table.table_number;
        
        if (table.status === 'available') {
            option.textContent = `Masa ${table.table_number}`;
            if (currentSelection == table.table_number) {
                isCurrentSelectionAvailable = true;
            }
            // Grid için buton (sadece müsait masalar)
            gridHtml += `<button class="table-grid-btn" onclick="selectTableForWaiter('${table.table_number}')"><i class="fa-solid fa-chair"></i> Masa ${table.table_number}</button>`;
        } else if (table.status === 'occupied') {
            option.textContent = `Masa ${table.table_number} (Dolu)`;
            option.disabled = true;
            gridHtml += `<button class="table-grid-btn disabled" disabled><i class="fa-solid fa-users"></i> Masa ${table.table_number}</button>`;
        } else if (table.status === 'reserved') {
            option.textContent = `Masa ${table.table_number} (Rezerve)`;
            option.disabled = true;
            gridHtml += `<button class="table-grid-btn disabled" disabled><i class="fa-solid fa-calendar-check"></i> Masa ${table.table_number}</button>`;
        }
        
        tableSelector.appendChild(option);
    });

    if (tableSelectGrid) {
        tableSelectGrid.innerHTML = gridHtml;
    }

    // Eğer önceki seçilen masa hala müsaitse seçili bırak
    if (isCurrentSelectionAvailable) {
        tableSelector.value = currentSelection;
    } else {
        selectedTable = ''; // Müsait değilse seçimi sıfırla
    }
}

function setupTableSubscription() {
    supabase
        .channel('public:tables')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
            fetchTables();
        })
        .subscribe();
}

function renderMenu() {
    let html = '';
    
    // 1. Kategori haplarını (pills) oluştur
    html += `<div class="categories-wrapper">`;
    MENU_DATA.forEach((category, index) => {
        const catId = `cat-${index}`;
        html += `<div class="category-pill ${index === 0 ? 'active' : ''}" onclick="scrollToCategory('${catId}')">${category.category}</div>`;
    });
    html += `</div>`;

    // 2. Kategorileri ve ürünleri oluştur
    MENU_DATA.forEach((category, index) => {
        const catId = `cat-${index}`;
        html += `<div class="menu-category" id="${catId}">
                    <h2>${category.category}</h2>
                    <div class="products-grid">`;
        
        category.products.forEach(product => {
            html += `
                <div class="product-card" onclick="openProductModal('${product.id}')">
                    <div class="product-image">
                        <i class="fa-solid ${getCategoryIcon(category.category)}"></i>
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-desc">${product.desc}</div>
                    </div>
                    <div class="product-bottom">
                        <div class="product-price">${product.price.toFixed(2)} TL</div>
                        <button class="add-icon-btn">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    menuContainer.innerHTML = html;
}

window.scrollToCategory = (id) => {
    const el = document.getElementById(id);
    if (el) {
        // Pill aktifliğini güncelle
        document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

function getCategoryIcon(catName) {
    if(catName.includes('Sıcak')) return 'fa-mug-hot';
    if(catName.includes('Soğuk')) return 'fa-glass-water';
    if(catName.includes('Tatlı')) return 'fa-cake-candles';
    return 'fa-utensils';
}

// Window'a ekliyoruz ki HTML içinden de çağrılabilsin
window.openProductModal = (id) => {
    // Ürünü bul
    let product = null;
    let catIcon = '';
    for(let cat of MENU_DATA) {
        const found = cat.products.find(p => p.id === id);
        if(found) {
            product = found;
            catIcon = getCategoryIcon(cat.category);
            break;
        }
    }
    if(!product) return;

    currentProduct = product;
    currentQty = 1;
    itemNotes.value = '';

    productModalName.innerText = product.name;
    productModalDesc.innerText = product.desc;
    document.getElementById('productImagePlaceholder').innerHTML = `<i class="fa-solid ${catIcon}"></i>`;
    
    updateProductModalUI();
    
    productModal.classList.remove('hidden');
};

function updateProductModalUI() {
    if(!currentProduct) return;
    productModalQty.innerText = currentQty;
    const total = currentProduct.price * currentQty;
    productModalPrice.innerText = total.toFixed(2) + ' TL';
    addToCartBtnText.innerText = `Sepete Ekle (${total.toFixed(2)} TL)`;
}

function closeProductModal() {
    productModal.classList.add('hidden');
    currentProduct = null;
}

function confirmAddToCart() {
    if(!currentProduct) return;
    
    const note = itemNotes.value.trim();
    // Sepette aynı ürün ve aynı nota sahip olanı bul (farklı notlu ürünler ayrı satırda görünsün)
    const existing = cart.find(i => i.id === currentProduct.id && i.note === note);
    
    if (existing) {
        existing.quantity += currentQty;
    } else {
        cart.push({ 
            id: currentProduct.id, 
            name: currentProduct.name, 
            price: currentProduct.price, 
            quantity: currentQty,
            note: note
        });
    }
    
    updateCartUI();
    closeProductModal();
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartUI();
    renderCartModal();
};

window.increaseCartItem = (index) => {
    cart[index].quantity += 1;
    updateCartUI();
    renderCartModal();
}

window.decreaseCartItem = (index) => {
    if(cart[index].quantity > 1) {
        cart[index].quantity -= 1;
    } else {
        cart.splice(index, 1);
    }
    updateCartUI();
    renderCartModal();
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (totalItems > 0) {
        cartButton.classList.remove('hidden');
        cartItemCount.innerText = totalItems;
        cartTotal.innerText = totalPrice.toFixed(2) + ' TL';
    } else {
        cartButton.classList.add('hidden');
        closeCart();
    }
}

function openCart() {
    renderCartModal();
    cartModal.classList.remove('hidden');
}

function closeCart() {
    cartModal.classList.add('hidden');
}

// XSS (Zararlı Kod) Koruması için Yardımcı Fonksiyon
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderCartModal() {
    let html = '';
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cart.length === 0) {
        html = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Sepetiniz boş.</div>';
    } else {
        cart.forEach((item, index) => {
            const safeName = escapeHTML(item.name);
            const safeNote = escapeHTML(item.note);
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <strong>${safeName}</strong>
                        ${item.note ? `<div style="font-size:0.8rem; color:var(--accent); margin-bottom:4px;">Not: ${safeNote}</div>` : ''}
                        <span>${(item.price * item.quantity).toFixed(2)} TL</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="decreaseCartItem(${index})"><i class="fa-solid fa-minus"></i></button>
                        <span style="font-weight:600;">${item.quantity}</span>
                        <button class="qty-btn" onclick="increaseCartItem(${index})"><i class="fa-solid fa-plus"></i></button>
                        <button class="qty-btn" style="color:var(--primary); margin-left:10px;" onclick="removeFromCart(${index})"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </div>
            `;
        });
    }

    cartItemsContainer.innerHTML = html;
    modalCartTotal.innerText = totalPrice.toFixed(2) + ' TL';
}

async function submitOrder() {
    if (!selectedTable) {
        showCustomAlert("Lütfen siparişi onaylamadan önce hemen yukarıdan Masa Numaranızı seçin!", "warning");
        return;
    }

    if (cart.length === 0) return;

    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gönderiliyor...';

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const notes = orderNotes.value;

    // --- Güvenlik Kontrolleri (Anti-Spam / Anti-Manipülasyon) ---
    if (totalPrice < 0) {
        showCustomAlert("Hata: Sepet tutarı negatif olamaz!", "error");
        confirmOrderBtn.disabled = false;
        return;
    }
    const hasInvalidQty = cart.some(item => item.quantity <= 0 || item.quantity > 50);
    if (hasInvalidQty) {
        showCustomAlert("Hata: Geçersiz ürün miktarı!", "error");
        confirmOrderBtn.disabled = false;
        return;
    }
    if (notes && notes.length > 500) {
        showCustomAlert("Hata: Sipariş notunuz çok uzun (Maks. 500 karakter).", "error");
        confirmOrderBtn.disabled = false;
        return;
    }
    // --------------------------------------------------------

    // Cihaz bilgisini al
    let device = "Masaüstü";
    if (/android/i.test(navigator.userAgent)) device = "Android";
    else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) device = "iOS";
    
    const deviceStr = `[Cihaz: ${device}]`;
    const finalNotes = notes ? `${notes} | ${deviceStr}` : deviceStr;

    const { data, error } = await supabase
        .from('orders')
        .insert([
            {
                table_number: "Masa " + selectedTable,
                items: cart, // Cart objesi artık özel notları da barındırıyor (item.note)
                notes: finalNotes, // Genel sipariş notu + cihaz bilgisi
                total_price: totalPrice,
                status: 'pending'
            }
        ])
        .select();

    if (error) {
        console.error(error);
        showCustomAlert("Sipariş gönderilirken bir hata oluştu!", "error");
        confirmOrderBtn.disabled = false;
        confirmOrderBtn.innerHTML = '<span>Siparişi Onayla</span><i class="fa-solid fa-arrow-right"></i>';
    } else {
        // Sipariş ID kaydet
        if (data && data.length > 0) {
            currentOrderId = data[0].id;
            localStorage.setItem('lastOrderId', currentOrderId);
            orderStatusBtn.classList.remove('hidden');
            setupOrderStatusSubscription();
        }
        // Masayı dolu olarak işaretle
        const { error: updateError } = await supabase
            .from('tables')
            .update({ status: 'occupied' })
            .eq('table_number', selectedTable);
            
        if (updateError) {
            console.error("Masa durumu güncellenemedi:", updateError);
        }

        showCustomAlert("Siparişiniz başarıyla mutfağa iletildi! Bizi tercih ettiğiniz için teşekkürler.", "success");
        // Sepeti temizle
        cart = [];
        orderNotes.value = '';
        if (!autoTable) {
            selectedTable = '';
            tableSelector.value = '';
        }
        updateCartUI();
        confirmOrderBtn.disabled = false;
        confirmOrderBtn.innerHTML = '<span>Siparişi Onayla</span><i class="fa-solid fa-arrow-right"></i>';
    }
}

// --- SİPARİŞ DURUMU YÖNETİMİ ---
function closeOrderStatus() {
    orderStatusModal.classList.add('hidden');
}

async function checkOrderStatus() {
    if (!currentOrderId) return;
    
    // Geçici yükleniyor durumu
    orderStatusIcon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    orderStatusIcon.style.color = 'var(--text-muted)';
    orderStatusTitle.innerText = 'Durum Kontrol Ediliyor...';
    orderStatusDesc.innerText = 'Lütfen bekleyin.';
    
    orderStatusModal.classList.remove('hidden');

    const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('id', currentOrderId)
        .single();

    if (error || !data) {
        console.error("Durum çekilemedi:", error);
        orderStatusTitle.innerText = 'Bilgi Alınamadı';
        orderStatusDesc.innerText = 'Sipariş durumunuz şu an çekilemiyor.';
        orderStatusIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        orderStatusIcon.style.color = '#f44336';
        return;
    }

    updateOrderStatusUI(data.status);
}

function updateOrderStatusUI(status) {
    if (status === 'pending') {
        orderStatusIcon.innerHTML = '<i class="fa-solid fa-clock"></i>';
        orderStatusIcon.style.color = '#ff9800'; // Turuncu (Bekliyor)
        orderStatusTitle.innerText = 'Siparişiniz Beklemede';
        orderStatusDesc.innerText = 'Siparişiniz mutfağa iletildi, onaylanması bekleniyor.';
    } else if (status === 'preparing') {
        orderStatusIcon.innerHTML = '<i class="fa-solid fa-fire-burner"></i>';
        orderStatusIcon.style.color = '#2196F3'; // Mavi (Hazırlanıyor)
        orderStatusTitle.innerText = 'Siparişiniz Hazırlanıyor';
        orderStatusDesc.innerText = 'Şefimiz siparişinizi özenle hazırlıyor. Tahmini 15-20 dk içerisinde servis edilecektir.';
    } else if (status === 'completed') {
        orderStatusIcon.innerHTML = '<i class="fa-solid fa-check-double"></i>';
        orderStatusIcon.style.color = '#4CAF50'; // Yeşil (Tamamlandı)
        orderStatusTitle.innerText = 'Siparişiniz Tamamlandı';
        orderStatusDesc.innerText = 'Siparişiniz hazır, afiyet olsun!';
        
        // Teslim edildiyse, bir süre sonra butonu gizleyebiliriz
        setTimeout(() => {
            localStorage.removeItem('lastOrderId');
            currentOrderId = null;
            orderStatusBtn.classList.add('hidden');
        }, 60000); // 1 dakika sonra geçmişi temizle
    }
}

async function callWaiter() {
    let tNo = selectedTable;
    
    if (!tNo) {
        // Önceden window.prompt vardı, şimdi modal gösteriyoruz.
        if (tableSelectModal) {
            tableSelectModal.classList.remove('hidden');
        }
        return; // İşlemi durdur, butonlardan birine basılmasını bekle.
    }

    sendWaiterCall(tNo);
}

window.selectTableForWaiter = (tNo) => {
    selectedTable = tNo; // Gelecek siparişler için de kaydedelim
    if (tableSelector) tableSelector.value = tNo; // Sepet dropdown'ını da eşitle
    
    if (tableSelectModal) {
        tableSelectModal.classList.add('hidden');
    }
    sendWaiterCall(tNo);
};

async function sendWaiterCall(tNo) {
    callWaiterBtn.classList.add('calling');
    callWaiterBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Çağrılıyor...';

    const { error } = await supabase
        .from('waiter_calls')
        .insert([{ 
            table_number: "Masa " + tNo, 
            status: 'pending' 
        }]);

    if (error) {
        console.error(error);
        showCustomAlert("Garson çağrılırken bir hata oluştu. Lütfen tekrar deneyin.", "error");
        callWaiterBtn.classList.remove('calling');
        callWaiterBtn.innerHTML = '<i class="fa-solid fa-bell-concierge"></i> Garson Çağır';
    } else {
        showCustomAlert(`Masa ${tNo} için garson çağrıldı. Hemen geliyoruz!`, "success");
        setTimeout(() => {
            callWaiterBtn.classList.remove('calling');
            callWaiterBtn.innerHTML = '<i class="fa-solid fa-bell-concierge"></i> Garson Çağır';
        }, 3000);
    }
}

// Sipariş Durumu Mantığı
let orderStatusChannel = null;
function setupOrderStatusSubscription() {
    if (!currentOrderId) return;
    if (orderStatusChannel) return; // Zaten dinliyorsak tekrar başlatma

    orderStatusChannel = supabase
        .channel('public:orders:status:' + currentOrderId)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders',
            filter: `id=eq.${currentOrderId}`
        }, payload => {
            console.log('Sipariş durumu güncellendi:', payload.new.status);
            
            // Eğer modal açıksa içini güncelle
            if (!orderStatusModal.classList.contains('hidden')) {
                updateOrderStatusUI(payload.new.status);
            }
            
            if (payload.new.status === 'preparing') {
                playCustomerSound();
                if (orderStatusModal.classList.contains('hidden')) {
                    showCustomAlert("Siparişiniz hazırlanmaya başladı!", "info");
                }
            } else if (payload.new.status === 'completed') {
                playCustomerSound();
                if (orderStatusModal.classList.contains('hidden')) {
                    showCustomAlert("Siparişiniz tamamlandı ve teslim ediliyor. Afiyet olsun!", "success");
                }
                updateOrderStatusUI(payload.new.status); // Cleanups in UI
            }
        })
        .subscribe();
}
