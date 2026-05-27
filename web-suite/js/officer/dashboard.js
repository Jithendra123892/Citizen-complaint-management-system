(function() {
    'use strict';

    // Use centralized config if available, fallback to localhost
    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

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

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../auth.html');
    }

    async function loadOfficerStats() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }

        try {
            // Get officer info from server
            var meRes = await fetch(API_URL + '/auth/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (meRes.status === 401) { handleAuthError(); return; }
            var meData = await meRes.json();
            if (meData.status === 'success') {
                var officer = meData.data.user;
                var deptEl = document.getElementById('deptInfo');
                if (deptEl) {
                    deptEl.textContent = officer.department_name ? officer.department_name + ' | ' + officer.designation : 'Officer Workspace';
                }
            }

            // Get all complaints to filter
            var res = await fetch(API_URL + '/complaints?limit=200', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { handleAuthError(); return; }
            var data = await res.json();
            if (data.status === 'success') {
                var items = data.data.items || [];
                // Filter only complaints assigned to this officer
                var myComplaints = items.filter(function(c) { return c.assigned_officer_id !== null; });
                var assigned = myComplaints.length;
                var inProgress = myComplaints.filter(function(c) { return c.status === 'In Progress'; }).length;
                var resolved = myComplaints.filter(function(c) { return c.status === 'Resolved' || c.status === 'Closed'; }).length;
                var rate = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;

                var assignedEl = document.getElementById('assignedCount');
                var inProgressEl = document.getElementById('inProgressCount');
                var resolvedEl = document.getElementById('resolvedCount');
                var rateEl = document.getElementById('resolutionRate');
                if (assignedEl) assignedEl.textContent = assigned;
                if (inProgressEl) inProgressEl.textContent = inProgress;
                if (resolvedEl) resolvedEl.textContent = resolved;
                if (rateEl) rateEl.textContent = rate + '%';
            }
        } catch (err) {
            console.error('Stats error:', err);
        }
    }

    async function loadRecentComplaints() {
        var token = getToken();
        if (!token) { handleAuthError(); return; }

        try {
            var res = await fetch(API_URL + '/complaints?limit=10', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { handleAuthError(); return; }
            var data = await res.json();
            if (data.status === 'success') {
                var items = (data.data.items || []).filter(function(c) { return c.assigned_officer_id !== null; });
                var tbody = document.getElementById('complaintsTableBody');
                if (!tbody) return;
                if (!items || items.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">No complaints assigned yet.</td></tr>';
                    return;
                }
                tbody.innerHTML = items.map(function(c) {
                    var sc = 'status-' + (c.status || 'pending').toLowerCase().replace(' ', '-');
                    var pc = 'priority-' + (c.priority || 'medium').toLowerCase();
                    var dt = 'N/A';
                    try { dt = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) {}
                    return '<tr>' +
                        '<td>' + escapeHtml(c.complaint_number || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(c.complaint_title || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(c.category_name || '-') + '</td>' +
                        '<td><span class="status-badge ' + pc + '">' + escapeHtml(c.priority || 'Medium') + '</span></td>' +
                        '<td><span class="status-badge ' + sc + '">' + escapeHtml(c.status || 'Pending') + '</span></td>' +
                        '<td>' + escapeHtml(dt) + '</td>' +
                        '<td><a href="complaint-details.html?id=' + (c.complaint_id || '') + '" class="btn btn-outline btn-sm" aria-label="View complaint ' + escapeHtml(c.complaint_number || '') + '">View</a></td>' +
                        '</tr>';
                }).join('');
            }
        } catch (err) {
            console.error('Load error:', err);
            var tbody = document.getElementById('complaintsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#c62828;">Failed to load complaints.</td></tr>';
            }
        }
    }

    // Single DOMContentLoaded — merged from two
    document.addEventListener('DOMContentLoaded', function() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        var token = localStorage.getItem('token');

        if (!token) {
            window.location.replace('../auth.html');
            return;
        }

        if (user.type !== 'Officer') {
            if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
            else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
            else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
            else window.location.replace('../auth.html');
            return;
        }

        var nameEl = document.getElementById('officerName');
        if (nameEl) nameEl.textContent = user.name || 'Officer';

        loadOfficerStats();
        loadRecentComplaints();

        // Logout button
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
}());