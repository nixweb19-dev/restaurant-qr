import { supabase } from './supabaseClient.js';
import { CONFIG } from './config.js';

// DOM Elementleri
const pendingOrdersContainer = document.getElementById('pendingOrders');
const preparingOrdersContainer = document.getElementById('preparingOrders');
const completedOrdersContainer = document.getElementById('completedOrders');
const pendingCount = document.getElementById('pendingCount');
const preparingCount = document.getElementById('preparingCount');
const completedCount = document.getElementById('completedCount');
const notificationSound = document.getElementById('notificationSound');

const waiterCallsContainer = document.getElementById('waiterCallsContainer');
const waiterSound = document.getElementById('waiterSound');

// Custom Confirm Modal
const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmBtnCancel = document.getElementById('confirmBtnCancel');
const confirmBtnYes = document.getElementById('confirmBtnYes');

const logoutBtn = document.getElementById('logoutBtn');

// Sayfa yüklendiğinde Admin'i Başlat
document.addEventListener('DOMContentLoaded', async () => {
    await initAdmin();
});

async function initAdmin() {
    // 1. Şifre Kontrolü (Supabase Auth yerine basit frontend koruması)
    const isAuthenticated = sessionStorage.getItem('lsemd_admin_auth') === 'true';
    
    if (!isAuthenticated) {
        const password = prompt("Admin Paneli Şifresini Giriniz:");
        if (password !== CONFIG.ADMIN_PASSWORD) {
            alert("Hatalı şifre!");
            document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h1>Erişim Reddedildi</h1><p>Şifre yanlış.</p><button onclick="location.reload()" style="padding:10px 20px; cursor:pointer;">Tekrar Dene</button></div>';
            return;
        } else {
            sessionStorage.setItem('lsemd_admin_auth', 'true');
        }
    }


    
    // Logo kısmına restoran adını yaz
    const logoEl = document.querySelector('.logo');
    const adminLogoImg = document.getElementById('adminLogo');
    
    if(logoEl) logoEl.innerText = CONFIG.RESTAURANT_NAME + ' Admin';
    if(adminLogoImg && CONFIG.LOGO_URL) {
        adminLogoImg.src = CONFIG.LOGO_URL;
        adminLogoImg.style.display = 'block';
    }

    // 3. Çıkış Yap Butonu
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('lsemd_admin_auth');
            location.reload();
        });
    }

    // 4. Mevcut Verileri Çek ve Dinle
    await fetchOrders();
    await fetchWaiterCalls();
    setupRealtimeSubscription();
}

// Siparişleri Supabase'den Çek
async function fetchOrders() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Siparişler çekilirken hata oluştu:', error);
        return;
    }

    renderOrders(orders);
}

// Real-time (Gerçek Zamanlı) Dinleme
function setupRealtimeSubscription() {
    // Siparişler İçin
    supabase
        .channel('public:orders')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders'
        }, payload => {
            if (payload.eventType === 'INSERT') {
                playNotificationSound();
            }
            fetchOrders();
        })
        .subscribe();

    // Garson Çağrıları İçin
    supabase
        .channel('public:waiter_calls')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'waiter_calls'
        }, payload => {
            if (payload.eventType === 'INSERT') {
                playWaiterSound();
            }
            fetchWaiterCalls();
        })
        .subscribe();
}

// Siparişleri Ekrana Çiz
function renderOrders(orders) {
    if(!pendingOrdersContainer) return;
    
    // Sütunları temizle
    pendingOrdersContainer.innerHTML = '';
    preparingOrdersContainer.innerHTML = '';
    completedOrdersContainer.innerHTML = '';

    let counts = { pending: 0, preparing: 0, completed: 0 };

    orders.forEach(order => {
        const orderHtml = createOrderCard(order);
        
        if (order.status === 'pending') {
            pendingOrdersContainer.innerHTML += orderHtml;
            counts.pending++;
        } else if (order.status === 'preparing') {
            preparingOrdersContainer.innerHTML += orderHtml;
            counts.preparing++;
        } else if (order.status === 'completed') {
            completedOrdersContainer.innerHTML += orderHtml;
            counts.completed++;
        }
    });

    // Sayıları güncelle
    pendingCount.innerText = counts.pending;
    preparingCount.innerText = counts.preparing;
    completedCount.innerText = counts.completed;
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

// Sipariş Kartı HTML'i Oluştur
function createOrderCard(order) {
    const dateTime = new Date(order.created_at).toLocaleString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Sepet detaylarını formatla
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
            const safeName = escapeHTML(item.name);
            const safeNote = escapeHTML(item.note);
            
            itemsHtml += `
                <li style="display:flex; flex-direction:column; padding: 4px 0;">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                        <span><strong style="color:var(--primary);">${item.quantity}x</strong> ${safeName}</span>
                    </div>
                    ${item.note ? `<div style="font-size: 0.85rem; color: var(--accent); margin-top: 2px;"><i class="fa-regular fa-comment-dots"></i> Not: ${safeNote}</div>` : ''}
                </li>
            `;
        });
    }

    const safeNotes = escapeHTML(order.notes);
    const safeTableNo = escapeHTML(order.table_number); // YENİ: table_no yerine table_number

    // Durum değiştirme butonları
    let statusBtns = '';
    if (order.status === 'pending') {
        statusBtns = `<button onclick="updateOrderStatus('${order.id}', 'preparing')" class="btn btn-warning btn-sm">Hazırlanıyor</button>`;
    } else if (order.status === 'preparing') {
        statusBtns = `<button onclick="updateOrderStatus('${order.id}', 'completed')" class="btn btn-success btn-sm"><i class="fa-solid fa-check"></i> Hazır / Teslim Et</button>`;
    } else if (order.status === 'completed') {
        statusBtns = `<button onclick="deleteOrder('${order.id}')" class="btn btn-danger btn-sm"><i class="fa-solid fa-trash"></i> Sil</button>`;
    }

    return `
        <div class="order-card" id="order-${order.id}">
            <div class="order-card-header">
                <span class="table-no">${safeTableNo || 'Masa Seçilmedi'}</span>
                <span class="order-time"><i class="fa-regular fa-clock"></i> ${dateTime}</span>
            </div>
            
            <div class="order-card-body">
                <ul class="order-items-list" style="list-style:none; padding:0; margin:10px 0;">
                    ${itemsHtml}
                </ul>
                
                ${order.notes ? `
                <div class="order-note">
                    <i class="fa-regular fa-comment-dots"></i> <strong>Not:</strong> [${safeNotes}]
                </div>` : ''}
                
                <div class="order-total" style="text-align:right; font-weight:700; margin-top:10px; font-size:1.1rem;">
                    ${order.total_price} TL
                </div>
            </div>
            <div class="order-card-footer">
                ${statusBtns}
            </div>
        </div>
    `;
}

// Sipariş Durumunu Güncelle
window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('Durum güncellenirken hata oluştu!');
        console.error(error);
    }
};

// Özel Confirm Fonksiyonu (Promise döner)
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        if(!confirmModal) {
            resolve(confirm("Emin misiniz?")); return;
        }
        
        confirmModalMessage.innerText = message;
        confirmModal.classList.remove('hidden');

        const handleYes = () => { cleanup(); resolve(true); };
        const handleNo = () => { cleanup(); resolve(false); };

        const cleanup = () => {
            confirmModal.classList.add('hidden');
            confirmBtnYes.removeEventListener('click', handleYes);
            confirmBtnCancel.removeEventListener('click', handleNo);
        };

        confirmBtnYes.addEventListener('click', handleYes);
        confirmBtnCancel.addEventListener('click', handleNo);
    });
}

// Tamamlanmış Siparişi Sil (Arşive Kaldır)
window.deleteOrder = async (orderId) => {
    const isConfirmed = await showCustomConfirm('Siparişi arşive kaldırmak istediğinize emin misiniz?');
    
    if (isConfirmed) {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'archived' })
            .eq('id', orderId);

        if (error) {
            alert('Arşivlenirken hata oluştu!');
            console.error(error);
        } else {
            fetchOrders();
        }
    }
};

// --- SES DOSYALARI ---
function playNotificationSound() {
    try {
        if(notificationSound) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => {});
        }
    } catch(err) {}
}

function playWaiterSound() {
    try {
        if(waiterSound) {
            waiterSound.loop = true;
            waiterSound.currentTime = 0;
            waiterSound.play().catch(e => {});
        }
    } catch(err) {}
}

function stopWaiterSound() {
    try {
        if(waiterSound) {
            waiterSound.pause();
            waiterSound.currentTime = 0;
        }
    } catch(err) {}
}

// --- GARSON ÇAĞRILARI ---
async function fetchWaiterCalls() {
    const { data: calls, error } = await supabase
        .from('waiter_calls')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Çağrılar çekilirken hata:', error);
        return;
    }

    renderWaiterCalls(calls);
}

function renderWaiterCalls(calls) {
    if (!waiterCallsContainer) return;
    
    let html = '';
    calls.forEach(call => {
        const safeTable = escapeHTML(call.table_number);
        html += `
            <div class="waiter-toast" style="background: var(--surface); border-left: 4px solid var(--primary); padding: 15px; border-radius: 8px; box-shadow: var(--shadow-md); display: flex; align-items: center; justify-content: space-between; gap: 20px; animation: slideIn 0.3s ease-out; margin-bottom: 10px;">
                <div>
                    <strong style="color: var(--primary); display: block; font-size: 1.1rem;"><i class="fa-solid fa-bell-concierge"></i> Garson Çağrısı</strong>
                    <span style="font-size: 1.2rem; font-weight: bold;">${safeTable}</span>
                </div>
                <button onclick="resolveWaiterCall('${call.id}')" class="btn btn-primary btn-sm" style="padding: 8px 15px; border-radius: 5px;">Tamamlandı</button>
            </div>
        `;
    });
    waiterCallsContainer.innerHTML = html;
}

window.resolveWaiterCall = async (callId) => {
    stopWaiterSound();
    
    const { error } = await supabase
        .from('waiter_calls')
        .update({ status: 'resolved' })
        .eq('id', callId);

    if (error) {
        alert('Hata oluştu!');
    } else {
        fetchWaiterCalls();
    }
};

// Menü Yönetimi İptal Edildi - config.js'den yönetilecek

// ==========================================
// KAREKOD (QR) ÜRETİMİ
// ==========================================
const generateQrBtn = document.getElementById('generateQrBtn');
const tableCountInput = document.getElementById('tableCountInput');
const qrGridContainer = document.getElementById('qrGridContainer');
const printQrBtn = document.getElementById('printQrBtn');

if (generateQrBtn) {
    generateQrBtn.addEventListener('click', () => {
        const count = parseInt(tableCountInput.value);
        if (isNaN(count) || count < 1 || count > 200) {
            alert("Lütfen 1 ile 200 arasında geçerli bir masa sayısı girin.");
            return;
        }

        generateQrBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Üretiliyor...';
        generateQrBtn.disabled = true;

        setTimeout(() => {
            let html = '';
            const baseUrl = window.location.origin; // e.g. https://restaurant-qr-yeni.vercel.app
            const restaurantSlug = CONFIG.RESTAURANT_SLUG;
            const restaurantName = CONFIG.RESTAURANT_NAME;

            for (let i = 1; i <= count; i++) {
                // Müşteri ekranı için URL (Artık sadece ?m=X parametresi eklendi)
                const targetUrl = `${baseUrl}/?m=${i}`;
                const encodedUrl = encodeURIComponent(targetUrl);
                
                // QR Server API
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;

                html += `
                    <div class="qr-card">
                        <h3>${restaurantName}</h3>
                        <img src="${qrImageUrl}" alt="Masa ${i} QR" loading="lazy">
                        <p>Masa ${i}</p>
                    </div>
                `;
            }

            qrGridContainer.innerHTML = html;
            qrGridContainer.classList.remove('hidden');
            printQrBtn.classList.remove('hidden');

            generateQrBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Karekodları Üret';
            generateQrBtn.disabled = false;
        }, 500); // UI thread için ufak bir bekleme
    });
}
