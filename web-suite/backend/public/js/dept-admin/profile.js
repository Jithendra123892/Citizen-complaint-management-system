var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : 'http://localhost:5000/api';

// Check authentication and user type
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '../auth.html';
        return false;
    }

    if (user.type !== 'DeptAdmin') {
        alert('Access denied. Department Admins only.');
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return false;
    }

    document.getElementById('userInfo').textContent = `Welcome, ${user.name || user.username}`;
    return true;
}

// Load profile
async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dept-admin/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load profile');

        const data = await response.json();
        const user = data.data.user;

        document.getElementById('profileName').textContent = user.admin_name || 'Unknown';
        document.getElementById('username').textContent = user.username || '-';
        document.getElementById('department').textContent = user.department_name || 'Not Assigned';
        document.getElementById('email').textContent = user.email || 'Not Provided';
        document.getElementById('contactNumber').textContent = user.contact_number || 'Not Provided';
        document.getElementById('memberSince').textContent = formatDate(user.created_at);
        document.getElementById('lastLogin').textContent = formatDate(user.last_login);

        const initials = (user.admin_name || 'DA').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        document.getElementById('avatar').textContent = initials;
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Change password
async function changePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to change password');
        }

        alert('Password changed successfully');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Add logout button event listener
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    loadProfile();
    document.getElementById('passwordForm').addEventListener('submit', changePassword);
});
