var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

// Check authentication and user type
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.replace('../auth.html');
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

// Register officer
async function registerOfficer(e) {
    e.preventDefault();

    const officerName = document.getElementById('officerName').value.trim();
    const badgeNumber = document.getElementById('badgeNumber').value.trim();
    const designation = document.getElementById('designation').value.trim();
    const contactNumber = document.getElementById('contactNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const state = document.getElementById('state').value.trim();
    const city = document.getElementById('city').value.trim();
    const password = document.getElementById('password').value;

    if (!officerName || !badgeNumber || !designation || !contactNumber || !state || !city || !password) {
        alert('Please fill in all required fields');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        var response = await fetch(API_BASE + '/dept-admin/officers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                officerName,
                badgeNumber,
                designation,
                contactNumber,
                email: email || null,
                state,
                city,
                password
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Officer registered successfully!');
            window.location.href = 'officers.html';
        } else {
            alert('Failed to register officer: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error registering officer:', error);
        alert('Failed to register officer: ' + error.message);
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    const officerForm = document.getElementById('officerForm');
    if (officerForm) {
        officerForm.addEventListener('submit', registerOfficer);
    }
});
