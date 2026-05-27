var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../auth.html');
    }

    // Add event listeners
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createBackup);
    }

    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', clearCache);
    }

    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only SuperAdmin can access
    if (user.type !== 'SuperAdmin') {
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

    loadSettings();
});

async function loadSettings() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    try {
        const res = await fetch(API_URL + '/admin/settings', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const settings = data.data.settings;
            document.getElementById('portalName').value = settings.portal_name || 'CitizenConnect — Jansunwai Portal';
            document.getElementById('contactEmail').value = settings.contact_email || 'support@citizenconnect.gov.in';
            document.getElementById('defaultSla').value = settings.default_sla || 72;
            document.getElementById('passwordPolicy').value = settings.password_policy || 'standard';
            document.getElementById('sessionTimeout').value = settings.session_timeout || 30;
            document.getElementById('maxLoginAttempts').value = settings.max_login_attempts || 5;
            document.getElementById('lockoutDuration').value = settings.lockout_duration || 30;
            document.getElementById('emailNotifications').value = settings.email_notifications || 'all';
            document.getElementById('smsNotifications').value = settings.sms_notifications || 'none';
            document.getElementById('emailTemplate').value = settings.email_template || '';
            document.getElementById('backupSchedule').value = settings.backup_schedule || 'daily';
            document.getElementById('backupRetention').value = settings.backup_retention || 30;
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

document.getElementById('generalSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        portalName: document.getElementById('portalName').value,
        contactEmail: document.getElementById('contactEmail').value,
        defaultSla: parseInt(document.getElementById('defaultSla').value)
    };

    try {
        const res = await fetch(API_URL + '/admin/settings/general', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('General settings saved successfully!', 'success');
        } else {
            showAlert('Failed: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to save settings. Please try again.', 'error');
    }
});

document.getElementById('securitySettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        passwordPolicy: document.getElementById('passwordPolicy').value,
        sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
        maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
        lockoutDuration: parseInt(document.getElementById('lockoutDuration').value)
    };

    try {
        const res = await fetch(API_URL + '/admin/settings/security', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Security settings saved successfully!', 'success');
        } else {
            showAlert('Failed: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to save settings. Please try again.', 'error');
    }
});

document.getElementById('notificationSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        emailNotifications: document.getElementById('emailNotifications').value,
        smsNotifications: document.getElementById('smsNotifications').value,
        emailTemplate: document.getElementById('emailTemplate').value
    };

    try {
        const res = await fetch(API_URL + '/admin/settings/notifications', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Notification settings saved successfully!', 'success');
        } else {
            showAlert('Failed: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to save settings. Please try again.', 'error');
    }
});

document.getElementById('backupSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    const formData = {
        backupSchedule: document.getElementById('backupSchedule').value,
        backupRetention: parseInt(document.getElementById('backupRetention').value)
    };

    try {
        const res = await fetch(API_URL + '/admin/settings/backup', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.status === 'success') {
            showAlert('Backup settings saved successfully!', 'success');
        } else {
            showAlert('Failed: ' + data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showAlert('Failed to save settings. Please try again.', 'error');
    }
});

async function createBackup() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    if (!confirm('This will create a database backup. Continue?')) {
        return;
    }

    try {
        const res = await fetch(API_URL + '/admin/backup/create', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();

        if (data.status === 'success') {
            alert('Backup created successfully! File: ' + data.data.filename);
        } else {
            alert('Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Failed to create backup. Please try again.');
    }
}

function clearCache() {
    if (!confirm('This will clear the system cache. Continue?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    fetch(API_URL + '/admin/cache/clear', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Cache cleared successfully!');
        } else {
            alert('Failed: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Failed to clear cache. Please try again.');
    });
}

function resetSettings() {
    if (!confirm('This will reset all settings to default values. Continue?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    fetch(API_URL + '/admin/settings/reset', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Settings reset successfully!');
            loadSettings();
        } else {
            alert('Failed: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Failed to reset settings. Please try again.');
    });
}

function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}
