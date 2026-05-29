var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Redirect non-citizens to appropriate dashboards
    if (user.type === 'SuperAdmin') {
        window.location.replace('../admin/dashboard.html');
        return;
    } else if (user.type === 'DeptAdmin') {
        window.location.replace('../dept-admin/dashboard.html');
        return;
    } else if (user.type === 'Officer') {
        window.location.replace('../officer/dashboard.html');
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    }

    loadComplaints();
});

// HTML escape function to prevent XSS
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadComplaints() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../auth.html';
        return;
    }

    try {
        const res = await fetch(API_URL + '/complaints', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response data:', data);

        if (data.status === 'success') {
            const complaints = data.data.items || [];
            console.log('Complaints loaded:', complaints.length);
            renderComplaintsTable(complaints);
        } else {
            console.error('API error:', data.message);
            var tbody = document.querySelector('.complaints-table tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#c00;">Failed to load complaints: ' + escapeHtml(data.message) + '</td></tr>';
            }
        }
    } catch (err) {
        console.error('Load error:', err);
        var tbody = document.querySelector('.complaints-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#c00;">Error loading complaints: ' + escapeHtml(err.message) + '</td></tr>';
        }
    }
}

function renderComplaintsTable(complaints) {
    var tbody = document.querySelector('.complaints-table tbody');
    if (!tbody) return;

    if (complaints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">No complaints filed yet. Click "File New Complaint" to get started.</td></tr>';
        return;
    }

    var rows = complaints.map(function(c) {
        var statusClass = c.status.toLowerCase().replace(' ', '-');
        var priorityClass = c.priority.toLowerCase();
        var date = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        
        // Check if complaint has image attachments
        var hasImage = c.attachments && c.attachments.some(function(att) {
            return att.file_type && att.file_type.startsWith('image/');
        });
        var firstImage = hasImage ? c.attachments.find(function(att) {
            return att.file_type && att.file_type.startsWith('image/');
        }) : null;
        
        var imageHtml = firstImage 
            ? '<img src="/uploads/' + (firstImage.file_path || firstImage.file_name) + '" alt="Attachment" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;transition:transform 0.2s;" onerror="this.style.display=\'none\';" data-image-url="/uploads/' + (firstImage.file_path || firstImage.file_name) + '" class="complaint-image">' 
            : '<span style="color:#999;font-size:0.8rem;">No image</span>';
        
        return '<tr>' +
            '<td>' + escapeHtml(c.complaint_number) + '</td>' +
            '<td>' + escapeHtml(c.complaint_title) + '</td>' +
            '<td>' + escapeHtml(c.category_name || '-') + '</td>' +
            '<td><span class="status-badge status-' + statusClass + '">' + escapeHtml(c.status) + '</span></td>' +
            '<td><span class="priority-badge priority-' + priorityClass + '">' + escapeHtml(c.priority) + '</span></td>' +
            '<td>' + imageHtml + '</td>' +
            '<td>' + escapeHtml(date) + '</td>' +
            '<td><a href="complaint-details.html?id=' + c.complaint_id + '" style="padding:4px 12px;border:2px solid #003087;color:#003087;border-radius:6px;font-size:0.8rem;text-decoration:none;">View</a></td>' +
            '</tr>';
    }).join('');

    tbody.innerHTML = rows;
    
    // Add event listeners for complaint images
    tbody.querySelectorAll('.complaint-image').forEach(function(img) {
        img.addEventListener('click', function() {
            var imageUrl = this.getAttribute('data-image-url');
            if (imageUrl) {
                window.open(imageUrl, '_blank');
            }
        });
        img.addEventListener('mouseover', function() {
            this.style.transform = 'scale(1.1)';
        });
        img.addEventListener('mouseout', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

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

    const fileComplaintBtn = document.getElementById('fileComplaintBtn');
    if (fileComplaintBtn) {
        fileComplaintBtn.addEventListener('click', function() {
            window.location.href = 'new-complaint.html';
        });
    }
});
