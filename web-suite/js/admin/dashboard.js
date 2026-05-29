(function() {
    'use strict';

    // Use centralized config if available, fallback to localhost
    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';

    // Auth guard: redirect to login on 401 Unauthorized
    function handleAuthError() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.href = '../auth.html';
    }
    let currentUser = null;

    // HTML escape function to prevent XSS
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Check authentication and user type
    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        console.log('Admin Dashboard - Token exists:', !!token);
        console.log('Admin Dashboard - User type:', user.type);

        if (!token) {
            window.location.href = '../auth.html';
            return false;
        }

        currentUser = user;

        if (user.type !== 'SuperAdmin' && user.type !== 'Admin') {
            console.log('Redirecting non-admin user:', user.type);
            if (user.type === 'Officer') {
                window.location.replace('../officer/dashboard.html');
            } else if (user.type === 'DeptAdmin') {
                window.location.replace('../dept-admin/dashboard.html');
            } else if (user.type === 'Citizen') {
                window.location.replace('../citizen/dashboard.html');
            } else {
                window.location.href = '../auth.html';
            }
            return false;
        }

        document.getElementById('adminName').textContent = user.username || user.name;
        return true;
    }

    // Load dashboard statistics
    async function loadStats() {
        try {
            const response = await fetch(`${API_URL}/complaints/stats/summary`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load stats');

            const data = await response.json();
            const stats = data.data.summary || data.data;

            document.getElementById('totalComplaints').textContent = stats.total || 0;
            document.getElementById('pendingComplaints').textContent = stats.pending || 0;
            document.getElementById('inProgressComplaints').textContent = stats.in_progress || 0;
            document.getElementById('resolvedComplaints').textContent = stats.resolved || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
            document.getElementById('totalComplaints').textContent = 'Error';
            document.getElementById('pendingComplaints').textContent = 'Error';
            document.getElementById('inProgressComplaints').textContent = 'Error';
            document.getElementById('resolvedComplaints').textContent = 'Error';
        }
    }

    // Load recent complaints
    async function loadRecentComplaints() {
        try {
            const response = await fetch(`${API_URL}/complaints?limit=10`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load complaints');

            const data = await response.json();
            const complaints = data.data.items || [];

            const tbody = document.getElementById('recentComplaints');
            
            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No complaints found</td></tr>';
                return;
            }

            tbody.innerHTML = complaints.map((complaint, index) => {
                const statusClass = complaint.status.toLowerCase().replace(' ', '-');
                return `
                    <tr>
                        <td>${escapeHtml(complaint.complaint_number || index + 1)}</td>
                        <td>${escapeHtml(complaint.complaint_title || 'N/A')}</td>
                        <td><span class="status-badge status-${statusClass}">${escapeHtml(complaint.status)}</span></td>
                        <td><a href="complaints.html?id=${complaint.complaint_id}" class="btn btn-sm btn-outline">View</a></td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading recent complaints:', error);
            const tbody = document.getElementById('recentComplaints');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#c62828;">Error loading complaints: ' + escapeHtml(error.message) + '</td></tr>';
            }
        }
    }

    // Load department performance
    async function loadDepartmentPerformance() {
        try {
            const response = await fetch(`${API_URL}/departments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load departments');

            const data = await response.json();
            const departments = data.data.departments || [];

            const tbody = document.getElementById('deptPerformance');
            
            if (departments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No departments found</td></tr>';
                return;
            }

            tbody.innerHTML = departments.map(dept => {
                const total = dept.total_complaints || 0;
                const resolved = dept.resolved_complaints || 0;
                const rate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';
                
                return `
                    <tr>
                        <td>${escapeHtml(dept.department_name)}</td>
                        <td>${total}</td>
                        <td>${resolved}</td>
                        <td>${rate}%</td>
                    </tr>
                `;
            }).join('');

            document.getElementById('deptCount').textContent = departments.length;
        } catch (error) {
            console.error('Error loading departments:', error);
            const tbody = document.getElementById('deptPerformance');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#c62828;">Error loading departments: ' + escapeHtml(error.message) + '</td></tr>';
            }
        }
    }

    // Load officer performance
    async function loadOfficerPerformance() {
        try {
            const response = await fetch(`${API_URL}/officers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load officers');

            const data = await response.json();
            const officers = data.data.items || [];

            const tbody = document.getElementById('officerPerformance');
            
            if (officers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#757575;">No officers found</td></tr>';
                return;
            }

            tbody.innerHTML = officers.map(officer => {
                const assigned = officer.assigned_count || 0;
                const resolved = officer.resolved_count || 0;
                const active = assigned - resolved;
                const rate = assigned > 0 ? ((resolved / assigned) * 100).toFixed(1) : '0.0';

                return `
                    <tr>
                        <td>${escapeHtml(officer.officer_name)}</td>
                        <td>${escapeHtml(officer.department_name || 'N/A')}</td>
                        <td>${assigned}</td>
                        <td>${resolved}</td>
                        <td>${active > 0 ? active : 0}</td>
                        <td>${rate}%</td>
                    </tr>
                `;
            }).join('');

            document.getElementById('officerCount').textContent = officers.length;
        } catch (error) {
            console.error('Error loading officers:', error);
            const tbody = document.getElementById('officerPerformance');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#c62828;">Error loading officers: ' + escapeHtml(error.message) + '</td></tr>';
            }
        }
    }

    // Logout function
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
                loadStats(),
                loadRecentComplaints(),
                loadDepartmentPerformance(),
                loadOfficerPerformance()
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
    });
})();
