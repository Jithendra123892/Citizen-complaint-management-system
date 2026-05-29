var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';
document.addEventListener('DOMContentLoaded', function() {
    // Prevent redirect loops
    if (sessionStorage.getItem('redirecting') === 'true') {
        sessionStorage.removeItem('redirecting');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only SuperAdmin can access
    if (user.type !== 'SuperAdmin') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl && user.name) {
        adminNameEl.textContent = user.name;
    }

    loadProfileData();
});

async function loadProfileData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    try {
        const res = await fetch(API_URL + '/admin/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const admin = data.data.admin;
            document.getElementById('adminUsername').textContent = admin.username || '-';
            document.getElementById('adminEmail').textContent = admin.email || '-';
            document.getElementById('lastLogin').textContent = formatDate(admin.last_login);
            document.getElementById('createdDate').textContent = formatDate(admin.created_at);
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'error');
        return;
    }

    try {
        const res = await fetch(API_URL + '/admin/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Password changed successfully!', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            showAlert('Failed to change password: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to change password. Please try again.', 'error');
    }
});

function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
