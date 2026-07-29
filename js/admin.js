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
        const passwordModal = document.getElementById('passwordModal');
        const passInput = document.getElementById('adminPasswordInput');
        const submitBtn = document.getElementById('adminPasswordSubmitBtn');
        
        passwordModal.classList.remove('hidden');
        passInput.focus();
        
        const checkPassword = () => {
            const val = passInput.value;
            if (val === CONFIG.ADMIN_PASSWORD) {
                sessionStorage.setItem('lsemd_admin_auth', 'true');
                passwordModal.classList.add('hidden');
                continueAdminInit();
            } else {
                passInput.style.borderColor = 'red';
                passInput.value = '';
                passInput.placeholder = 'Hatalı Şifre!';
            }
        };

        submitBtn.addEventListener('click', checkPassword);
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkPassword();
        });
        
        return; // İşleme devam etmeyi burada kes, şifre doğruysa continueAdminInit çağrılacak.
    }

    continueAdminInit();
}

async function continueAdminInit() {


    
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
    await fetchTables();
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
        
    // Masalar İçin
    supabase
        .channel('public:tables')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'tables'
        }, payload => {
            fetchTables();
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
    
    // Sipariş Geçmişi Tablosunu Güncelle
    renderHistory(orders);
}

function renderHistory(orders) {
    const historyTableBody = document.getElementById('historyTableBody');
    if (!historyTableBody) return;
    
    let html = '';
    
    if (!orders || orders.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Henüz sipariş bulunmuyor.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const dateTime = new Date(order.created_at).toLocaleString('tr-TR', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        let itemsText = '';
        if (order.items && Array.isArray(order.items)) {
            itemsText = escapeHTML(order.items.map(item => `${item.quantity}x ${item.name}`).join(', '));
        }
        
        let statusBadge = '';
        if (order.status === 'archived') {
            statusBadge = '<span class="history-status-badge archived" style="background:#e0e0e0; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600; color:#555;">Arşivlendi</span>';
        } else if (order.status === 'completed') {
            statusBadge = '<span class="history-status-badge completed" style="background:#d4edda; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600; color:#155724;">Tamamlandı</span>';
        } else if (order.status === 'preparing') {
            statusBadge = '<span class="history-status-badge preparing" style="background:#cce5ff; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600; color:#004085;">Hazırlanıyor</span>';
        } else {
            statusBadge = '<span class="history-status-badge pending" style="background:#fff3cd; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600; color:#856404;">Bekliyor</span>';
        }

        const safeTable = escapeHTML(order.table_number);

        html += `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
                <td style="padding: 1rem;">${dateTime}</td>
                <td style="font-weight:600; padding: 1rem;">${safeTable || '-'}</td>
                <td style="padding: 1rem; max-width: 300px;">${itemsText}</td>
                <td style="font-weight:600; color:var(--primary); padding: 1rem;">${order.total_price} TL</td>
                <td style="padding: 1rem;">${statusBadge}</td>
            </tr>
        `;
    });

    historyTableBody.innerHTML = html;
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
    // 1. Anında görsel geri bildirim (Hız hissi için)
    const card = document.getElementById(`order-${orderId}`);
    if (card) {
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
        const btn = card.querySelector('.btn-warning, .btn-success');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İletiliyor...';
    }

    // 2. Arka planda Supabase'e gönder
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('Durum güncellenirken hata oluştu!');
        console.error(error);
        if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            fetchOrders(); // Hata varsa listeyi sıfırla
        }
    } else {
        fetchOrders(); // BAŞARILI! Anında güncel veriyi çek ve ekrana yansıt (Hız için)
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
        // 1. Optimistic UI (Hız hissi için anında gizle)
        const card = document.getElementById(`order-${orderId}`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
            const btn = card.querySelector('.btn-danger');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }

        const { error } = await supabase
            .from('orders')
            .update({ status: 'archived' })
            .eq('id', orderId);

        if (error) {
            alert('Arşivlenirken hata oluştu!');
            console.error(error);
            fetchOrders(); // Hata varsa geri getir
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
            <div id="waiter-call-${call.id}" class="waiter-toast" style="background: var(--surface); border-left: 4px solid var(--primary); padding: 15px; border-radius: 8px; box-shadow: var(--shadow-md); display: flex; align-items: center; justify-content: space-between; gap: 20px; animation: slideIn 0.3s ease-out; margin-bottom: 10px;">
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
    
    // Optimistic UI (Hız hissi için)
    const el = document.getElementById(`waiter-call-${callId}`);
    if (el) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
        const btn = el.querySelector('button');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    const { error } = await supabase
        .from('waiter_calls')
        .update({ status: 'resolved' })
        .eq('id', callId);

    if (error) {
        alert('Hata oluştu!');
        fetchWaiterCalls(); // Hata varsa listeyi sıfırla
    } else {
        fetchWaiterCalls(); // BAŞARILI! Anında güncel veriyi çek
    }
};

// ==========================================
// MASA KONTROLÜ
// ==========================================
async function fetchTables() {
    const { data: tables, error } = await supabase
        .from('tables')
        .select('*'); // Order by'ı JS tarafında sayısal yapacağız

    if (error) {
        console.error('Masalar çekilirken hata oluştu:', error);
        return;
    }

    // Eğer masa yoksa otomatik oluştur
    if (!tables || tables.length === 0) {
        const count = CONFIG.TABLE_COUNT || 10;
        const insertData = [];
        for (let i = 1; i <= count; i++) {
            insertData.push({ table_number: String(i), status: 'available' });
        }
        
        const { error: insertErr } = await supabase.from('tables').insert(insertData);
        if (!insertErr) {
            // Yeniden çek
            const { data: newTables } = await supabase.from('tables').select('*');
            if (newTables) {
                newTables.sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));
                renderTables(newTables);
            }
        }
        return;
    }

    // Sayısal olarak sırala (Masa 1, Masa 2, Masa 10)
    tables.sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));

    renderTables(tables);
}

function renderTables(tables) {
    const tablesContainer = document.getElementById('tablesContainer');
    if (!tablesContainer) return;

    let html = '';
    
    if (!tables || tables.length === 0) {
        html = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Masalar oluşturuluyor...</div>';
    } else {
        tables.forEach(table => {
            let cardClass = 'table-card free';
            let statusIcon = '<i class="fa-solid fa-chair"></i>';
            let borderColor = '#4CAF50';
            
            if (table.status === 'occupied') {
                cardClass = 'table-card occupied';
                statusIcon = '<i class="fa-solid fa-users"></i>';
                borderColor = '#f44336';
            } else if (table.status === 'reserved') {
                cardClass = 'table-card reserved';
                statusIcon = '<i class="fa-solid fa-clock"></i>';
                borderColor = '#ff9800'; // Turuncu
            }
            
            html += `
                <div id="table-card-${table.id}" class="${cardClass}" style="background: var(--surface); border: 2px solid ${borderColor}; border-radius: var(--radius-md); padding: 1.5rem; text-align: center; position: relative; transition: all 0.3s ease;">
                    <div class="table-icon" style="font-size: 2.5rem; color: ${borderColor}; margin-bottom: 10px;">
                        ${statusIcon}
                    </div>
                    <h3 style="margin-bottom: 15px; font-size: 1.5rem;">Masa ${table.table_number}</h3>
                    
                    <select onchange="updateTableStatus('${table.id}', this.value)" style="width: 100%; padding: 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--background); color: var(--text); font-weight: 600; outline: none; cursor: pointer; text-align: center;">
                        <option value="available" ${table.status === 'available' ? 'selected' : ''}>Boş</option>
                        <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>Dolu</option>
                        <option value="reserved" ${table.status === 'reserved' ? 'selected' : ''}>Rezerve</option>
                    </select>
                </div>
            `;
        });
    }

    tablesContainer.innerHTML = html;
}

window.updateTableStatus = async (tableId, newStatus) => {
    // Optimistic UI (Hız hissi için anında soluklaştır)
    const el = document.getElementById(`table-card-${tableId}`);
    if (el) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    }

    const { error } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId);

    if (error) {
        alert('Masa durumu güncellenirken hata oluştu!');
        console.error(error);
        fetchTables(); // Hata varsa geri çek
    } else {
        fetchTables(); // BAŞARILI! Anında ekranı yenile
    }
};
