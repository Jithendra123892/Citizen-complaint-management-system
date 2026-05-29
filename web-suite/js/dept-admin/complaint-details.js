var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

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

    if (!token) {
        window.location.replace('../auth.html');
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

// Load complaint details
async function loadComplaintDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    console.log('DEBUG - Loading complaint details, ID:', complaintId);
    console.log('DEBUG - Full URL:', window.location.href);

    if (!complaintId) {
        alert('Complaint ID not found');
        window.location.replace('../dept-admin/dashboard.html');
        return;
    }

    try {
        var token = localStorage.getItem('token');
        var apiUrl = API_BASE + '/complaints/' + complaintId;
        console.log('DEBUG - Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('DEBUG - Response status:', response.status);
        console.log('DEBUG - Response OK:', response.ok);

        if (!response.ok) {
            throw new Error('Failed to load complaint details');
        }

        const data = await response.json();
        const complaint = data.data.complaint;
        const attachments = data.data.attachments || [];

        // Merge attachments into complaint object for display
        complaint.attachments = attachments;

        // Display complaint details
        displayComplaintDetails(complaint);

        // Load status history
        loadStatusHistory(complaintId);

        // Store complaint ID for status update
        window.currentComplaintId = complaintId;
        window.currentStatus = complaint.status;

        // Populate status dropdown (exclude current status)
        populateStatusDropdown(complaint.status);
    } catch (error) {
        console.error('Error loading complaint details:', error);
        alert('Failed to load complaint details: ' + error.message);
    }
}

// Display complaint details
function displayComplaintDetails(complaint) {
    document.getElementById('slaDisplay').textContent = `SLA: ${complaint.sla_hours || 72} hours remaining`;
    document.getElementById('complaintStatus').innerHTML = `<span class="status-badge status-${complaint.status.toLowerCase().replace(' ', '-')}">${escapeHtml(complaint.status)}</span>`;
    document.getElementById('complaintNumber').textContent = complaint.complaint_number || '-';
    document.getElementById('complaintTitle').textContent = complaint.complaint_title || '-';
    document.getElementById('complaintCategory').textContent = complaint.category_name || '-';
    document.getElementById('complaintPriority').textContent = complaint.priority || '-';
    document.getElementById('complaintLocation').textContent = complaint.location || '-';
    document.getElementById('complaintDescription').textContent = complaint.description || '-';
    
    const date = complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    document.getElementById('complaintDate').textContent = date;

    document.getElementById('citizenName').textContent = complaint.citizen_name || '-';
    document.getElementById('citizenPhone').textContent = complaint.phone || '-';
    document.getElementById('citizenEmail').textContent = complaint.email || '-';
    document.getElementById('citizenAddress').textContent = complaint.address || '-';

    document.getElementById('departmentName').textContent = complaint.department_name || '-';
    document.getElementById('assignedOfficer').textContent = complaint.officer_name || 'Unassigned';

    // Display attachments if present
    console.log('DEBUG - All attachments:', complaint.attachments);
    console.log('DEBUG - Attachments count:', complaint.attachments ? complaint.attachments.length : 0);
    
    if (complaint.attachments && complaint.attachments.length > 0) {
        // Filter attachments - include those with NULL attachment_type or 'citizen'
        const citizenAttachments = complaint.attachments.filter(att => {
            const isCitizen = !att.attachment_type || att.attachment_type === 'citizen' || att.attachment_type === null;
            console.log('DEBUG - Attachment:', att.file_name, 'Type:', att.attachment_type, 'Is citizen:', isCitizen);
            return isCitizen;
        });
        const officerProofAttachments = complaint.attachments.filter(att => att.attachment_type === 'officer_proof');
        
        console.log('DEBUG - Citizen attachments count:', citizenAttachments.length);
        console.log('DEBUG - Officer proof attachments count:', officerProofAttachments.length);
        
        // Display citizen attachments
        if (citizenAttachments.length > 0) {
            const attachmentsGrid = document.getElementById('attachmentsGrid');
            if (attachmentsGrid) {
                attachmentsGrid.innerHTML = citizenAttachments.map(att => `
                    <div class="attachment-item">
                        ${(att.file_type && att.file_type.startsWith('image/')) 
                            ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${escapeHtml(att.file_name || att.original_name)}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';" data-image-url="/uploads/${att.file_path || att.file_name}" class="attachment-image">` 
                            : '<div class="attachment-icon">📎</div>'}
                        <div class="attachment-info"><span class="attachment-name">${escapeHtml(att.file_name || att.original_name || 'Attachment')}</span></div>
                        <a href="/uploads/${att.file_path || att.file_name}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">Download</a>
                    </div>
                `).join('');
                document.getElementById('attachmentsCard').style.display = 'block';
                console.log('DEBUG - Citizen attachments card displayed');
                
                // Add event listeners for attachment images
                attachmentsGrid.querySelectorAll('.attachment-image').forEach(img => {
                    img.addEventListener('click', function() {
                        const imageUrl = this.getAttribute('data-image-url');
                        if (imageUrl) {
                            window.open(imageUrl, '_blank');
                        }
                    });
                });
            } else {
                console.log('DEBUG - attachmentsGrid element not found');
            }
        } else {
            console.log('DEBUG - No citizen attachments found, showing all attachments as fallback');
            // Fallback: show all attachments if no citizen attachments found
            const attachmentsGrid = document.getElementById('attachmentsGrid');
            if (attachmentsGrid) {
                attachmentsGrid.innerHTML = complaint.attachments.map(att => `
                    <div class="attachment-item">
                        ${(att.file_type && att.file_type.startsWith('image/')) 
                            ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${escapeHtml(att.file_name || att.original_name)}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';" data-image-url="/uploads/${att.file_path || att.file_name}" class="attachment-image">` 
                            : '<div class="attachment-icon">📎</div>'}
                        <div class="attachment-info"><span class="attachment-name">${escapeHtml(att.file_name || att.original_name || 'Attachment')}</span> <small style="color:#666;">(Type: ${escapeHtml(att.attachment_type || 'N/A')})</small></div>
                        <a href="/uploads/${att.file_path || att.file_name}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">Download</a>
                    </div>
                `).join('');
                document.getElementById('attachmentsCard').style.display = 'block';
                console.log('DEBUG - All attachments displayed as fallback');
                
                // Add event listeners for attachment images
                attachmentsGrid.querySelectorAll('.attachment-image').forEach(img => {
                    img.addEventListener('click', function() {
                        const imageUrl = this.getAttribute('data-image-url');
                        if (imageUrl) {
                            window.open(imageUrl, '_blank');
                        }
                    });
                });
            }
        }
        
        // Display officer proof attachments
        if (officerProofAttachments.length > 0) {
            const proofAttachmentsGrid = document.getElementById('proofAttachmentsGrid');
            if (proofAttachmentsGrid) {
                proofAttachmentsGrid.innerHTML = officerProofAttachments.map(att => `
                    <div class="attachment-item">
                        ${(att.file_type && att.file_type.startsWith('image/')) 
                            ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${escapeHtml(att.file_name || att.original_name)}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';" data-image-url="/uploads/${att.file_path || att.file_name}" class="attachment-image">` 
                            : '<div class="attachment-icon">📎</div>'}
                        <div class="attachment-info"><span class="attachment-name">${escapeHtml(att.file_name || att.original_name || 'Attachment')}</span></div>
                        <a href="/uploads/${att.file_path || att.file_name}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">Download</a>
                    </div>
                `).join('');
                document.getElementById('proofAttachmentsCard').style.display = 'block';
                console.log('DEBUG - Officer proof attachments card displayed');
                
                // Add event listeners for attachment images
                proofAttachmentsGrid.querySelectorAll('.attachment-image').forEach(img => {
                    img.addEventListener('click', function() {
                        const imageUrl = this.getAttribute('data-image-url');
                        if (imageUrl) {
                            window.open(imageUrl, '_blank');
                        }
                    });
                });
            } else {
                console.log('DEBUG - proofAttachmentsGrid element not found');
            }
        } else {
            console.log('DEBUG - No officer proof attachments found');
        }
    } else {
        console.log('DEBUG - No attachments at all');
    }

    // Display proof submission if present
    if (complaint.proof_submitted) {
        console.log('DEBUG - Proof submitted:', complaint.proof_submitted);
        console.log('DEBUG - Proof description:', complaint.proof_description);
        console.log('DEBUG - Approval status:', complaint.approval_status);
        console.log('DEBUG - Attachments:', complaint.attachments);
        
        const proofCard = document.getElementById('proofCard');
        if (proofCard) {
            proofCard.style.display = 'block';
            document.getElementById('proofDescription').textContent = complaint.proof_description || 'No description provided';
            document.getElementById('proofStatus').textContent = complaint.approval_status || 'Pending';
            
            // Show approve/reject buttons if status is Pending
            if (complaint.approval_status === 'Pending') {
                document.getElementById('approveBtn').style.display = 'inline-block';
                document.getElementById('rejectBtn').style.display = 'inline-block';
                document.getElementById('proofActions').style.display = 'block';
            } else {
                document.getElementById('approveBtn').style.display = 'none';
                document.getElementById('rejectBtn').style.display = 'none';
                document.getElementById('proofActions').style.display = 'none';
            }

            // Display proof attachments if present
            if (complaint.attachments && complaint.attachments.length > 0) {
                const proofAttachmentsGrid = document.getElementById('proofAttachmentsGrid');
                if (proofAttachmentsGrid) {
                    proofAttachmentsGrid.innerHTML = complaint.attachments.map((att, index) => `
                        <div class="attachment-item attachment-img-item" data-url="/uploads/${att.file_path || att.file_name}" data-index="${index}">
                            ${(att.file_type && att.file_type.startsWith('image/')) 
                                ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${escapeHtml(att.file_name || att.original_name)}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';">` 
                                : '<div class="attachment-icon">📎</div>'}
                            <div class="attachment-info"><span class="attachment-name">${escapeHtml(att.file_name || att.original_name || 'Attachment')}</span></div>
                            <a href="/uploads/${att.file_path || att.file_name}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.75rem;">Download</a>
                        </div>
                    `).join('');
                    document.getElementById('proofAttachmentsCard').style.display = 'block';
                    
                    // Add event listeners to attachment items
                    const attachmentItems = document.querySelectorAll('.attachment-img-item');
                    attachmentItems.forEach(item => {
                        item.addEventListener('click', function() {
                            const fileUrl = this.getAttribute('data-url');
                            window.open(fileUrl);
                        });
                    });
                }
            }
        }
    }
}

// Load status history
async function loadStatusHistory(complaintId) {
    try {
        console.log('DEBUG - Loading status history for complaintId:', complaintId);
        const token = localStorage.getItem('token');
        var url = API_BASE + '/complaints/' + complaintId;
        console.log('DEBUG - Fetching from URL:', url);

        var response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('DEBUG - Response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to load complaint details');
        }

        const data = await response.json();
        console.log('DEBUG - Response data:', data);
        console.log('DEBUG - Response data structure:', JSON.stringify(data, null, 2));
        const history = data.data.history || [];
        const complaint = data.data.complaint || {};
        const attachments = data.data.attachments || [];
        
        console.log('DEBUG - Complaint from status history load:', complaint);
        console.log('DEBUG - Attachments from status history load:', attachments);

        const timeline = document.getElementById('statusTimeline');
        
        if (!timeline) return;
        
        if (history.length === 0) {
            timeline.innerHTML = '<p>No status history available</p>';
            return;
        }

        timeline.innerHTML = history.map(h => `
            <div class="timeline-item">
                <div class="timeline-date">${new Date(h.changed_at).toLocaleString('en-IN')}</div>
                <div class="timeline-content">
                    <div class="timeline-status">${escapeHtml(h.new_status)}</div>
                    ${h.change_reason ? `<div class="timeline-reason">Reason: ${escapeHtml(h.change_reason)}</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading status history:', error);
        const timeline = document.getElementById('statusTimeline');
        if (timeline) {
            timeline.innerHTML = '<p>Failed to load status history</p>';
        }
    }
}

// Populate status dropdown
function populateStatusDropdown(currentStatus) {
    const statusSelect = document.getElementById('updateStatus');
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed'];
    
    statusSelect.innerHTML = '<option value="">Select status</option>';
    validStatuses.filter(s => s !== currentStatus).forEach(status => {
        statusSelect.innerHTML += `<option value="${status}">${escapeHtml(status)}</option>`;
    });
}

// Update status
async function updateStatus() {
    const newStatus = document.getElementById('updateStatus').value;
    const reason = document.getElementById('updateReason').value;

    if (!newStatus) {
        alert('Please select a new status');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        var response = await fetch(API_BASE + '/dept-admin/complaints/' + window.currentComplaintId + '/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus, changeReason: reason })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Status updated successfully');
            // Reload complaint details
            loadComplaintDetails();
        } else {
            alert('Failed to update status: ' + (data.message || 'Unknown error'));
            console.error('Status update error:', data);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
}

// Approve proof
async function approveProof() {
    if (!confirm('Are you sure you want to approve this proof?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        var response = await fetch(API_BASE + '/complaints/' + window.currentComplaintId + '/approve', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'approve' })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Proof approved successfully');
            loadComplaintDetails();
        } else {
            alert('Failed to approve: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error approving proof:', error);
        alert('Error approving proof: ' + error.message);
    }
}

// Reject proof
async function rejectProof() {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || reason.trim().length === 0) {
        alert('Reason is required for rejection');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        var response = await fetch(API_BASE + '/complaints/' + window.currentComplaintId + '/approve', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'reject', reason: reason })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Proof rejected successfully');
            loadComplaintDetails();
        } else {
            alert('Failed to reject: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error rejecting proof:', error);
        alert('Error rejecting proof: ' + error.message);
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    const updateStatusBtn = document.getElementById('updateStatusBtn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', updateStatus);
    }

    const approveBtn = document.getElementById('approveBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', approveProof);
    }

    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', rejectProof);
    }

    // Load complaint details
    loadComplaintDetails();
});

// Expose functions to global scope
window.approveProof = approveProof;
window.rejectProof = rejectProof;
