document.addEventListener('DOMContentLoaded', function() {
    // Prevent redirect loops
    if (sessionStorage.getItem('redirecting') === 'true') {
        sessionStorage.removeItem('redirecting');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only Officers can access
    if (user.type !== 'Officer') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    loadComplaintDetails();
});

var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';

async function loadComplaintDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');
    
    if (!complaintId) {
        alert('Complaint ID not provided');
        window.location.replace('../officer/dashboard.html');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/complaints/' + complaintId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderComplaintDetails(data.data.complaint);
            
            // Handle attachments
            if (data.data.attachments && data.data.attachments.length > 0) {
                displayAttachments(data.data.attachments);
            } else if (data.data.complaint.attachments && data.data.complaint.attachments.length > 0) {
                displayAttachments(data.data.complaint.attachments);
            }
        }
    } catch (err) {
        console.error('Error loading complaint details:', err);
    }
}

function renderComplaintDetails(complaint) {
    // Populate complaint details
    if (document.getElementById('complaintId')) {
        document.getElementById('complaintId').textContent = complaint.complaint_number || complaint.complaint_id;
    }
    if (document.getElementById('complaintTitle')) {
        document.getElementById('complaintTitle').textContent = complaint.complaint_title;
    }
    if (document.getElementById('description')) {
        document.getElementById('description').textContent = complaint.complaint_description;
    }
    if (document.getElementById('statusBadge')) {
        document.getElementById('statusBadge').textContent = complaint.status;
    }
    if (document.getElementById('priority')) {
        document.getElementById('priority').textContent = complaint.priority;
    }
    if (document.getElementById('location')) {
        document.getElementById('location').textContent = complaint.location;
    }
    if (document.getElementById('category')) {
        document.getElementById('category').textContent = complaint.category_name;
    }
    if (document.getElementById('filedDate')) {
        document.getElementById('filedDate').textContent = new Date(complaint.created_at).toLocaleString();
    }
    
    // Citizen information
    if (document.getElementById('citizenName')) {
        document.getElementById('citizenName').textContent = complaint.citizen_name || 'N/A';
    }
    if (document.getElementById('citizenPhone')) {
        document.getElementById('citizenPhone').textContent = complaint.phone || 'N/A';
    }
    if (document.getElementById('citizenEmail')) {
        document.getElementById('citizenEmail').textContent = complaint.email || 'N/A';
    }
    if (document.getElementById('citizenAddress')) {
        document.getElementById('citizenAddress').textContent = complaint.address || 'N/A';
    }
}

function displayAttachments(attachments) {
    const attachmentsGrid = document.getElementById('attachmentsGrid');
    const attachmentsCard = document.getElementById('attachmentsCard');
    
    if (!attachmentsGrid || !attachmentsCard) return;
    
    if (attachments.length === 0) {
        attachmentsCard.style.display = 'none';
        return;
    }
    
    attachmentsCard.style.display = 'block';
    attachmentsGrid.innerHTML = attachments.map(att => `
        <div class="attachment-item">
            <div class="attachment-icon">📎</div>
            <div class="attachment-name">${att.file_name || att.original_name || 'Attachment'}</div>
            <a href="${att.file_path}" target="_blank" class="btn btn-sm btn-outline" style="margin-top:8px;font-size:0.75rem;">Download</a>
        </div>
    `).join('');
}

// Submit proof for approval
async function submitProof(e) {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');
    const proofDescription = document.getElementById('proofDescription').value.trim();
    const proofFiles = document.getElementById('proofFiles').files;
    
    if (!proofDescription) {
        alert('Please provide a proof description');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        // First upload files if any
        let attachmentIds = [];
        if (proofFiles.length > 0) {
            const formData = new FormData();
            for (let i = 0; i < proofFiles.length; i++) {
                formData.append('attachments', proofFiles[i]);
            }
            
            const uploadRes = await fetch(API_URL + '/upload/complaint/' + complaintId + '/proof', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            });
            
            const uploadData = await uploadRes.json();
            if (uploadData.status === 'success' && uploadData.data.attachments) {
                attachmentIds = uploadData.data.attachments.map(att => att.attachment_id);
            }
        }
        
        // Submit proof
        const res = await fetch(API_URL + '/complaints/' + complaintId + '/proof', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                proofDescription,
                attachmentIds
            })
        });
        
        const data = await res.json();
        
        if (data.status === 'success') {
            alert('Proof submitted successfully! Waiting for department admin approval.');
            document.getElementById('proofForm').reset();
            loadComplaintDetails(); // Reload to show updated status
        } else {
            alert('Failed to submit proof: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error submitting proof:', err);
        alert('Error submitting proof');
    }
}

// Update status
async function updateStatus(e) {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');
    const newStatus = document.getElementById('newStatus').value;
    const statusNote = document.getElementById('statusNote').value.trim();
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(API_URL + '/complaints/' + complaintId + '/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                status: newStatus,
                changeReason: statusNote
            })
        });
        
        const data = await res.json();
        
        if (data.status === 'success') {
            alert('Status updated successfully');
            document.getElementById('statusForm').reset();
            loadComplaintDetails();
        } else {
            alert('Failed to update status: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error updating status:', err);
        alert('Error updating status');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Prevent redirect loops
    if (sessionStorage.getItem('redirecting') === 'true') {
        sessionStorage.removeItem('redirecting');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only Officers can access
    if (user.type !== 'Officer') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    document.getElementById('officerName').textContent = user.name || user.username;
    
    loadComplaintDetails();
    
    // Add form listeners
    const statusForm = document.getElementById('statusForm');
    if (statusForm) {
        statusForm.addEventListener('submit', updateStatus);
    }
    
    const proofForm = document.getElementById('proofForm');
    if (proofForm) {
        proofForm.addEventListener('submit', submitProof);
    }
});
