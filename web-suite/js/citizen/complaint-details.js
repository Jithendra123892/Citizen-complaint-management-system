var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Get complaint ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    if (!complaintId) {
        alert('Complaint ID not provided');
        window.location.href = 'complaints.html';
        return;
    }

    loadComplaintDetails(complaintId, token);

    // Add print button event listener
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.print();
        });
    }
});

async function loadComplaintDetails(complaintId, token) {
    try {
        const res = await fetch(`${API_URL}/complaints/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.status === 'success') {
            const complaint = data.data.complaint;
            displayComplaintDetails(complaint);
            
            // Load and display status history
            if (data.data.history && data.data.history.length > 0) {
                displayStatusHistory(data.data.history, complaint.created_at);
            }
            
            // Handle attachments
            if (data.data.attachments && data.data.attachments.length > 0) {
                displayAttachments(data.data.attachments);
            } else if (complaint.attachments && complaint.attachments.length > 0) {
                displayAttachments(complaint.attachments);
            }
        } else {
            alert('Failed to load complaint details: ' + data.message);
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Failed to load complaint details');
    }
}

function displayComplaintDetails(complaint) {
    document.getElementById('complaintNumberDisplay').textContent = complaint.complaint_number;
    document.getElementById('complaintId').textContent = complaint.complaint_id;
    document.getElementById('complaintTitle').textContent = complaint.complaint_title;
    document.getElementById('statusBadge').textContent = complaint.status;
    document.getElementById('priority').textContent = complaint.priority;
    document.getElementById('category').textContent = complaint.category_name;
    document.getElementById('department').textContent = complaint.department_name;
    document.getElementById('description').textContent = complaint.complaint_description;
    document.getElementById('location').textContent = complaint.location;
    document.getElementById('filedDate').textContent = new Date(complaint.created_at).toLocaleString();
    document.getElementById('assignedOfficer').textContent = complaint.officer_name || 'Unassigned';
    
    if (complaint.resolved_at) {
        const resolvedEl = document.getElementById('resolvedDate');
        if (resolvedEl) {
            resolvedEl.textContent = new Date(complaint.resolved_at).toLocaleString();
        }
    }
}

function displayStatusHistory(history, complaintCreatedDate) {
    const timelineEl = document.getElementById('timeline');
    if (!timelineEl) return;
    
    timelineEl.innerHTML = '';
    
    // Add complaint filed item
    const filedDate = new Date(complaintCreatedDate);
    timelineEl.innerHTML += `
        <div class="timeline-item completed">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <p>Complaint Filed</p>
                <span>${filedDate.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    // Add status history items
    history.forEach(h => {
        const date = new Date(h.changed_at);
        timelineEl.innerHTML += `
            <div class="timeline-item completed">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <p>Status Changed: ${h.previous_status} → ${h.new_status}</p>
                    <span>${date.toLocaleString()}</span>
                    ${h.change_reason ? `<br><small>${h.change_reason}</small>` : ''}
                </div>
            </div>
        `;
    });
}

function displayAttachments(attachments) {
    const attachmentsContainer = document.getElementById('attachmentsContainer');
    if (!attachmentsContainer) return;
    
    if (!attachments || attachments.length === 0) {
        attachmentsContainer.innerHTML = '<p>No attachments</p>';
        return;
    }
    
    // Filter attachments by type
    const citizenAttachments = attachments.filter(att => !att.attachment_type || att.attachment_type === 'citizen');
    const officerProofAttachments = attachments.filter(att => att.attachment_type === 'officer_proof');
    
    let html = '';
    
    // Display citizen attachments
    if (citizenAttachments.length > 0) {
        html += '<div class="attachments-section"><h3>Your Attachments</h3><div class="attachments-grid">';
        html += citizenAttachments.map((att, index) => {
            const isImage = att.file_type && att.file_type.startsWith('image/');
            const fileUrl = `/uploads/${att.file_path || att.file_name}`;
            return `
                <div class="attachment-item attachment-img-item" data-url="${fileUrl}" data-index="${index}">
                    ${isImage 
                        ? `<img src="${fileUrl}" alt="${att.file_name}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';">` 
                        : '<div class="file-icon">📄</div>'}
                    <div class="attachment-info">
                        <span class="attachment-name">${att.file_name}</span>
                        <span class="attachment-size">${formatFileSize(att.file_size)}</span>
                    </div>
                </div>
            `;
        }).join('');
        html += '</div></div>';
    }
    
    // Display officer proof attachments
    if (officerProofAttachments.length > 0) {
        html += '<div class="attachments-section"><h3>Officer Proof Attachments</h3><div class="attachments-grid">';
        html += officerProofAttachments.map((att, index) => {
            const isImage = att.file_type && att.file_type.startsWith('image/');
            const fileUrl = `/uploads/${att.file_path || att.file_name}`;
            return `
                <div class="attachment-item attachment-img-item" data-url="${fileUrl}" data-index="${index}">
                    ${isImage 
                        ? `<img src="${fileUrl}" alt="${att.file_name}" style="max-width:100%;max-height:150px;object-fit:contain;cursor:pointer;border-radius:4px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'color:#c62828;padding:10px;\'>Image failed to load</div>';">` 
                        : '<div class="file-icon">📄</div>'}
                    <div class="attachment-info">
                        <span class="attachment-name">${att.file_name}</span>
                        <span class="attachment-size">${formatFileSize(att.file_size)}</span>
                    </div>
                </div>
            `;
        }).join('');
        html += '</div></div>';
    }
    
    attachmentsContainer.innerHTML = html;
    
    // Add event listeners to attachment items
    const attachmentItems = document.querySelectorAll('.attachment-img-item');
    attachmentItems.forEach(item => {
        item.addEventListener('click', function() {
            const fileUrl = this.getAttribute('data-url');
            window.open(fileUrl);
        });
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}
