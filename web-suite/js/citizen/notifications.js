var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Add event listeners
    const markAllAsReadBtn = document.getElementById('markAllAsReadBtn');
    if (markAllAsReadBtn) {
        markAllAsReadBtn.addEventListener('click', window.markAllAsRead);
    }

    const filterAll = document.getElementById('filterAll');
    if (filterAll) {
        filterAll.addEventListener('click', function() {
            window.filterNotifications('all');
        });
    }

    const filterUnread = document.getElementById('filterUnread');
    if (filterUnread) {
        filterUnread.addEventListener('click', function() {
            window.filterNotifications('unread');
        });
    }

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('click', function() {
            window.filterNotifications('status');
        });
    }

    const filterAssign = document.getElementById('filterAssign');
    if (filterAssign) {
        filterAssign.addEventListener('click', function() {
            window.filterNotifications('assign');
        });
    }

    const filterResolve = document.getElementById('filterResolve');
    if (filterResolve) {
        filterResolve.addEventListener('click', function() {
            window.filterNotifications('resolve');
        });
    }

    loadNotifications();
});

async function loadNotifications() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderNotifications(data.data.notifications || []);
        }
    } catch (err) {
        console.error('Error loading notifications:', err);
    }
}

function renderNotifications(notifications) {
    const list = document.getElementById('notificationsList');
    if (!notifications || notifications.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔔</div>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? 'read' : 'unread'}">
            <div class="notification-icon">${notif.icon || '🔔'}</div>
            <div class="notification-content">
                <h3>${notif.title}</h3>
                <p>${notif.message}</p>
                <small>${new Date(notif.created_at).toLocaleString()}</small>
            </div>
        </div>
    `).join('');
}

window.markAllAsRead = async function() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadNotifications();
        }
    } catch (err) {
        console.error('Error marking all as read:', err);
    }
};

window.filterNotifications = function(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    // Filter logic would go here
    console.log('Filtering by:', filter);
};

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}
