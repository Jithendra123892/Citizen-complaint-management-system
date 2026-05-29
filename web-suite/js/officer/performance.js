document.addEventListener('DOMContentLoaded', function() {
    var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

    // Prevent redirect loops
    if (sessionStorage.getItem('redirecting') === 'true') {
        sessionStorage.removeItem('redirecting');
        return;
    }

    var user = JSON.parse(localStorage.getItem('user') || '{}');
    var token = localStorage.getItem('token');

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

    loadPerformanceData();
});

async function loadPerformanceData() {
    var token = localStorage.getItem('token');
    try {
        console.log('Loading officer performance from: ' + API_BASE + '/officers/performance');
        var res = await fetch(API_BASE + '/officers/performance', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        console.log('Performance response status:', res.status);
        const data = await res.json();
        console.log('Performance response data:', data);

        if (data.status === 'success') {
            renderPerformance(data.data);
        } else {
            console.error('Performance API error:', data.message);
            if (document.getElementById('totalAssigned')) {
                document.getElementById('totalAssigned').textContent = 'Error';
            }
        }
    } catch (err) {
        console.error('Error loading performance data:', err);
        if (document.getElementById('totalAssigned')) {
            document.getElementById('totalAssigned').textContent = 'Error';
        }
    }
}

function renderPerformance(data) {
    if (document.getElementById('totalAssigned')) {
        document.getElementById('totalAssigned').textContent = data.total_assigned || 0;
    }
    if (document.getElementById('totalResolved')) {
        document.getElementById('totalResolved').textContent = data.total_resolved || 0;
    }
    if (document.getElementById('resolutionRate')) {
        document.getElementById('resolutionRate').textContent = data.resolution_rate || '0%';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}
