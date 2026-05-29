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

// Generate report
async function generateReport(reportType) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please select a date range');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/reports/department`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reportType: reportType || 'complaint-summary',
                startDate,
                endDate
            })
        });

        if (!response.ok) throw new Error('Failed to generate report');

        const data = await response.json();

        // For now, just show an alert with the report data
        // In a full implementation, this would display a formatted report
        alert(`Report generated successfully!\n\n${JSON.stringify(data.data, null, 2)}`);
    } catch (error) {
        alert('Failed to generate report: ' + error.message);
    }
}

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

    // Add event listener for generate report button
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            generateReport();
        });
    }

    // Add event listeners for report cards
    const reportCards = [
        { id: 'report-complaint-summary', type: 'complaint-summary' },
        { id: 'report-officer-performance', type: 'officer-performance' },
        { id: 'report-category-breakdown', type: 'category-breakdown' },
        { id: 'report-time-analysis', type: 'time-analysis' },
        { id: 'report-trend-analysis', type: 'trend-analysis' },
        { id: 'report-citizen-feedback', type: 'citizen-feedback' }
    ];

    reportCards.forEach(card => {
        const element = document.getElementById(card.id);
        if (element) {
            element.addEventListener('click', function() {
                generateReport(card.type);
            });
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
});
