(function() {
    'use strict';

    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';
    let currentUser = null;
    let departments = [];
    let officers = [];
    let editingOfficerId = null;

    // Check authentication and user type
    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.href = '../auth.html';
            return false;
        }

        currentUser = user;

        if (user.type !== 'SuperAdmin' && user.type !== 'Admin') {
            if (user.type === 'Officer') {
                window.location.href = '../officer/dashboard.html';
            } else if (user.type === 'DeptAdmin') {
                window.location.href = '../dept-admin/dashboard.html';
            } else {
                window.location.href = '../citizen/dashboard.html';
            }
            return false;
        }

        document.getElementById('adminName').textContent = user.username || user.name;
        return true;
    }

    // Load departments for dropdown
    async function loadDepartments() {
        try {
            const response = await fetch(`${API_BASE}/departments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load departments');

            const data = await response.json();
            departments = data.data.departments || [];

            const select = document.getElementById('ofDept');
            select.innerHTML = '<option value="">-- Select Department --</option>' +
                departments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    // Load all officers
    async function loadOfficers() {
        try {
            const response = await fetch(`${API_BASE}/officers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load officers');

            const data = await response.json();
            officers = data.data.items || data.data.officers || [];

            renderOfficers();
        } catch (error) {
            console.error('Error loading officers:', error);
            const tbody = document.getElementById('officersTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#c62828;">Error loading officers: ' + error.message + '</td></tr>';
            }
        }
    }

    // Render officers table
    function renderOfficers() {
        const tbody = document.getElementById('officersTableBody');

        if (officers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#757575;">No officers found</td></tr>';
            return;
        }

        tbody.innerHTML = officers.map(officer => {
            const assigned = officer.assigned_count || 0;
            const resolved = officer.resolved_count || 0;
            const pending = assigned - resolved;

            return `
                <tr>
                    <td>${officer.badge_number}</td>
                    <td>${officer.officer_name}</td>
                    <td>${officer.department_name || 'N/A'}</td>
                    <td>${officer.designation || 'N/A'}</td>
                    <td>${officer.contact_number || 'N/A'}</td>
                    <td>
                        <div class="stats-row">
                            <span class="stat-chip">Total: ${assigned}</span>
                            <span class="stat-chip">Resolved: ${resolved}</span>
                            <span class="stat-chip">Pending: ${pending > 0 ? pending : 0}</span>
                        </div>
                    </td>
                    <td class="action-links">
                        <button class="btn btn-sm btn-outline edit-btn" data-id="${officer.officer_id}">Edit</button>
                        <button class="btn btn-sm btn-red deactivate-btn" data-id="${officer.officer_id}" data-name="${officer.officer_name.replace(/'/g, "\\'")}">Deactivate</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to edit buttons
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const officerId = this.getAttribute('data-id');
                window.editOfficer(officerId);
            });
        });

        // Add event listeners to deactivate buttons
        tbody.querySelectorAll('.deactivate-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const officerId = this.getAttribute('data-id');
                const officerName = this.getAttribute('data-name');
                window.deactivateOfficer(officerId, officerName);
            });
        });
    }

    // Show add officer modal
    window.showAddOfficerModal = function() {
        editingOfficerId = null;
        document.getElementById('officerModalTitle').textContent = 'Add Officer';
        document.getElementById('officerForm').reset();
        document.getElementById('officerModal').classList.add('active');
    };

    // Edit officer
    window.editOfficer = async function(officerId) {
        const officer = officers.find(o => o.officer_id == officerId);
        if (!officer) {
            alert('Officer not found');
            return;
        }

        editingOfficerId = officerId;
        document.getElementById('officerModalTitle').textContent = 'Edit Officer';
        document.getElementById('ofName').value = officer.officer_name || '';
        document.getElementById('ofBadge').value = officer.badge_number || '';
        document.getElementById('ofDept').value = officer.department_id || '';
        document.getElementById('ofDesignation').value = officer.designation || '';
        document.getElementById('ofContact').value = officer.contact_number || '';
        document.getElementById('ofEmail').value = officer.email || '';

        document.getElementById('officerModal').classList.add('active');
    };

    // Close officer modal
    window.closeOfficerModal = function() {
        document.getElementById('officerModal').classList.remove('active');
        editingOfficerId = null;
    };

    // Deactivate officer
    window.deactivateOfficer = async function(officerId, officerName) {
        if (!confirm(`Are you sure you want to deactivate ${officerName}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/officers/${officerId}/deactivate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Officer deactivated successfully');
                await loadOfficers();
            } else {
                alert('Failed to deactivate: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deactivating officer:', error);
            alert('Error deactivating officer');
        }
    };

    // Handle officer form submission
    document.addEventListener('submit', async function(e) {
        if (e.target.id !== 'officerForm') return;
        e.preventDefault();

        const officerData = {
            officerName: document.getElementById('ofName').value,
            badgeNumber: document.getElementById('ofBadge').value,
            departmentId: document.getElementById('ofDept').value,
            designation: document.getElementById('ofDesignation').value,
            contactNumber: document.getElementById('ofContact').value,
            email: document.getElementById('ofEmail').value,
            dateOfJoining: new Date().toISOString().split('T')[0]
        };

        try {
            let response;
            
            if (editingOfficerId) {
                // Update existing officer
                response = await fetch(`${API_BASE}/officers/${editingOfficerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(officerData)
                });
            } else {
                // Create new officer
                response = await fetch(`${API_BASE}/officers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(officerData)
                });
            }

            const data = await response.json();

            if (data.status === 'success') {
                alert(editingOfficerId ? 'Officer updated successfully' : 'Officer created successfully');
                closeOfficerModal();
                await loadOfficers();
            } else {
                alert('Failed: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving officer:', error);
            alert('Error saving officer');
        }
    });

    // Logout
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.href = '../auth.html';
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', async function() {
        if (checkAuth()) {
            await Promise.all([
                loadDepartments(),
                loadOfficers()
            ]);
        }

        // Add logout button event listener
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }

        // Add officer button event listener
        const addOfficerBtn = document.getElementById('addOfficerBtn');
        if (addOfficerBtn) {
            addOfficerBtn.addEventListener('click', showAddOfficerModal);
        }

        // Add modal close button event listener
        const closeOfficerModal = document.getElementById('closeOfficerModal');
        if (closeOfficerModal) {
            closeOfficerModal.addEventListener('click', window.closeOfficerModal);
        }
    });
})();
