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

    // Check authentication and user type
    function checkAuth() {
        var token = localStorage.getItem('token');
        var user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.replace('../auth.html');
            return false;
        }

        if (user.type !== 'Citizen') {
            if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
            else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
            else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
            else window.location.replace('../auth.html');
            return false;
        }

        var userNameEl = document.getElementById('userName');
        if (userNameEl && user.name) {
            userNameEl.textContent = user.name;
        }

        return true;
    }

    async function loadDashboardData() {
        var token = localStorage.getItem('token');
        if (!token) {
            handleAuthError();
            return;
        }

        try {
            // Load stats
            var statsRes = await fetch(API_URL + '/complaints/stats/summary', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (statsRes.status === 401) { handleAuthError(); return; }
            var statsData = await statsRes.json();
            if (statsData.status === 'success') {
                var s = statsData.data.summary;
                document.getElementById('totalComplaints').textContent = s.total || 0;
                document.getElementById('pendingComplaints').textContent = s.pending || 0;
                document.getElementById('progressComplaints').textContent = s.in_progress || 0;
                document.getElementById('resolvedComplaints').textContent = s.resolved || 0;
            }

            // Load recent complaints
            var compRes = await fetch(API_URL + '/complaints?limit=5', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (compRes.status === 401) { handleAuthError(); return; }
            var compData = await compRes.json();
            if (compData.status === 'success') {
                renderComplaintsTable(compData.data.items || []);
            }
        } catch (err) {
            console.error('Dashboard error:', err);
            var tbody = document.getElementById('complaintsTable');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#c62828;">Failed to load data — please try again later.</td></tr>';
            }
        }
    function renderComplaintsTable(complaints) {
        var tbody = document.querySelector('.complaints-table tbody');
        if (!tbody) return;

        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#757575;">No complaints filed yet. Click "File New Complaint" to get started.</td></tr>';
            return;
        }

        // Build rows safely using escapeHtml on all dynamic content
        var html = complaints.map(function(c) {
            var dateStr = 'N/A';
            try {
                dateStr = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {}
            var status = c.status || 'Pending';
            var statusClass = status.toLowerCase().replace(' ', '-');
            var complaintId = c.complaint_id || '';
            var complaintNumber = c.complaint_number || 'N/A';
            var complaintTitle = c.complaint_title || 'N/A';
            return '<tr>' +
                '<td>' + escapeHtml(complaintNumber) + '</td>' +
                '<td>' + escapeHtml(complaintTitle) + '</td>' +
                '<td><span class="status-badge status-' + statusClass + '">' + escapeHtml(status) + '</span></td>' +
                '<td>' + escapeHtml(dateStr) + '</td>' +
                '<td><a href="complaint-details.html?id=' + complaintId + '" class="btn btn-sm btn-outline" aria-label="View complaint ' + escapeHtml(complaintNumber) + '">View</a></td>' +
                '</tr>';
        }).join('');

        tbody.innerHTML = html;
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../auth.html');
    }

    function navigateTo(url) {
        window.location.href = url;
    }

    // Initialize — single DOMContentLoaded listener
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkAuth()) return;

        loadDashboardData();

        // Logout button
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }

        // File complaint button (nav bar — renamed from fileComplaintBtn to fileComplaintBtnNav)
        var fileComplaintBtn = document.getElementById('fileComplaintBtnNav');
        if (fileComplaintBtn) {
            fileComplaintBtn.addEventListener('click', function() {
                navigateTo('new-complaint.html');
            });
        }

        // Action cards — click + keyboard (role="button" + tabindex="0" set in HTML)
        var trackCard = document.getElementById('trackCard');
        if (trackCard) {
            trackCard.addEventListener('click', function() { navigateTo('track.html'); });
            trackCard.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('track.html'); }
            });
        }

        var myComplaintsCard = document.getElementById('myComplaintsCard');
        if (myComplaintsCard) {
            myComplaintsCard.addEventListener('click', function() { navigateTo('complaints.html'); });
            myComplaintsCard.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('complaints.html'); }
            });
        }

        var fileComplaintCard = document.getElementById('fileComplaintCard');
        if (fileComplaintCard) {
            fileComplaintCard.addEventListener('click', function() { navigateTo('new-complaint.html'); });
            fileComplaintCard.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('new-complaint.html'); }
            });
        }
    });

    // Duplicate escapeHtml removed
}());