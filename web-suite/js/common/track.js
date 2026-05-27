// Track complaint functionality
var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    const trackForm = document.getElementById('trackForm');
    const complaintInput = document.getElementById('complaintNumber');
    const resultContainer = document.getElementById('resultContainer');

    // Handle quick search chips
    document.querySelectorAll('.chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            const complaintNum = this.getAttribute('data-complaint');
            if (complaintInput) {
                complaintInput.value = complaintNum;
                trackComplaint(complaintNum);
            }
        });
    });

    if (trackForm) {
        trackForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const complaintNumber = complaintInput.value.trim();
            if (!complaintNumber) {
                alert('Please enter a complaint number');
                return;
            }
            trackComplaint(complaintNumber);
        });
    }

    // Check for URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlNumber = urlParams.get('number');
    if (urlNumber && complaintInput) {
        complaintInput.value = urlNumber;
        trackComplaint(urlNumber);
    }

    // Load user info if logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameEl = document.getElementById('userName');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    }
});

async function trackComplaint(complaintNumber) {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const res = await fetch(API_URL + '/complaints/track/' + encodeURIComponent(complaintNumber), {
            headers: headers
        });
        const data = await res.json();

        if (data.status === 'success') {
            renderTrackResult(data.data);
        } else {
            alert('Complaint not found: ' + (data.message || 'Invalid complaint number'));
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Failed to track complaint. Please try again.');
    }
}

function renderTrackResult(data) {
    var complaint = data.complaint;
    var history = data.history || [];

    var resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    // Show the result container
    resultContainer.style.display = 'block';

    // Status class mapping
    var statusClassMap = {
        'Pending': 'status-pending',
        'In Progress': 'status-progress',
        'Resolved': 'status-resolved',
        'Closed': 'status-closed',
        'Rejected': 'status-pending',
        'Pending Approval': 'status-pending-approval'
    };
    var statusClass = statusClassMap[complaint.status] || 'status-pending';

    // Format date
    var filedDate = new Date(complaint.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    // Build timeline HTML
    var timelineHtml = '';

    // First item - Complaint Filed
    timelineHtml += '<div class="timeline-item completed">' +
        '<div class="timeline-marker"></div>' +
        '<div class="timeline-content">' +
        '<p>Complaint Filed</p>' +
        '<span>' + filedDate + '</span>' +
        '</div>' +
        '</div>';

    // Add history items
    if (history.length > 0) {
        history.forEach(function(h) {
            var changeDate = new Date(h.changed_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            timelineHtml += '<div class="timeline-item completed">' +
                '<div class="timeline-marker"></div>' +
                '<div class="timeline-content">' +
                '<p>Status Changed: ' + h.previous_status + ' → ' + h.new_status + '</p>' +
                '<span>' + changeDate + '</span>' +
                (h.change_reason ? '<span class="timeline-by">Reason: ' + h.change_reason + '</span>' : '') +
                '</div>' +
                '</div>';
        });
    }

    // Render the complaint details
    resultContainer.innerHTML =
        '<div class="complaint-header">' +
        '<div class="complaint-header-content" style="width:100%;">' +
        '<h2 id="complaintTitle">' + (complaint.complaint_title || 'N/A') + '</h2>' +
        '<div class="complaint-status" style="margin-top:10px;">' +
        '<span class="status-badge ' + statusClass + '">' + complaint.status + '</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="complaint-details">' +
        '<div class="detail-row">' +
        '<div class="detail-label">Complaint Number:</div>' +
        '<div class="detail-value" id="complaintId">' + (complaint.complaint_number || 'N/A') + '</div>' +
        '</div>' +
        '<div class="detail-row">' +
        '<div class="detail-label">Category:</div>' +
        '<div class="detail-value" id="category">' + (complaint.category_name || 'N/A') + '</div>' +
        '</div>' +
        '<div class="detail-row">' +
        '<div class="detail-label">Department:</div>' +
        '<div class="detail-value" id="department">' + (complaint.department_name || 'N/A') + '</div>' +
        '</div>' +
        '<div class="detail-row">' +
        '<div class="detail-label">Filed Date:</div>' +
        '<div class="detail-value" id="filedDate">' + filedDate + '</div>' +
        '</div>' +
        '<div class="detail-row">' +
        '<div class="detail-label">Location:</div>' +
        '<div class="detail-value" id="location">' + (complaint.location || 'N/A') + '</div>' +
        '</div>' +
        '<div class="detail-row">' +
        '<div class="detail-label">Priority:</div>' +
        '<div class="detail-value" id="priority">' + (complaint.priority || 'Medium') + '</div>' +
        '</div>' +
        (complaint.officer_name ? '<div class="detail-row"><div class="detail-label">Assigned Officer:</div><div class="detail-value">' + complaint.officer_name + '</div></div>' : '') +
        '</div>' +
        '<div class="timeline">' +
        '<h3 style="margin-bottom:20px;color:#003087;">Complaint Timeline</h3>' +
        timelineHtml +
        '</div>';

    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('auth.html');
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
});
