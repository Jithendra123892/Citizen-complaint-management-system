document.addEventListener('DOMContentLoaded', function() {
    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';

    var user = JSON.parse(localStorage.getItem('user') || '{}');
    var token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }
    if (user.type !== 'Officer') {
        // Redirect to appropriate dashboard
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    document.getElementById('officerName').textContent = user.name || 'Officer';
    loadMyComplaints();
});

// HTML escape function to prevent XSS
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getToken() { return localStorage.getItem('token'); }

async function loadMyComplaints() {
    try {
        var token = getToken();
        var user = JSON.parse(localStorage.getItem('user') || '{}');

        // Fetch complaints - backend will filter based on user's referenceId for Officers
        var res = await fetch(API_URL + '/complaints?limit=100', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        var data = await res.json();
        if (data.status === 'success') {
            var items = data.data.items || [];
            var tbody = document.getElementById('complaintsTableBody');

            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#888;">No complaints assigned to you yet.</td></tr>';
                return;
            }

            tbody.innerHTML = items.map(function(c) {
                var sc = 'status-' + c.status.toLowerCase().replace(/\s+/g, '-');
                var pc = 'priority-' + c.priority.toLowerCase();
                var dt = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                
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
                    '<td>' + escapeHtml(c.complaint_number || '#'+c.complaint_id) + '</td>' +
                    '<td>' + escapeHtml(c.complaint_title || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(c.citizen_name || '-') + '</td>' +
                    '<td>' + escapeHtml(c.category_name || '-') + '</td>' +
                    '<td><span class="status-badge ' + pc + '">' + escapeHtml(c.priority) + '</span></td>' +
                    '<td>' + imageHtml + '</td>' +
                    '<td><span class="status-badge ' + sc + '">' + escapeHtml(c.status) + '</span></td>' +
                    '<td>' + dt + '</td>' +
                    '<td><button class="btn btn-outline btn-sm view-btn" data-id="' + c.complaint_id + '">View & Update</button></td>' +
                    '</tr>';
            }).join('');

            // Add event listeners to view buttons
            tbody.querySelectorAll('.view-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var complaintId = this.getAttribute('data-id');
                    window.viewComplaint(parseInt(complaintId));
                });
            });
            
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
        } else {
            document.getElementById('complaintsTableBody').innerHTML =
                '<tr><td colspan="9" style="text-align:center;padding:30px;color:#c00;">Failed to load complaints</td></tr>';
        }
    } catch (err) {
        console.error('Load error:', err);
        document.getElementById('complaintsTableBody').innerHTML =
            '<tr><td colspan="9" style="text-align:center;padding:30px;color:#c00;">Error loading complaints</td></tr>';
    }
}

async function viewComplaint(id) {
    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints/' + id, { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (data.status === 'success') {
            showComplaintModal(data.data);
        }
    } catch (err) { console.error('Detail error:', err); }
}

// Expose to global scope for event listeners
window.viewComplaint = viewComplaint;

function showComplaintModal(d) {
    var c = d.complaint;
    var history = d.history || [];
    var attachments = d.attachments || [];
    document.getElementById('modalTitle').textContent = c.complaint_number + ' - ' + c.complaint_title;

    var validTransitions = {
        'Pending': ['In Progress', 'Rejected'],
        'In Progress': ['Pending Approval', 'Pending', 'Rejected'],
        'Pending Approval': ['In Progress'],
        'Resolved': ['Closed'],
        'Rejected': [],
        'Closed': []
    };
    var transitions = validTransitions[c.status] || [];
    var statusOptions = transitions.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');

    var timelineHtml = history.map(function(h) {
        return '<div class="timeline-item">' +
            '<div class="tl-status">' + h.new_status + '</div>' +
            '<div class="tl-date">' + new Date(h.changed_at).toLocaleString('en-IN') + '</div>' +
            (h.change_reason ? '<div class="tl-reason">' + h.change_reason + '</div>' : '') +
            '</div>';
    }).join('');

    // Display attachments - separate citizen and officer proof attachments
    var attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
        var citizenAttachments = attachments.filter(function(a) { return !a.attachment_type || a.attachment_type === 'citizen'; });
        var officerProofAttachments = attachments.filter(function(a) { return a.attachment_type === 'officer_proof'; });
        
        // Display citizen attachments
        if (citizenAttachments.length > 0) {
            attachmentsHtml = '<div class="attachments-section"><h3>Citizen Attachments</h3><div class="attachments-grid">' +
                citizenAttachments.map(function(a, index) {
                    var isImage = a.file_type && a.file_type.startsWith('image/');
                    var fileUrl = '/uploads/' + (a.file_path || a.file_name);
                    return '<div class="attachment-item attachment-img-item" data-url="' + fileUrl + '" data-index="' + index + '">' +
                        (isImage ? '<img src="' + fileUrl + '" alt="' + escapeHtml(a.file_name) + '" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>\';">' : '<div class="file-icon">📄</div>') +
                        '<div class="attachment-info"><span class="attachment-name">' + escapeHtml(a.file_name) + '</span><span class="attachment-size">' + formatFileSize(a.file_size) + '</span></div>' +
                        '</div>';
                }).join('') +
                '</div></div>';
        }
        
        // Display officer proof attachments
        if (officerProofAttachments.length > 0) {
            attachmentsHtml += '<div class="attachments-section"><h3>Your Proof Attachments</h3><div class="attachments-grid">' +
                officerProofAttachments.map(function(a, index) {
                    var isImage = a.file_type && a.file_type.startsWith('image/');
                    var fileUrl = '/uploads/' + (a.file_path || a.file_name);
                    return '<div class="attachment-item attachment-img-item" data-url="' + fileUrl + '" data-index="' + index + '">' +
                        (isImage ? '<img src="' + fileUrl + '" alt="' + escapeHtml(a.file_name) + '" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>\';">' : '<div class="file-icon">📄</div>') +
                        '<div class="attachment-info"><span class="attachment-name">' + escapeHtml(a.file_name) + '</span><span class="attachment-size">' + formatFileSize(a.file_size) + '</span></div>' +
                        '</div>';
                }).join('') +
                '</div></div>';
        }
    }

    // Proof submission section for In Progress status
    var proofSection = '';
    if (c.status === 'In Progress') {
        proofSection = '<div class="proof-section">' +
            '<h3>Submit Proof of Resolution</h3>' +
            '<div class="form-group">' +
                '<label for="proofDescription">Description of work completed *</label>' +
                '<textarea id="proofDescription" placeholder="Describe the work completed, materials used, and any other relevant details..." required></textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label for="proofFiles">Upload proof images (optional)</label>' +
                '<input type="file" id="proofFiles" multiple accept="image/*">' +
                '<div id="proofFilesPreview" class="files-preview"></div>' +
            '</div>' +
            '<button class="btn btn-primary" data-id="' + c.complaint_id + '" id="submitProofBtn">Submit Proof for Approval</button>' +
            '</div>';
    }

    // Approval status display
    var approvalStatusHtml = '';
    if (c.approval_status && c.approval_status !== 'Pending') {
        var approvalClass = c.approval_status === 'Approved' ? 'approval-approved' : 'approval-rejected';
        approvalStatusHtml = '<div class="approval-status ' + approvalClass + '">' +
            '<strong>Approval Status:</strong> ' + c.approval_status +
            (c.rejection_reason ? '<br><span class="rejection-reason">Reason: ' + c.rejection_reason + '</span>' : '') +
            (c.approved_at ? '<br><small>On: ' + new Date(c.approved_at).toLocaleString('en-IN') + '</small>' : '') +
            '</div>';
    }

    document.getElementById('modalBody').innerHTML =
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Status</label><span class="status-badge status-' + c.status.toLowerCase().replace(' ', '-') + '">' + escapeHtml(c.status) + '</span></div>' +
            '<div class="detail-item"><label>Priority</label><span class="status-badge priority-' + c.priority.toLowerCase() + '">' + escapeHtml(c.priority) + '</span></div>' +
        '</div>' +
        approvalStatusHtml +
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Category</label><span>' + escapeHtml(c.category_name || '-') + '</span></div>' +
            '<div class="detail-item"><label>Department</label><span>' + escapeHtml(c.department_name || '-') + '</span></div>' +
        '</div>' +
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Citizen</label><span>' + escapeHtml(c.citizen_name || '-') + '</span></div>' +
            '<div class="detail-item"><label>Phone</label><span>' + escapeHtml(c.phone_number || '-') + '</span></div>' +
        '</div>' +
        '<div class="detail-row">' +
            '<div class="detail-item"><label>Location</label><span>' + escapeHtml(c.location || '-') + '</span></div>' +
            '<div class="detail-item"><label>Filed On</label><span>' + new Date(c.created_at).toLocaleDateString('en-IN') + '</span></div>' +
        '</div>' +
        '<div class="detail-full"><label>Description</label><p>' + escapeHtml(c.complaint_description) + '</p></div>' +
        attachmentsHtml +
        proofSection +
        (transitions.length > 0 && c.status !== 'Pending Approval' ?
            '<div class="status-update">' +
                '<h3>Update Status</h3>' +
                '<select id="newStatus"><option value="">-- Select New Status --</option>' + statusOptions + '</select>' +
                '<textarea id="updateReason" placeholder="Reason for status change..."></textarea>' +
                '<button class="btn btn-primary" data-id="' + c.complaint_id + '" data-current-status="' + c.status + '" id="updateStatusBtn">Update Status</button>' +
            '</div>' :
            c.status === 'Pending Approval' ?
            '<div class="status-update"><h3>⏳ Waiting for Department Admin Approval</h3><p>Your proof is being reviewed. You will be notified once approved or if any changes are needed.</p></div>' :
            '<div class="status-update"><h3>No further status transitions available</h3></div>'
        ) +
        (history.length > 0 ? '<div class="timeline"><h3>Status History</h3>' + timelineHtml + '</div>' : '');

    document.getElementById('complaintModal').classList.add('active');

    // Add event listeners for modal buttons
    var submitProofBtn = document.getElementById('submitProofBtn');
    if (submitProofBtn) {
        submitProofBtn.addEventListener('click', function() {
            var complaintId = parseInt(this.getAttribute('data-id'));
            window.submitProof(complaintId);
        });
    }

    // Add event listeners to attachment items
    var attachmentItems = document.querySelectorAll('.attachment-img-item');
    attachmentItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var fileUrl = this.getAttribute('data-url');
            window.open(fileUrl);
        });
    });

    var updateStatusBtn = document.getElementById('updateStatusBtn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', function() {
            var complaintId = parseInt(this.getAttribute('data-id'));
            var currentStatus = this.getAttribute('data-current-status');
            window.updateStatus(complaintId, currentStatus);
        });
    }

    var proofFiles = document.getElementById('proofFiles');
    if (proofFiles) {
        proofFiles.addEventListener('change', function() {
            window.handleProofFiles(this);
        });
    }
}

var selectedProofFiles = [];

function handleProofFiles(input) {
    selectedProofFiles = Array.from(input.files);
    var preview = document.getElementById('proofFilesPreview');
    preview.innerHTML = selectedProofFiles.map(function(file, index) {
        return '<div class="file-preview-item">' +
            '<span>' + escapeHtml(file.name) + ' (' + formatFileSize(file.size) + ')</span>' +
            '<button type="button" class="remove-proof-btn" data-index="' + index + '">&times;</button>' +
            '</div>';
    }).join('');

    // Add event listeners to remove buttons
    preview.querySelectorAll('.remove-proof-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            window.removeProofFile(index);
        });
    });
}

// Expose to global scope for event listeners
window.handleProofFiles = handleProofFiles;

function removeProofFile(index) {
    selectedProofFiles.splice(index, 1);
    var input = document.getElementById('proofFiles');
    var preview = document.getElementById('proofFilesPreview');
    preview.innerHTML = selectedProofFiles.map(function(file, i) {
        return '<div class="file-preview-item">' +
            '<span>' + escapeHtml(file.name) + ' (' + formatFileSize(file.size) + ')</span>' +
            '<button type="button" class="remove-proof-btn" data-index="' + i + '">&times;</button>' +
            '</div>';
    }).join('');

    // Add event listeners to remove buttons
    preview.querySelectorAll('.remove-proof-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var idx = parseInt(this.getAttribute('data-index'));
            window.removeProofFile(idx);
        });
    });
}

// Expose to global scope for event listeners
window.removeProofFile = removeProofFile;

async function submitProof(complaintId) {
    var proofDescription = document.getElementById('proofDescription').value;
    if (!proofDescription || proofDescription.trim().length < 10) {
        alert('Please provide a description of the work completed (at least 10 characters)');
        return;
    }

    try {
        var token = getToken();

        // Upload proof files first
        var attachmentIds = [];
        if (selectedProofFiles.length > 0) {
            var formData = new FormData();
            selectedProofFiles.forEach(function(file) {
                formData.append('files', file);
            });

            var uploadRes = await fetch(API_URL + '/upload/' + complaintId, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });

            var uploadData = await uploadRes.json();
            if (uploadData.status === 'success') {
                attachmentIds = uploadData.data.files.map(function(f) { return f.id; });
            }
        }

        // Submit proof
        var res = await fetch(API_URL + '/complaints/' + complaintId + '/proof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                proofDescription: proofDescription,
                attachmentIds: attachmentIds
            })
        });

        var data = await res.json();
        if (data.status === 'success') {
            alert('Proof submitted successfully! Waiting for department admin approval.');
            closeModal();
            loadMyComplaints();
        } else {
            alert('Failed: ' + data.message);
        }
    } catch (err) {
        console.error('Submit proof error:', err);
        alert('Failed to submit proof');
    }
}

// Expose to global scope for event listeners
window.submitProof = submitProof;

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function updateStatus(id, currentStatus) {
    var newStatus = document.getElementById('newStatus').value;
    var reason = document.getElementById('updateReason').value;
    if (!newStatus) { alert('Please select a status'); return; }

    try {
        var token = getToken();
        var res = await fetch(API_URL + '/complaints/' + id + '/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ status: newStatus, changeReason: reason })
        });
        var data = await res.json();
        if (data.status === 'success') {
            alert('Status updated to ' + newStatus);
            closeModal();
            loadMyComplaints();
        } else {
            alert('Failed: ' + data.message);
        }
    } catch (err) { console.error('Update error:', err); alert('Failed to update'); }
}

// Expose to global scope for event listeners
window.updateStatus = updateStatus;

function closeModal() { document.getElementById('complaintModal').classList.remove('active'); }

// Expose to global scope for event listeners
window.closeModal = closeModal;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', window.closeModal);
    }
});
