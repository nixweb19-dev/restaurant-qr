import { supabase } from './supabaseClient.js';

// DOM Elementleri
const pendingOrdersContainer = document.getElementById('pendingOrders');
const preparingOrdersContainer = document.getElementById('preparingOrders');
const completedOrdersContainer = document.getElementById('completedOrders');
const pendingCount = document.getElementById('pendingCount');
const preparingCount = document.getElementById('preparingCount');
const completedCount = document.getElementById('completedCount');
const notificationSound = document.getElementById('notificationSound');

// Tabs
const tabOrders = document.getElementById('tab-orders');
const tabTables = document.getElementById('tab-tables');
const tabHistory = document.getElementById('tab-history');

const viewOrders = document.getElementById('view-orders');
const viewTables = document.getElementById('view-tables');
const viewHistory = document.getElementById('view-history');
const historyTableBody = document.getElementById('historyTableBody');
const pageTitle = document.getElementById('page-title');
const tablesContainer = document.getElementById('tablesContainer');

// Custom Confirm Modal
const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmBtnCancel = document.getElementById('confirmBtnCancel');
const confirmBtnYes = document.getElementById('confirmBtnYes');

const waiterCallsContainer = document.getElementById('waiterCallsContainer');
const waiterSound = document.getElementById('waiterSound');

// Sayfa y├╝klendi─şinde mevcut verileri ├ğek
document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    await fetchOrders();
    await fetchTables();
    await fetchWaiterCalls();
    setupRealtimeSubscription();
});

// Sekme Ge├ği┼ş Mant─▒─ş─▒
function setupTabs() {
    tabOrders.addEventListener('click', (e) => {
        e.preventDefault();
        tabOrders.classList.add('active');
        tabTables.classList.remove('active');
        tabHistory.classList.remove('active');
        viewOrders.classList.remove('hidden');
        viewTables.classList.add('hidden');
        viewHistory.classList.add('hidden');
        pageTitle.innerText = 'Canl─▒ Sipari┼ş Takibi';
    });

    tabTables.addEventListener('click', (e) => {
        e.preventDefault();
        tabTables.classList.add('active');
        tabOrders.classList.remove('active');
        tabHistory.classList.remove('active');
        viewTables.classList.remove('hidden');
        viewOrders.classList.add('hidden');
        viewHistory.classList.add('hidden');
        pageTitle.innerText = 'Masa Kontrol├╝';
    });

    tabHistory.addEventListener('click', (e) => {
        e.preventDefault();
        tabHistory.classList.add('active');
        tabOrders.classList.remove('active');
        tabTables.classList.remove('active');
        viewHistory.classList.remove('hidden');
        viewOrders.classList.add('hidden');
        viewTables.classList.add('hidden');
        pageTitle.innerText = 'Sipari┼ş Ge├ğmi┼şi';
    });
}

// Sipari┼şleri Supabase'den ├çek
async function fetchOrders() {
    const { data: orders, error } = await supabase
        .from('quick_orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Sipari┼şler ├ğekilirken hata olu┼ştu:', error);
        return;
    }

    renderOrders(orders);
}

// Real-time (Ger├ğek Zamanl─▒) Dinleme
function setupRealtimeSubscription() {
    // Sipari┼şler ─░├ğin
    supabase
        .channel('public:quick_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_orders' }, payload => {
            console.log('Sipari┼ş De─şi┼şikli─şi Alg─▒land─▒:', payload);
            if (payload.eventType === 'INSERT') {
                playNotificationSound();
            }
            fetchOrders();
        })
        .subscribe();

    // Masalar ─░├ğin
    supabase
        .channel('public:quick_tables')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_tables' }, payload => {
            console.log('Masa De─şi┼şikli─şi Alg─▒land─▒:', payload);
            fetchTables();
        })
        .subscribe();

    // Garson ├ça─şr─▒lar─▒ ─░├ğin
    supabase
        .channel('public:waiter_calls')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, payload => {
            if (payload.eventType === 'INSERT') {
                playWaiterSound();
            }
            fetchWaiterCalls();
        })
        .subscribe();
}

// Sipari┼şleri Ekrana ├çiz
function renderOrders(orders) {
    // S├╝tunlar─▒ temizle
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

    // Say─▒lar─▒ g├╝ncelle
    pendingCount.innerText = counts.pending;
    preparingCount.innerText = counts.preparing;
    completedCount.innerText = counts.completed;

    // Sipari┼ş Ge├ğmi┼şi Tablosunu G├╝ncelle
    renderHistory(orders);
}

function renderHistory(orders) {
    let html = '';
    
    if (!orders || orders.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Hen├╝z sipari┼ş bulunmuyor.</td></tr>';
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
            statusBadge = '<span class="history-status-badge archived">Ar┼şivlendi</span>';
        } else if (order.status === 'completed') {
            statusBadge = '<span class="history-status-badge completed">Tamamland─▒</span>';
        } else if (order.status === 'preparing') {
            statusBadge = '<span class="history-status-badge preparing">Haz─▒rlan─▒yor</span>';
        } else {
            statusBadge = '<span class="history-status-badge pending">Bekliyor</span>';
        }

        const safeTable = escapeHTML(order.table_no);
        const safeNotes = escapeHTML(order.notes);

        html += `
            <tr>
                <td>${dateTime}</td>
                <td style="font-weight:600;">${safeTable || '-'}</td>
                <td>${itemsText}</td>
                <td style="font-size:0.85rem; color:var(--text-muted); max-width:200px;">${safeNotes || '-'}</td>
                <td style="font-weight:600; color:var(--primary);">${order.total_price} TL</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });

    historyTableBody.innerHTML = html;
}

// XSS (Zararl─▒ Kod) Korumas─▒ i├ğin Yard─▒mc─▒ Fonksiyon
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Sipari┼ş Kart─▒ HTML'i Olu┼ştur
function createOrderCard(order) {
    const dateTime = new Date(order.created_at).toLocaleString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Sepet detaylar─▒n─▒ formatla (G├╝venli metin)
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
    const safeTableNo = escapeHTML(order.table_no);

    // Durum de─şi┼ştirme butonlar─▒
    let statusBtns = '';
    if (order.status === 'pending') {
        statusBtns = `<button onclick="updateOrderStatus('${order.id}', 'preparing')" class="btn btn-warning btn-sm">Haz─▒rlan─▒yor Olarak ─░┼şaretle</button>`;
    } else if (order.status === 'preparing') {
        statusBtns = `<button onclick="updateOrderStatus('${order.id}', 'completed')" class="btn btn-success btn-sm">Teslim Edildi ─░┼şaretle</button>`;
    } else if (order.status === 'completed') {
        statusBtns = `<button onclick="deleteOrder('${order.id}')" class="btn btn-danger btn-sm"><i class="fa-solid fa-trash"></i> Sil</button>`;
    }

    return `
        <div class="order-card" id="order-${order.id}">
            <div class="order-card-header">
                <span class="table-no">${safeTableNo || 'Masa Se├ğilmedi'}</span>
                <span class="order-time"><i class="fa-regular fa-clock"></i> ${dateTime}</span>
            </div>
            
            <div class="order-card-body">
                <ul class="order-items-list" style="list-style:none; padding:0; margin:10px 0;">
                    ${itemsHtml}
                </ul>
                
                ${order.notes ? `
                <div class="order-note">
                    <i class="fa-regular fa-comment-dots"></i> <strong>Sipari┼ş Notu:</strong> [${safeNotes}]
                </div>` : ''}
                
                <div class="order-total" style="text-align:right; font-weight:700; margin-top:10px; font-size:1.1rem;">
                    Toplam: ${order.total_price} TL
                </div>
            </div>
            <div class="order-card-footer">
                ${statusBtns}
            </div>
        </div>
    `;
}

// Sipari┼ş Durumunu G├╝ncelle (Window objesine at─▒yoruz ki HTML i├ğinden onclick ile ├ğa─şr─▒labilsin)
window.updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
        .from('quick_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('Durum g├╝ncellenirken hata olu┼ştu!');
        console.error(error);
    }
};

// ├ûzel Confirm Fonksiyonu (Promise d├Âner)
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        confirmModalMessage.innerText = message;
        confirmModal.classList.remove('hidden');

        const handleYes = () => {
            cleanup();
            resolve(true);
        };

        const handleNo = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmModal.classList.add('hidden');
            confirmBtnYes.removeEventListener('click', handleYes);
            confirmBtnCancel.removeEventListener('click', handleNo);
        };

        confirmBtnYes.addEventListener('click', handleYes);
        confirmBtnCancel.addEventListener('click', handleNo);
    });
}

// Tamamlanm─▒┼ş Sipari┼şi Sil (Ar┼şive Kald─▒r)
window.deleteOrder = async (orderId) => {
    const isConfirmed = await showCustomConfirm('Sipari┼şi ar┼şive kald─▒rmak istedi─şinize emin misiniz?');
    
    if (isConfirmed) {
        // Art─▒k veritaban─▒ndan kal─▒c─▒ olarak silmek yerine status'u 'archived' yap─▒yoruz
        const { error } = await supabase
            .from('quick_orders')
            .update({ status: 'archived' })
            .eq('id', orderId);

        if (error) {
            alert('Ar┼şivlenirken hata olu┼ştu!');
            console.error(error);
        }
    }
};

// Ses ├çalma Fonksiyonu
function playNotificationSound() {
    try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Otomatik ses ├ğalma taray─▒c─▒ taraf─▒ndan engellendi.', e));
    } catch(err) {
        console.error(err);
    }
}

function playWaiterSound() {
    try {
        waiterSound.currentTime = 0;
        waiterSound.play().catch(e => console.log('Otomatik ses ├ğalma taray─▒c─▒ taraf─▒ndan engellendi.', e));
    } catch(err) {
        console.error(err);
    }
}

// --- GARSON ├çA─ŞRILARI ---

async function fetchWaiterCalls() {
    const { data: calls, error } = await supabase
        .from('waiter_calls')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('├ça─şr─▒lar ├ğekilirken hata:', error);
        return;
    }

    renderWaiterCalls(calls);
}

function renderWaiterCalls(calls) {
    if (!waiterCallsContainer) return;
    
    let html = '<button onclick="document.getElementById(\'waiterSound\').play()" style="padding: 5px; background: var(--surface); border: 1px solid var(--border); cursor: pointer; border-radius: 5px; margin-bottom: 5px;">­şöö Sesi Test Et</button>';
    calls.forEach(call => {
        const safeTable = escapeHTML(call.table_no);
        html += `
            <div class="waiter-toast" style="background: var(--surface); border-left: 4px solid var(--primary); padding: 15px; border-radius: 8px; box-shadow: var(--shadow-md); display: flex; align-items: center; justify-content: space-between; gap: 20px; animation: slideIn 0.3s ease-out;">
                <div>
                    <strong style="color: var(--primary); display: block; font-size: 1.1rem;"><i class="fa-solid fa-bell-concierge"></i> Garson ├ça─şr─▒s─▒</strong>
                    <span style="font-size: 1.2rem; font-weight: bold;">${safeTable}</span>
                </div>
                <button onclick="resolveWaiterCall(${call.id})" class="btn btn-primary btn-sm" style="padding: 8px 15px; border-radius: 5px;">Tamamland─▒</button>
            </div>
        `;
    });
    waiterCallsContainer.innerHTML = html;
}

window.resolveWaiterCall = async (callId) => {
    const { error } = await supabase
        .from('waiter_calls')
        .update({ status: 'resolved' })
        .eq('id', callId);

    if (error) {
        alert('Hata olu┼ştu!');
    }
};

// --- MASA Y├ûNET─░M─░ ---

async function fetchTables() {
    const { data: tables, error } = await supabase
        .from('quick_tables')
        .select('*')
        .order('table_number', { ascending: true });

    if (error) {
        console.error('Masalar ├ğekilirken hata olu┼ştu:', error);
        return;
    }

    renderTables(tables);
}

function renderTables(tables) {
    let html = '';
    
    tables.forEach(table => {
        let statusText = 'Bo┼ş';
        let statusClass = 'status-available';
        
        if (table.status === 'occupied') {
            statusText = 'Dolu';
            statusClass = 'status-occupied';
        } else if (table.status === 'reserved') {
            statusText = 'Rezerve';
            statusClass = 'status-reserved';
        }

        html += `
            <div class="table-control-card ${statusClass}" id="table-card-${table.table_number}">
                <h3>Masa ${table.table_number}</h3>
                <div class="status-badge" id="table-badge-${table.table_number}">${statusText}</div>
                <div class="table-actions">
                    <button onclick="updateTableStatus(${table.table_number}, 'available')" class="btn btn-success btn-sm">Bo┼ş Yap</button>
                    <button onclick="updateTableStatus(${table.table_number}, 'occupied')" class="btn btn-danger btn-sm">Dolu Yap</button>
                    <button onclick="updateTableStatus(${table.table_number}, 'reserved')" class="btn btn-warning btn-sm">Rezerve Et</button>
                </div>
            </div>
        `;
    });

    tablesContainer.innerHTML = html;
}

window.updateTableStatus = async (tableNumber, newStatus) => {
    // 1. ─░yimser UI G├╝ncellemesi (Kullan─▒c─▒ an─▒nda de─şi┼şikli─şi g├Âr├╝r)
    const card = document.getElementById(`table-card-${tableNumber}`);
    const badge = document.getElementById(`table-badge-${tableNumber}`);
    
    if (card && badge) {
        card.classList.remove('status-available', 'status-occupied', 'status-reserved');
        
        if (newStatus === 'available') {
            card.classList.add('status-available');
            badge.innerText = 'Bo┼ş';
        } else if (newStatus === 'occupied') {
            card.classList.add('status-occupied');
            badge.innerText = 'Dolu';
        } else if (newStatus === 'reserved') {
            card.classList.add('status-reserved');
            badge.innerText = 'Rezerve';
        }
    }

    // 2. Veritaban─▒n─▒ G├╝ncelle
    const { error } = await supabase
        .from('quick_tables')
        .update({ status: newStatus })
        .eq('table_number', tableNumber);

    if (error) {
        alert('Masa durumu g├╝ncellenirken hata olu┼ştu!');
        console.error(error);
        // Hata olursa eski haline getirmek i├ğin verileri tekrar ├ğek
        fetchTables();
    }
};
