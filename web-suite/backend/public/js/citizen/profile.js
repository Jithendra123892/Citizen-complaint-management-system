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

    // Redirect non-citizens to their dashboards
    if (user.type === 'SuperAdmin') {
        sessionStorage.setItem('redirecting', 'true');
        window.location.replace('../admin/dashboard.html');
        return;
    } else if (user.type === 'DeptAdmin') {
        sessionStorage.setItem('redirecting', 'true');
        window.location.replace('../dept-admin/dashboard.html');
        return;
    } else if (user.type === 'Officer') {
        sessionStorage.setItem('redirecting', 'true');
        window.location.replace('../officer/dashboard.html');
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    }

    loadProfileData();
    loadComplaintStats();
});

async function loadProfileData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    try {
        const res = await fetch(API_URL + '/citizens/profile/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const citizen = data.data.citizen;
            document.getElementById('fullName').value = citizen.citizen_name || '';
            document.getElementById('aadhaarNumber').value = citizen.aadhaar_number || '';
            document.getElementById('email').value = citizen.email || '';
            document.getElementById('phone').value = citizen.phone_number || '';
            document.getElementById('ward').value = citizen.ward_number || 'ward1';
            document.getElementById('pincode').value = citizen.pincode || '';
            document.getElementById('address').value = citizen.address || '';

            if (citizen.registration_date) {
                const regDate = new Date(citizen.registration_date);
                document.getElementById('memberSince').textContent = regDate.getFullYear();
            }
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function loadComplaintStats() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(API_URL + '/complaints/stats/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const stats = data.data;
            document.getElementById('totalComplaints').textContent = stats.total || 0;
            document.getElementById('pendingComplaints').textContent = stats.pending || 0;
            document.getElementById('resolvedComplaints').textContent = stats.resolved || 0;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        citizenName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        wardNumber: document.getElementById('ward').value,
        pincode: document.getElementById('pincode').value,
        address: document.getElementById('address').value
    };

    try {
        const res = await fetch(API_URL + '/citizens/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Profile updated successfully!', 'success');
            localStorage.setItem('user', JSON.stringify(data.data.user));
        } else {
            showAlert('Failed to update profile: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to update profile. Please try again.', 'error');
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
        const res = await fetch(API_URL + '/auth/change-password', {
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

function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '../auth.html';
                return;
            }

            fetch(API_URL + '/citizens/account', {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    alert('Account deleted successfully.');
                    window.location.href = 'index.html';
                } else {
                    showAlert('Failed to delete account: ' + data.message, 'error');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                showAlert('Failed to delete account. Please try again.', 'error');
            });
        }
    }
}

function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', deleteAccount);
    }
});
