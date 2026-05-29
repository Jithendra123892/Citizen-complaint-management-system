document.addEventListener('DOMContentLoaded', function() {
    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';

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

    // Only Officers can access
    if (user.type !== 'Officer') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    const officerNameEl = document.getElementById('officerName');
    if (officerNameEl && user.name) {
        officerNameEl.textContent = user.name;
    }

    loadProfileData();
});

async function loadProfileData() {
    var token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    try {
        var res = await fetch(API_URL + '/officers/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const officer = data.data.officer;
            document.getElementById('badgeNumber').textContent = officer.badge_number || '-';
            document.getElementById('officerNameDisplay').textContent = officer.officer_name || '-';
            document.getElementById('department').textContent = officer.department_name || '-';
            document.getElementById('designation').textContent = officer.designation || '-';
            document.getElementById('contactNumber').textContent = officer.contact_number || '-';
            document.getElementById('email').textContent = officer.email || '-';
            document.getElementById('joiningDate').textContent = formatDate(officer.date_of_joining);

            document.getElementById('updatePhone').value = officer.contact_number || '';
            document.getElementById('updateEmail').value = officer.email || '';
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        contactNumber: document.getElementById('updatePhone').value,
        email: document.getElementById('updateEmail').value
    };

    try {
        var res = await fetch(API_URL + '/officers/contact', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Contact information updated successfully!', 'success');
            loadProfileData();
        } else {
            showAlert('Failed to update contact: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to update contact. Please try again.', 'error');
    }
});

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
        var res = await fetch(API_URL + '/officers/change-password', {
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
