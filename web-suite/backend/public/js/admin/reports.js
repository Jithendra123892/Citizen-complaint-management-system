var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';
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

    loadReports();
});

async function loadReports() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/reports/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderReports(data.data);
        }
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

function renderReports(data) {
    // Update report statistics
    const stats = data.stats || {};
    if (document.getElementById('totalComplaints')) {
        document.getElementById('totalComplaints').textContent = stats.total || 0;
    }
    if (document.getElementById('resolvedComplaints')) {
        document.getElementById('resolvedComplaints').textContent = stats.resolved || 0;
    }
    if (document.getElementById('pendingComplaints')) {
        document.getElementById('pendingComplaints').textContent = stats.pending || 0;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }

    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
    }
});
