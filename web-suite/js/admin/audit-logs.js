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
        window.location.href = '../auth.html';
        return;
    }

    // Only SuperAdmin can access
    if (user.type !== 'SuperAdmin') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.href = '../auth.html';
        return;
    }

    loadAuditLogs();
});

async function loadAuditLogs() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/reports/audit-logs', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderAuditLogs(data.data.logs || []);
        }
    } catch (err) {
        console.error('Error loading audit logs:', err);
    }
}

function renderAuditLogs(logs) {
    const tbody = document.getElementById('auditLogsTable');
    if (!tbody) return;
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No audit logs found</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.log_id || '-'}</td>
            <td>${log.action || '-'}</td>
            <td>${log.user_type || '-'}</td>
            <td>${new Date(log.created_at).toLocaleString()}</td>
            <td>${log.ip_address || '-'}</td>
            <td>${log.details || '-'}</td>
        </tr>
    `).join('');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
}
