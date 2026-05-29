(function() {
    'use strict';

    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';
    let currentUser = null;

    // Check authentication and user type
    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.replace('../auth.html');
            return false;
        }

        currentUser = user;

        if (user.type !== 'SuperAdmin' && user.type !== 'Admin') {
            if (user.type === 'Officer') {
                window.location.replace('../officer/dashboard.html');
            } else if (user.type === 'DeptAdmin') {
                window.location.replace('../dept-admin/dashboard.html');
            } else {
                window.location.replace('../citizen/dashboard.html');
            }
            return false;
        }

        document.getElementById('adminName').textContent = user.username || user.name;
        return true;
    }

    // Load analytics data
    window.loadAnalytics = async function() {
        const period = document.getElementById('periodSelect').value;
        const token = localStorage.getItem('token');

        console.log('Loading analytics...');
        console.log('Token exists:', !!token);
        console.log('Period:', period);

        if (!token) {
            alert('Please login first');
            window.location.href = '../auth.html';
            return;
        }

        try {
            const [analyticsResponse, realtimeResponse] = await Promise.all([
                fetch(`${API_BASE}/analytics/dashboard?period=${period}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/analytics/realtime`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            console.log('Analytics response status:', analyticsResponse.status);
            console.log('Realtime response status:', realtimeResponse.status);

            if (!analyticsResponse.ok || !realtimeResponse.ok) {
                const analyticsError = await analyticsResponse.text();
                const realtimeError = await realtimeResponse.text();
                console.error('Analytics error:', analyticsError);
                console.error('Realtime error:', realtimeError);
                throw new Error(`Failed to fetch analytics data. Analytics: ${analyticsResponse.status}, Realtime: ${realtimeResponse.status}`);
            }

            const analytics = await analyticsResponse.json();
            const realtime = await realtimeResponse.json();

            console.log('Analytics data:', analytics);
            console.log('Realtime data:', realtime);

            if (analytics.status !== 'success' || realtime.status !== 'success') {
                console.error('Analytics status:', analytics.status, 'Message:', analytics.message);
                console.error('Realtime status:', realtime.status, 'Message:', realtime.message);
                throw new Error(analytics.message || realtime.message || 'API returned error');
            }

            const data = analytics.data;
            const realtimeData = realtime.data;

            // Update main stats from dashboard metrics
            document.getElementById('totalComplaints').textContent = data.metrics.total_complaints || 0;
            document.getElementById('resolvedCount').textContent = data.metrics.resolved || 0;
            document.getElementById('activeCount').textContent = data.metrics.active || 0;
            document.getElementById('overdueRate').textContent = (data.metrics.overdue_rate || 0) + '%';
            
            const resolutionRate = data.metrics.resolution_rate || 0;
            document.getElementById('resolvedRate').textContent = `Resolution Rate: ${resolutionRate}%`;
            
            const avgHours = data.metrics.avg_resolution_hours;
            if (avgHours) {
                const days = Math.floor(avgHours / 24);
                const hours = Math.round(avgHours % 24);
                document.getElementById('avgResolution').textContent = days > 0 
                    ? `Avg Resolution: ${days}d ${hours}h`
                    : `Avg Resolution: ${hours}h`;
            }

            document.getElementById('criticalCount').textContent = `Critical: ${data.metrics.critical_open || 0}`;

            // Department performance
            renderDeptPerformance(data.deptPerformance);

            // Category distribution
            renderCategoryDistribution(data.categoryDistribution);

            // Priority distribution
            renderPriorityDist(data.priorityDist);

            // Recently filed
            renderRecentlyFiled(realtimeData.recentlyFiled);

            // Recently resolved
            renderRecentlyResolved(realtimeData.recentlyResolved);

            // Critical complaints
            renderCriticalComplaints(realtimeData.critical);

        } catch (error) {
            console.error('Error loading analytics:', error);
            alert('Failed to load analytics data: ' + error.message);
        }
    };

    // Render department performance table
    function renderDeptPerformance(depts) {
        const tbody = document.getElementById('deptPerformance');
        
        if (!depts || depts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = depts.map(dept => {
            const rate = dept.resolution_rate || 0;
            const hours = dept.avg_hours || 'N/A';
            
            return `
                <tr>
                    <td>${dept.department_name}</td>
                    <td>${dept.total}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="progress-bar" style="width:100px;">
                                <div class="progress-fill" style="width:${rate}%"></div>
                            </div>
                            <span>${rate}%</span>
                        </div>
                    </td>
                    <td>${hours !== 'N/A' ? hours + 'h' : 'N/A'}</td>
                </tr>
            `;
        }).join('');
    }

    // Render category distribution
    function renderCategoryDistribution(categories) {
        const tbody = document.getElementById('categoryDist');
        
        if (!categories || categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(cat => {
            const count = cat.count || 0;
            const percentage = cat.percentage || 0;
            
            return `
                <tr>
                    <td>${cat.category_name}</td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                    <td>
                        <div class="progress-bar" style="width:150px;">
                            <div class="progress-fill" style="width:${percentage}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render priority distribution
    function renderPriorityDist(priorities) {
        const container = document.getElementById('priorityDist');
        
        if (!priorities || priorities.length === 0) {
            container.innerHTML = '<p style="color:#757575;">No data available</p>';
            return;
        }

        container.innerHTML = priorities.map(p => {
            const priorityClass = `priority-${(p.priority || 'low').toLowerCase()}`;
            return `
                <div class="stat-card" style="flex:1;min-width:150px;">
                    <h3>${p.priority}</h3>
                    <div class="value">${p.count}</div>
                </div>
            `;
        }).join('');
    }

    // Render recently filed complaints
    function renderRecentlyFiled(complaints) {
        const tbody = document.getElementById('recentlyFiled');
        
        if (!complaints || complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No complaints filed</td></tr>';
            return;
        }

        tbody.innerHTML = complaints.slice(0, 5).map(c => {
            const priorityClass = `priority-${(c.priority || 'low').toLowerCase()}`;
            return `
                <tr>
                    <td>${c.complaint_number}</td>
                    <td>${c.complaint_title}</td>
                    <td>${c.category_name || 'N/A'}</td>
                    <td><span class="status-badge ${priorityClass}">${c.priority}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Render recently resolved complaints
    function renderRecentlyResolved(complaints) {
        const tbody = document.getElementById('recentlyResolved');
        
        if (!complaints || complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#757575;">No resolved complaints</td></tr>';
            return;
        }

        tbody.innerHTML = complaints.slice(0, 5).map(c => {
            const resolvedDate = c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : 'N/A';
            return `
                <tr>
                    <td>${c.complaint_number}</td>
                    <td>${c.complaint_title}</td>
                    <td>${c.department_name || 'N/A'}</td>
                    <td>${resolvedDate}</td>
                </tr>
            `;
        }).join('');
    }

    // Render critical complaints
    function renderCriticalComplaints(complaints) {
        const tbody = document.getElementById('criticalComplaints');
        
        if (!complaints || complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#388e3c;">No critical complaints</td></tr>';
            return;
        }

        tbody.innerHTML = complaints.map(c => {
            const statusClass = c.status.toLowerCase().replace(' ', '-');
            const filedDate = new Date(c.created_at).toLocaleString();
            
            return `
                <tr>
                    <td>${c.complaint_number}</td>
                    <td>${c.complaint_title}</td>
                    <td>${c.category_name || 'N/A'}</td>
                    <td>${c.department_name || 'N/A'}</td>
                    <td><span class="status-badge status-${statusClass}">${c.status}</span></td>
                    <td>${filedDate}</td>
                </tr>
            `;
        }).join('');
    }

    // Logout
    window.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../auth.html');
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', async function() {
        if (checkAuth()) {
            await loadAnalytics();
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
