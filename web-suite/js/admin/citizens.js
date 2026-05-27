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

    loadCitizens();
});

async function loadCitizens() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/citizens', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderCitizens(data.data.items || []);
        }
    } catch (err) {
        console.error('Error loading citizens:', err);
    }
}

function renderCitizens(citizens) {
    const tbody = document.getElementById('citizensTable');
    if (!tbody) return;
    
    if (citizens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No citizens found</td></tr>';
        return;
    }

    tbody.innerHTML = citizens.map(c => `
        <tr>
            <td>${c.citizen_id}</td>
            <td>${c.citizen_name}</td>
            <td>${c.aadhaar_number}</td>
            <td>${c.phone_number}</td>
            <td>${c.email || '-'}</td>
            <td>${c.ward_number || '-'}</td>
            <td>${c.is_active ? 'Active' : 'Inactive'}</td>
        </tr>
    `).join('');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
}
