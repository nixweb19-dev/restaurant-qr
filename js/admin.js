import { supabase } from './supabaseClient.js';

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

let currentWorkspaceId = null;

// Sayfa yüklendiğinde Admin'i Başlat
document.addEventListener('DOMContentLoaded', async () => {
    await initAdmin();
});

async function initAdmin() {
    // 1. Oturum Kontrolü
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Kullanıcının İşletmesini (Workspace) Bul
    const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();

    if (error || !workspace) {
        alert("Size ait bir işletme profili bulunamadı! Lütfen kayıt olun.");
        await supabase.auth.signOut();
        window.location.href = 'register.html';
        return;
    }

    currentWorkspaceId = workspace.id;
    
    // Logo kısmına restoran adını yaz
    const logoEl = document.querySelector('.logo');
    if(logoEl) logoEl.innerText = workspace.name + ' Admin';

    // 3. Çıkış Yap Butonu
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // 4. Mevcut Verileri Çek ve Dinle
    await fetchOrders();
    await fetchWaiterCalls();
    setupRealtimeSubscription();
}

// Siparişleri Supabase'den Çek (Sadece bu işletmeye ait olanları)
async function fetchOrders() {
    if (!currentWorkspaceId) return;

    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
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
        .channel('workspace_orders')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `workspace_id=eq.${currentWorkspaceId}`
        }, payload => {
            if (payload.eventType === 'INSERT') {
                playNotificationSound();
            }
            fetchOrders();
        })
        .subscribe();

    // Garson Çağrıları İçin
    supabase
        .channel('workspace_waiter_calls')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'waiter_calls',
            filter: `workspace_id=eq.${currentWorkspaceId}`
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
        statusBtns = `<button onclick="updateOrderStatus('${order.id}', 'completed')" class="btn btn-success btn-sm">Teslim Edildi</button>`;
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
        .eq('id', orderId)
        .eq('workspace_id', currentWorkspaceId);

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
            .eq('id', orderId)
            .eq('workspace_id', currentWorkspaceId);

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
            notificationSound.play().catch(e => console.log(e));
        }
    } catch(err) {}
}

function playWaiterSound() {
    try {
        if(waiterSound) {
            waiterSound.loop = true;
            waiterSound.currentTime = 0;
            waiterSound.play().catch(e => console.log(e));
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
    if (!currentWorkspaceId) return;

    const { data: calls, error } = await supabase
        .from('waiter_calls')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
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
        .eq('id', callId)
        .eq('workspace_id', currentWorkspaceId);

    if (error) {
        alert('Hata oluştu!');
    } else {
        fetchWaiterCalls();
    }
};
