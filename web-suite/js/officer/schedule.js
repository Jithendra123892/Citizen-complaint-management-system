document.addEventListener('DOMContentLoaded', function() {
    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only Officers can access
    if (user.type !== 'Officer') {
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    // Add event listeners for month buttons
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            window.changeMonth(-1);
        });
    }

    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            window.changeMonth(1);
        });
    }

    loadSchedule();
});

async function loadSchedule() {
    var token = localStorage.getItem('token');
    try {
        var res = await fetch(API_URL + '/officers/schedule', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderSchedule(data.data.schedule || []);
        }
    } catch (err) {
        console.error('Error loading schedule:', err);
    }
}

function renderSchedule(schedule) {
    const tbody = document.getElementById('scheduleTable');
    if (!tbody) return;
    
    if (schedule.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">No schedule found</td></tr>';
        return;
    }

    tbody.innerHTML = schedule.map(item => `
        <tr>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td>${item.start_time}</td>
            <td>${item.end_time}</td>
            <td>${item.task || '-'}</td>
        </tr>
    `).join('');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}
