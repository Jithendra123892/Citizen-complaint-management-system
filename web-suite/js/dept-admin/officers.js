var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

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

// Load officers
async function loadOfficers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dept-admin/officers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load officers');

        const data = await response.json();
        const tbody = document.getElementById('officersTable');

        if (!data.data.officers || data.data.officers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No officers found. <a href="dept-admin-register-officer.html">Register your first officer</a></td></tr>';
            return;
        }

        tbody.innerHTML = data.data.officers.map(officer => {
            const assigned = officer.assigned_count || 0;
            const resolved = officer.resolved_count || 0;
            const statusClass = officer.is_active ? 'active' : 'inactive';
            const statusText = officer.is_active ? 'Active' : 'Inactive';

            return `
                <tr>
                    <td>${officer.badge_number}</td>
                    <td>${officer.officer_name}</td>
                    <td>${officer.designation}</td>
                    <td>${officer.contact_number || 'N/A'}</td>
                    <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                    <td>${assigned}</td>
                    <td>${resolved}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-btn" data-id="${officer.officer_id}">View</button>
                        ${officer.is_active ? `<button class="btn btn-sm btn-danger deactivate-btn" data-id="${officer.officer_id}">Deactivate</button>` : `<button class="btn btn-sm btn-success activate-btn" data-id="${officer.officer_id}">Activate</button>`}
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners
        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const officerId = this.getAttribute('data-id');
                window.viewOfficer(officerId);
            });
        });

        tbody.querySelectorAll('.deactivate-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const officerId = this.getAttribute('data-id');
                window.deactivateOfficer(officerId);
            });
        });

        tbody.querySelectorAll('.activate-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const officerId = this.getAttribute('data-id');
                window.activateOfficer(officerId);
            });
        });
    } catch (error) {
        console.error('Error loading officers:', error);
        document.getElementById('officersTable').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Failed to load officers</td></tr>';
    }
}

// Search officers
function searchOfficers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#officersTable tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// View officer details
window.viewOfficer = async function(officerId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/officers/${officerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('Failed to load officer details');
            return;
        }

        const data = await response.json();
        const officer = data.data.officer;
        const stats = data.data.stats || {};

        const modalBody = document.getElementById('officerModalBody');
        const statusClass = officer.is_active ? 'badge-active' : 'badge-inactive';
        const statusText = officer.is_active ? 'Active' : 'Inactive';

        modalBody.innerHTML = `
            <div class="detail-row">
                <label>Badge Number</label>
                <span>${officer.badge_number || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Officer Name</label>
                <span>${officer.officer_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Designation</label>
                <span>${officer.designation || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Department</label>
                <span>${officer.department_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Contact Number</label>
                <span>${officer.contact_number || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Email</label>
                <span>${officer.email || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Status</label>
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
            <div class="detail-row">
                <label>Assigned Complaints</label>
                <span>${stats.assigned_complaints || 0}</span>
            </div>
            <div class="detail-row">
                <label>Resolved Complaints</label>
                <span>${stats.resolved || 0}</span>
            </div>
            <div class="detail-row">
                <label>Active Cases</label>
                <span>${stats.active_cases || 0}</span>
            </div>
            <div class="detail-row">
                <label>Resolution Rate</label>
                <span>${stats.resolution_rate ? stats.resolution_rate + '%' : 'N/A'}</span>
            </div>
        `;

        document.getElementById('officerModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading officer details:', error);
        alert('Failed to load officer details: ' + error.message);
    }
};

// Deactivate officer
window.deactivateOfficer = async function(officerId) {
    if (!confirm('Are you sure you want to deactivate this officer?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/officers/${officerId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: false })
        });

        if (!response.ok) throw new Error('Failed to deactivate officer');

        alert('Officer deactivated successfully');
        loadOfficers();
    } catch (error) {
        alert('Failed to deactivate officer: ' + error.message);
    }
}

// Activate officer
window.activateOfficer = async function(officerId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/officers/${officerId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: true })
        });

        if (!response.ok) throw new Error('Failed to activate officer');

        alert('Officer activated successfully');
        loadOfficers();
    } catch (error) {
        alert('Failed to activate officer: ' + error.message);
    }
};

// Close officer modal
window.closeOfficerModal = function() {
    document.getElementById('officerModal').style.display = 'none';
};

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

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchOfficers);
    }

    // Add event listener for close modal button
    const closeOfficerModalBtn = document.getElementById('closeOfficerModal');
    if (closeOfficerModalBtn) {
        closeOfficerModalBtn.addEventListener('click', window.closeOfficerModal);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    loadOfficers();

    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchOfficers();
    });
});
