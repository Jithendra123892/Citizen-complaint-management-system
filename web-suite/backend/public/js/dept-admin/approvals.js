var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    var user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.type !== 'DeptAdmin') { window.location.replace('../auth.html'); return; }
    document.getElementById('adminName').textContent = user.name || 'Admin';
    loadPendingApprovals();
});

function getToken() { return localStorage.getItem('token'); }

async function loadPendingApprovals() {
    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints?limit=100', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (data.status === 'success') {
            var items = (data.data.items || []).filter(function(c) { return c.status === 'Pending Approval'; });
            document.getElementById('pendingCount').textContent = items.length + ' Pending';
            var tbody = document.getElementById('approvalsTableBody');
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">No complaints pending approval.</td></tr>';
                return;
            }
            tbody.innerHTML = items.map(function(c) {
                var pc = 'priority-' + c.priority.toLowerCase();
                var dt = new Date(c.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                return '<tr>' +
                    '<td>' + c.complaint_number + '</td>' +
                    '<td>' + c.complaint_title + '</td>' +
                    '<td>' + (c.officer_name || '-') + '</td>' +
                    '<td>' + (c.category_name || '-') + '</td>' +
                    '<td><span class="status-badge ' + pc + '">' + c.priority + '</span></td>' +
                    '<td>' + dt + '</td>' +
                    '<td><button class="btn btn-primary btn-sm review-btn" data-id="' + c.complaint_id + '">Review</button></td>' +
                    '</tr>';
            }).join('');
            
            // Add event listeners to review buttons
            var reviewButtons = document.querySelectorAll('.review-btn');
            reviewButtons.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var complaintId = this.getAttribute('data-id');
                    reviewProof(parseInt(complaintId));
                });
            });
        }
    } catch (err) { console.error('Load error:', err); }
}

async function reviewProof(complaintId) {
    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints/' + complaintId, { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (data.status === 'success') {
            showApprovalModal(data.data);
        }
    } catch (err) { console.error('Detail error:', err); }
}

function showApprovalModal(d) {
    var c = d.complaint;
    var attachments = d.attachments || [];
    document.getElementById('modalTitle').textContent = 'Review Proof - ' + c.complaint_number;

    var attachmentsHtml = '';
    if (attachments.length > 0) {
        attachmentsHtml = '<div class="proof-attachments">' +
            attachments.map(function(a, index) {
                var isImage = a.file_type && a.file_type.startsWith('image/');
                var fileUrl = '/uploads/' + a.file_path;
                return '<div class="proof-attachment proof-attachment-item" data-url="' + fileUrl + '" data-index="' + index + '">' +
                    (isImage ? '<img src="' + fileUrl + '" alt="' + a.file_name + '">' : '<div style="padding:20px;text-align:center;">📄</div>') +
                    '<div class="file-name">' + a.file_name + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';
    } else {
        attachmentsHtml = '<p style="color:#888;font-style:italic;">No attachments submitted</p>';
    }

    document.getElementById('modalBody').innerHTML =
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Complaint</label><span>' + c.complaint_title + '</span></div>' +
            '<div class="detail-item"><label>Category</label><span>' + (c.category_name || '-') + '</span></div>' +
        '</div>' +
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Officer</label><span>' + (c.officer_name || '-') + '</span></div>' +
            '<div class="detail-item"><label>Priority</label><span>' + c.priority + '</span></div>' +
        '</div>' +
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Citizen</label><span>' + (c.citizen_name || '-') + '</span></div>' +
            '<div class="detail-item"><label>Location</label><span>' + (c.location || '-') + '</span></div>' +
        '</div>' +
        '<div class="detail-full"><label>Original Description</label><p>' + c.complaint_description + '</p></div>' +
        '<div class="proof-section">' +
            '<h3>Proof of Resolution</h3>' +
            '<div class="proof-description">' + (c.proof_description || 'No description provided') + '</div>' +
            attachmentsHtml +
        '</div>' +
        '<div class="approval-actions">' +
            '<h3>Review Decision</h3>' +
            '<textarea id="reviewReason" placeholder="Enter reason for approval or rejection (optional)..."></textarea>' +
            '<div class="buttons">' +
                '<button class="btn btn-green approve-btn" data-id="' + c.complaint_id + '">✓ Approve</button>' +
                '<button class="btn btn-red reject-btn" data-id="' + c.complaint_id + '">✗ Reject</button>' +
            '</div>' +
        '</div>';

    document.getElementById('approvalModal').classList.add('active');
    
    // Add event listeners to approve and reject buttons
    const approveBtn = document.querySelector('.approve-btn');
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            approveProof(parseInt(complaintId));
        });
    }
    
    const rejectBtn = document.querySelector('.reject-btn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            rejectProof(parseInt(complaintId));
        });
    }
    
    // Add event listeners to attachment items
    const attachmentItems = document.querySelectorAll('.proof-attachment-item');
    attachmentItems.forEach(item => {
        item.addEventListener('click', function() {
            const fileUrl = this.getAttribute('data-url');
            window.open(fileUrl);
        });
    });
}

async function approveProof(complaintId) {
    var reason = document.getElementById('reviewReason').value;
    if (!confirm('Are you sure you want to approve this proof? This will mark the complaint as resolved.')) {
        return;
    }

    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints/' + complaintId + '/approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'approve', reason: reason || undefined })
        });
        var data = await res.json();
        if (data.status === 'success') {
            alert('Proof approved! Complaint marked as resolved.');
            closeModal();
            loadPendingApprovals();
        } else {
            alert('Failed: ' + data.message);
        }
    } catch (err) { console.error('Approve error:', err); alert('Failed to approve'); }
}

async function rejectProof(complaintId) {
    var reason = document.getElementById('reviewReason').value;
    if (!reason || reason.trim().length < 5) {
        alert('Please provide a reason for rejection (at least 5 characters)');
        return;
    }

    if (!confirm('Are you sure you want to reject this proof? The complaint will be sent back to the officer for resubmission.')) {
        return;
    }

    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints/' + complaintId + '/approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'reject', reason: reason })
        });
        var data = await res.json();
        if (data.status === 'success') {
            alert('Proof rejected. Officer has been notified to resubmit.');
            closeModal();
            loadPendingApprovals();
        } else {
            alert('Failed: ' + data.message);
        }
    } catch (err) { console.error('Reject error:', err); alert('Failed to reject'); }
}

function closeModal() { document.getElementById('approvalModal').classList.remove('active'); }

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../dept-admin/dashboard.html');
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

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', window.closeModal);
    }
});
