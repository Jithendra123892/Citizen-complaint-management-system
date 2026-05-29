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

    // HTML escape function to prevent XSS
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getToken() { return localStorage.getItem('token'); }

    // Check authentication and user type
    function checkAuth() {
        var token = getToken();
        var user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.replace('../auth.html');
            return false;
        }

        if (user.type !== 'DeptAdmin') {
            if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
            else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
            else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
            else window.location.replace('../auth.html');
            return false;
        }

        var userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) userInfoEl.textContent = 'Welcome, ' + (user.name || user.username || 'Dept Admin');
        return true;
    }

    // Load department info
    async function loadDepartmentInfo() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }
        try {
            var response = await fetch(API_URL + '/dept-admin/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load department info');

            var data = await response.json();
            var user = data.data && data.data.user ? data.data.user : {};
            if (user.department_name) {
                var deptInfoEl = document.getElementById('deptInfo');
                var deptNameEl = document.getElementById('deptName');
                if (deptInfoEl) deptInfoEl.style.display = 'block';
                if (deptNameEl) deptNameEl.textContent = user.department_name;
            }
        } catch (error) {
            console.error('Error loading department info:', error);
        }
    }

    // Load statistics
    async function loadStats() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }
        try {
            var response = await fetch(API_URL + '/dept-admin/stats', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load statistics');

            var data = await response.json();
            var stats = data.data && data.data.stats ? data.data.stats : {};

            var totalOfficersEl = document.getElementById('totalOfficers');
            var totalComplaintsEl = document.getElementById('totalComplaints');
            var resolvedEl = document.getElementById('resolved');
            var pendingEl = document.getElementById('pending');
            var inProgressEl = document.getElementById('inProgress');

            if (totalOfficersEl) totalOfficersEl.textContent = stats.total_officers || 0;
            if (totalComplaintsEl) totalComplaintsEl.textContent = stats.total_complaints || 0;
            if (resolvedEl) resolvedEl.textContent = stats.resolved || 0;
            if (pendingEl) pendingEl.textContent = stats.pending || 0;
            if (inProgressEl) inProgressEl.textContent = stats.in_progress || 0;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Load recent complaints
    async function loadRecentComplaints() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }
        try {
            var response = await fetch(API_URL + '/complaints?limit=5', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load complaints');

            var data = await response.json();
            var tbody = document.getElementById('recentComplaints');
            if (!tbody) return;

            var items = data.data && data.data.items ? data.data.items : [];
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No complaints found</td></tr>';
                return;
            }

            var html = items.map(function(complaint) {
                return '<tr>' +
                    '<td>#' + escapeHtml(complaint.complaint_id || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(complaint.complaint_title || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(complaint.category_name || 'N/A') + '</td>' +
                    '<td><span class="badge badge-' + getStatusClass(complaint.status) + '">' + escapeHtml(complaint.status || 'Pending') + '</span></td>' +
                    '<td>' + escapeHtml(complaint.officer_name || 'Unassigned') + '</td>' +
                    '<td>' + escapeHtml(formatDate(complaint.created_at)) + '</td>' +
                    '</tr>';
            }).join('');
            tbody.innerHTML = html;
        } catch (error) {
            console.error('Error loading complaints:', error);
            var tbody = document.getElementById('recentComplaints');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#c62828;">Failed to load complaints</td></tr>';
        }
    }

    // Load officer performance
    async function loadOfficerPerformance() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }
        try {
            var response = await fetch(API_URL + '/complaints/officer/performance', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.status === 401) { handleAuthError(); return; }
            if (!response.ok) throw new Error('Failed to load officers');

            var data = await response.json();
            var tbody = document.getElementById('officerPerformance');
            if (!tbody) return;

            var officers = data.data && data.data.officers ? data.data.officers : [];
            if (officers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No officers found</td></tr>';
                return;
            }

            var html = officers.map(function(officer) {
                var statusClass = officer.is_busy ? 'status-busy' : 'status-available';
                var statusBadge = officer.is_busy ? 'Busy' : 'Available';
                var completionRate = officer.completion_rate || 0;
                var totalAssigned = officer.total_assigned || 0;
                var resolved = officer.resolved || 0;
                var pendingApproval = officer.pending_approval || 0;
                return '<tr>' +
                    '<td>' + escapeHtml(officer.officer_name || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(officer.badge_number || 'N/A') + '</td>' +
                    '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(statusBadge) + '</span></td>' +
                    '<td>' + totalAssigned + '</td>' +
                    '<td>' + resolved + '</td>' +
                    '<td>' + pendingApproval + '</td>' +
                    '<td>' + completionRate + '%</td>' +
                    '</tr>';
            }).join('');
            tbody.innerHTML = html;
        } catch (error) {
            console.error('Error loading officers:', error);
            var tbody = document.getElementById('officerPerformance');
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#c62828;">Failed to load officers</td></tr>';
        }
    }

    function getStatusClass(status) {
        var statusMap = {
            'Pending': 'pending',
            'In Progress': 'in-progress',
            'Resolved': 'resolved',
            'Rejected': 'rejected'
        };
        return statusMap[status] || 'pending';
    }

    function formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return 'N/A'; }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../auth.html');
    }

    // Single DOMContentLoaded — merged from two
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkAuth()) return;

        loadDepartmentInfo();
        loadStats();
        loadRecentComplaints();
        loadOfficerPerformance();

        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
}());