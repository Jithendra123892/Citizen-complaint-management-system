(function() {
    'use strict';

    var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';
    let currentUser = null;
    let allComplaints = [];
    let departments = [];
    let officers = [];
    let currentComplaint = null;

    // HTML escape function to prevent XSS
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            window.location.href = '../auth.html';
            return false;
        }

        currentUser = user;

        if (user.type !== 'SuperAdmin' && user.type !== 'Admin') {
            if (user.type === 'Officer') {
                window.location.href = '../officer/dashboard.html';
            } else if (user.type === 'DeptAdmin') {
                window.location.href = '../dept-admin/dashboard.html';
            } else {
                window.location.href = '../citizen/dashboard.html';
            }
            return false;
        }

        document.getElementById('adminName').textContent = user.username || user.name;
        return true;
    }

    async function loadDepartments() {
        try {
            const response = await fetch(`${API_BASE}/departments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load departments');

            const data = await response.json();
            departments = data.data.departments || [];

            const select = document.getElementById('filterDept');
            select.innerHTML = '<option value="">All Departments</option>' +
                departments.map(d => `<option value="${d.department_id}">${escapeHtml(d.department_name)}</option>`).join('');
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    async function loadOfficers() {
        try {
            const response = await fetch(`${API_BASE}/officers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load officers');

            const data = await response.json();
            officers = data.data.items || [];
        } catch (error) {
            console.error('Error loading officers:', error);
        }
    }

    async function loadComplaints() {
        try {
            const statusFilter = document.getElementById('filterStatus').value;
            const priorityFilter = document.getElementById('filterPriority').value;
            const deptFilter = document.getElementById('filterDept').value;

            let url = `${API_BASE}/complaints?limit=100`;
            if (statusFilter) url += `&status=${statusFilter}`;
            if (priorityFilter) url += `&priority=${priorityFilter}`;
            if (deptFilter) url += `&department_id=${deptFilter}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load complaints');

            const data = await response.json();
            allComplaints = data.data.items || [];

            renderComplaints();
        } catch (error) {
            console.error('Error loading complaints:', error);
            document.getElementById('complaintsTableBody').innerHTML = 
                '<tr><td colspan="9" style="text-align:center;padding:30px;color:#c62828;">Error loading complaints</td></tr>';
        }
    }

    function renderComplaints() {
        const tbody = document.getElementById('complaintsTableBody');

        if (allComplaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#757575;">No complaints found</td></tr>';
            return;
        }

        tbody.innerHTML = allComplaints.map((complaint, index) => {
            const statusClass = complaint.status.toLowerCase().replace(' ', '-');
            const priorityClass = `priority-${complaint.priority.toLowerCase()}`;
            
            // Check if complaint has image attachments
            const hasImage = complaint.attachments && complaint.attachments.some(att => att.file_type && att.file_type.startsWith('image/'));
            const firstImage = hasImage ? complaint.attachments.find(att => att.file_type && att.file_type.startsWith('image/')) : null;
            
            const imageHtml = firstImage 
                ? `<img src="/uploads/${firstImage.file_path || firstImage.file_name}" alt="Attachment" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;transition:transform 0.2s;" onerror="this.style.display='none';" data-image-url="/uploads/${firstImage.file_path || firstImage.file_name}" class="complaint-image">` 
                : '<span style="color:#999;font-size:0.8rem;">No image</span>';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(complaint.subject || complaint.complaint_title || 'N/A')}</td>
                    <td>${escapeHtml(complaint.citizen_name || 'N/A')}</td>
                    <td>${escapeHtml(complaint.category_name || 'N/A')}</td>
                    <td>${escapeHtml(complaint.department_name || 'Unassigned')}</td>
                    <td>${escapeHtml(complaint.assigned_officer_name || complaint.officer_name || 'Unassigned')}</td>
                    <td>${imageHtml}</td>
                    <td><span class="status-badge ${priorityClass}">${escapeHtml(complaint.priority)}</span></td>
                    <td><span class="status-badge status-${statusClass}">${escapeHtml(complaint.status)}</span></td>
                    <td class="action-links">
                        <button class="btn btn-sm btn-outline view-btn" data-id="${complaint.complaint_id}">View</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to view buttons
        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const complaintId = this.getAttribute('data-id');
                window.viewComplaint(complaintId);
            });
        });
        
        // Add event listeners for complaint images
        tbody.querySelectorAll('.complaint-image').forEach(img => {
            img.addEventListener('click', function() {
                const imageUrl = this.getAttribute('data-image-url');
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

    window.viewComplaint = async function(complaintId) {
        try {
            const response = await fetch(`${API_BASE}/complaints/${complaintId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Failed to load complaint');

            const data = await response.json();
            currentComplaint = data.data.complaint;

            const modal = document.getElementById('complaintModal');
            document.getElementById('modalTitle').textContent = `Complaint: ${currentComplaint.complaint_title || 'N/A'}`;

            console.log('Officers:', officers);
            console.log('Departments:', departments);

            const officerOptions = '<option value="">-- Select Officer --</option>' +
                officers.map(o => `<option value="${o.officer_id}" ${currentComplaint.assigned_officer_id === o.officer_id ? 'selected' : ''}>${o.officer_name} (${o.department_name || 'No Dept'})</option>`).join('');

            const departmentOptions = '<option value="">-- Select Department --</option>' +
                departments.map(d => `<option value="${d.department_id}" ${currentComplaint.department_id === d.department_id ? 'selected' : ''}>${d.department_name}</option>`).join('');

            const statusOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed']
                .filter(s => s !== currentComplaint.status)
                .map(s => `<option value="${s}">${s}</option>`)
                .join('');

            console.log('Status options:', statusOptions);
            console.log('Officer options:', officerOptions);
            console.log('Department options:', departmentOptions);

            let attachmentsHtml = '';
            if (currentComplaint.attachments && currentComplaint.attachments.length > 0) {
                const citizenAttachments = currentComplaint.attachments.filter(att => !att.attachment_type || att.attachment_type === 'citizen');
                const officerProofAttachments = currentComplaint.attachments.filter(att => att.attachment_type === 'officer_proof');
                
                let html = '<div style="margin-top:20px;padding-top:20px;border-top:1px solid #eee;">';
                
                // Display citizen attachments
                if (citizenAttachments.length > 0) {
                    html += `
                        <h4>Citizen Attachments</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">
                            ${citizenAttachments.map(att => `
                                <div style="border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center;">
                                    ${(att.file_type && att.file_type.startsWith('image/')) 
                                        ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${att.file_name}" style="max-width:100%;max-height:100px;object-fit:contain;border-radius:4px;margin-bottom:8px;cursor:pointer;" onerror="this.style.display='none';" data-image-url="/uploads/${att.file_path || att.file_name}" class="modal-attachment-image">` 
                                        : '<div style="font-size:2rem;margin-bottom:8px;">📎</div>'}
                                    <div style="font-size:0.8rem;color:#666;word-break:break-all;margin-bottom:8px;">${att.file_name || att.original_name || 'Attachment'}</div>
                                    <a href="/uploads/${att.file_path || att.file_name}" target="_blank" style="display:inline-block;padding:4px 12px;border:1px solid #003087;color:#003087;border-radius:4px;font-size:0.75rem;text-decoration:none;">Download</a>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Display officer proof attachments
                if (officerProofAttachments.length > 0) {
                    html += `
                        <h4 style="margin-top:20px;">Officer Proof Attachments</h4>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px;">
                            ${officerProofAttachments.map(att => `
                                <div style="border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center;">
                                    ${(att.file_type && att.file_type.startsWith('image/')) 
                                        ? `<img src="/uploads/${att.file_path || att.file_name}" alt="${att.file_name}" style="max-width:100%;max-height:100px;object-fit:contain;border-radius:4px;margin-bottom:8px;cursor:pointer;" onerror="this.style.display='none';" data-image-url="/uploads/${att.file_path || att.file_name}" class="modal-attachment-image">` 
                                        : '<div style="font-size:2rem;margin-bottom:8px;">📎</div>'}
                                    <div style="font-size:0.8rem;color:#666;word-break:break-all;margin-bottom:8px;">${att.file_name || att.original_name || 'Attachment'}</div>
                                    <a href="/uploads/${att.file_path || att.file_name}" target="_blank" style="display:inline-block;padding:4px 12px;border:1px solid #003087;color:#003087;border-radius:4px;font-size:0.75rem;text-decoration:none;">Download</a>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                html += '</div>';
                attachmentsHtml = html;
            }
            
            document.getElementById('modalBody').innerHTML = `
                <div class="detail-row">
                    <div class="detail-item">
                        <label>Citizen</label>
                        <span>${currentComplaint.citizen_name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category</label>
                        <span>${currentComplaint.category_name || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <label>Department</label>
                        <span>${currentComplaint.department_name || 'Unassigned'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Officer</label>
                        <span>${currentComplaint.assigned_officer_name || currentComplaint.officer_name || 'Unassigned'}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <label>Status</label>
                        <span>${currentComplaint.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Priority</label>
                        <span>${currentComplaint.priority || 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-full">
                    <label>Description</label>
                    <p>${currentComplaint.complaint_description || currentComplaint.description || 'N/A'}</p>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <label>Department</label>
                        <select id="modalDepartment">${departmentOptions}</select>
                    </div>
                    <div class="detail-item">
                        <label>Officer</label>
                        <select id="modalOfficer">${officerOptions}</select>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <label>Status</label>
                        <select id="modalStatus">${statusOptions}</select>
                    </div>
                </div>
                ${attachmentsHtml}
                <div class="modal-actions">
                    <button class="btn btn-primary" id="saveModalBtn">Save Changes</button>
                    <button class="btn btn-secondary" id="closeModalBtn">Close</button>
                </div>
            `;

            modal.classList.add('active');

            // Add event listeners for modal attachment images
            document.querySelectorAll('.modal-attachment-image').forEach(img => {
                img.addEventListener('click', function() {
                    const imageUrl = this.getAttribute('data-image-url');
                    if (imageUrl) {
                        window.open(imageUrl, '_blank');
                    }
                });
            });

            document.getElementById('closeModalBtn').addEventListener('click', () => {
                modal.classList.remove('active');
            });

            document.getElementById('saveModalBtn').addEventListener('click', async () => {
                const newDepartmentId = document.getElementById('modalDepartment').value;
                const newOfficerId = document.getElementById('modalOfficer').value;
                const newStatus = document.getElementById('modalStatus').value;

                try {
                    const updateResponse = await fetch(`${API_BASE}/complaints/${complaintId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            department_id: newDepartmentId || null,
                            assigned_officer_id: newOfficerId || null,
                            status: newStatus || currentComplaint.status
                        })
                    });

                    if (updateResponse.ok) {
                        alert('Complaint updated successfully');
                        modal.classList.remove('active');
                        loadComplaints();
                    } else {
                        alert('Failed to update complaint');
                    }
                } catch (err) {
                    console.error('Update error:', err);
                    alert('Error updating complaint');
                }
            });
    } catch (error) {
        console.error('Error loading complaint:', error);
        alert('Failed to load complaint details');
    }
};

window.reassignComplaint = async function() {
    if (!currentComplaint) return;

    const officerId = document.getElementById('reassignOfficer').value;
    const deptId = document.getElementById('reassignDept').value;

    if (!officerId && !deptId) {
        alert('Please select an officer or department');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/complaints/${currentComplaint.complaint_id}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                officerId: parseInt(officerId) || null
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Complaint reassigned successfully');
            window.closeModal();
            await loadComplaints();
        } else {
            alert('Failed to reassign: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error reassigning complaint:', error);
        alert('Error reassigning complaint');
    }
};

window.updateStatus = async function() {
    if (!currentComplaint) return;

    const newStatus = document.getElementById('updateStatus').value;
    const reason = document.getElementById('updateReason').value;

    if (!newStatus) {
        alert('Please select a new status');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/complaints/${currentComplaint.complaint_id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus, changeReason: reason })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Status updated successfully');
            window.closeModal();
            await loadComplaints();
        } else {
            alert('Failed to update status: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + (error.message || 'Unknown error'));
    }
};

window.closeModal = function() {
    document.getElementById('complaintModal').classList.remove('active');
    currentComplaint = null;
};

window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
};

document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;

    await Promise.all([
        loadDepartments(),
        loadOfficers(),
        loadComplaints()
    ]);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.logout();
        });
    }

    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadComplaints);
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', window.closeModal);
    }
});
})();
