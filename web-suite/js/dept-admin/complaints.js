var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ? window.APP_CONFIG.API_BASE_URL : '/api';

// HTML escape function to prevent XSS
function escapeHtml(text) {
 if (text === null || text === undefined) return '';
 var div = document.createElement('div');
 div.textContent = text;
 return div.innerHTML;
}

// View complaint details
window.viewComplaint = function(complaintId) {
 window.location.href = 'complaint-details.html?id=' + complaintId;
};

let currentComplaintId = null;

// Assign officer to complaint
window.assignOfficer = async function(complaintId) {
 currentComplaintId = complaintId;

 // Load officers for dropdown
 try {
 const token = localStorage.getItem('token');
 const officersRes = await fetch(`${API_BASE}/dept-admin/officers`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const officersData = await officersRes.json();

 if (officersData.status !== 'success' || !officersData.data.officers || officersData.data.officers.length === 0) {
 alert('No officers available for assignment');
 return;
 }

 // Populate officer dropdown
 const officerDropdown = document.getElementById('officerDropdown');
 officerDropdown.innerHTML = '<option value="">Select Officer</option>';
 officersData.data.officers.forEach(officer => {
 const option = document.createElement('option');
 option.value = officer.officer_id;
 option.textContent = `${escapeHtml(officer.officer_name)} (${escapeHtml(officer.badge_number)})`;
 officerDropdown.appendChild(option);
 });

 // Show modal
 document.getElementById('assignOfficerModal').style.display = 'block';

 } catch (error) {
 console.error('Error loading officers:', error);
 alert('Failed to load officers');
 }
};

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

 document.getElementById('userInfo').textContent = `Welcome, ${escapeHtml(user.name || user.username)}`;
 return true;
}

// Load categories
async function loadCategories() {
 try {
 const token = localStorage.getItem('token');
 const response = await fetch(`${API_BASE}/categories`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });

 if (!response.ok) return;

 const data = await response.json();
 const select = document.getElementById('categoryFilter');

 data.data.categories.forEach(cat => {
 const option = document.createElement('option');
 option.value = cat.category_id;
 option.textContent = escapeHtml(cat.category_name);
 select.appendChild(option);
 });
 } catch (error) {
 console.error('Error loading categories:', error);
 }
}

// Load complaints
async function loadComplaints() {
 try {
 const token = localStorage.getItem('token');
 const response = await fetch(`${API_BASE}/complaints`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });

 if (!response.ok) throw new Error('Failed to load complaints');

 const data = await response.json();
 window.allComplaints = data.data.items || [];

 // Set status filter to empty (All Statuses) by default to show all complaints including Pending Approval
 document.getElementById('statusFilter').value = '';

 renderComplaints(window.allComplaints);
 } catch (error) {
 console.error('Error loading complaints:', error);
 document.getElementById('complaintsTable').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Failed to load complaints</td></tr>';
 }
}

// Render complaints table
function renderComplaints(complaints) {
 const tbody = document.getElementById('complaintsTable');

 if (!complaints || complaints.length === 0) {
 tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">No complaints found</td></tr>';
 return;
 }

 tbody.innerHTML = complaints.map(complaint => {
 // Check if complaint has image attachments
 const hasImage = complaint.attachments && complaint.attachments.some(att => att.file_type && att.file_type.startsWith('image/'));
 const firstImage = hasImage ? complaint.attachments.find(att => att.file_type && att.file_type.startsWith('image/')) : null;

 console.log('DEBUG - Complaint ID:', complaint.complaint_id, 'First image:', firstImage);

 var img = document.createElement('img');
 img.src = firstImage ? '/uploads/' + (firstImage.file_path || firstImage.file_name) : '';
 img.alt = 'Attachment';
 img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;transition:transform 0.2s;';
 img.addEventListener('error', function() { this.style.display = 'none'; });
 img.setAttribute('data-image-url', firstImage ? '/uploads/' + (firstImage.file_path || firstImage.file_name) : '');
 img.className = 'complaint-image';

 const imageHtml = firstImage ? img.outerHTML : '<span style="color:#999;font-size:0.8rem;">No image</span>';

 return `
 <tr>
 <td>#${escapeHtml(complaint.complaint_id)}</td>
 <td>${escapeHtml(complaint.complaint_title)}</td>
 <td>${escapeHtml(complaint.category_name || 'N/A')}</td>
 <td>${escapeHtml(complaint.citizen_name || 'N/A')}</td>
 <td><span class="badge badge-${getStatusClass(complaint.status)}">${escapeHtml(complaint.status)}</span></td>
 <td>${escapeHtml(complaint.officer_name || 'Unassigned')}</td>
 <td>${escapeHtml(complaint.priority || 'Normal')}</td>
 <td>${imageHtml}</td>
 <td>${formatDate(complaint.created_at)}</td>
 <td>${formatDate(complaint.assigned_at)}</td>
 <td>${formatDate(complaint.approved_at)}</td>
 <td>
 <button class="btn btn-sm btn-primary view-btn" data-id="${complaint.complaint_id}">View</button>
 <button class="btn btn-sm btn-primary assign-btn" data-id="${complaint.complaint_id}">Assign</button>
 </td>
 </tr>
 `;
 }).join('');

 // Add event listeners
 document.querySelectorAll('.view-btn').forEach(btn => {
 btn.addEventListener('click', function(e) {
 const id = this.getAttribute('data-id');
 console.log('DEBUG - View button clicked, ID:', id);
 window.viewComplaint(id);
 });
 });

 document.querySelectorAll('.assign-btn').forEach(btn => {
 btn.addEventListener('click', function(e) {
 const id = this.getAttribute('data-id');
 console.log('DEBUG - Assign button clicked, ID:', id);
 window.assignOfficer(id);
 });
 });

 // Add event listeners for complaint images
 document.querySelectorAll('.complaint-image').forEach(img => {
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

// Filter complaints
function filterComplaints() {
 const status = document.getElementById('statusFilter').value;
 const category = document.getElementById('categoryFilter').value;
 const search = document.getElementById('searchInput').value.toLowerCase();

 let filtered = window.allComplaints;

 if (status) {
 filtered = filtered.filter(c => c.status === status);
 }

 if (category) {
 filtered = filtered.filter(c => c.category_id == category);
 }

 if (search) {
 filtered = filtered.filter(c =>
 c.complaint_id.toString().includes(search) ||
 (c.complaint_title || c.title || '').toLowerCase().includes(search)
 );
 }

 renderComplaints(filtered);
}

// Get status badge class
function getStatusClass(status) {
 const statusMap = {
 'Pending': 'pending',
 'In Progress': 'in-progress',
 'Pending Approval': 'in-progress',
 'Resolved': 'resolved',
 'Rejected': 'rejected',
 'Closed': 'resolved'
 };
 return statusMap[status] || 'pending';
}

// Format date
function formatDate(dateString) {
 if (!dateString || dateString === 'Invalid Date' || dateString === '0000-00-00 00:00:00') {
 return '-';
 }
 const date = new Date(dateString);
 if (isNaN(date.getTime())) {
 return '-';
 }
 return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Confirm assign officer
async function confirmAssignOfficer() {
 const officerId = document.getElementById('officerDropdown').value;

 if (!officerId) {
 alert('Please select an officer');
 return;
 }

 try {
 const token = localStorage.getItem('token');
 const response = await fetch(`${API_BASE}/dept-admin/complaints/${currentComplaintId}/assign`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ officerId: parseInt(officerId) })
 });

 const data = await response.json();

 if (data.status === 'success') {
 alert('Officer assigned successfully');
 document.getElementById('assignOfficerModal').style.display = 'none';
 loadComplaints();
 } else {
 alert('Failed to assign: ' + escapeHtml(data.message));
 }
 } catch (error) {
 alert('Failed to assign officer: ' + escapeHtml(error.message));
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

 const filterBtn = document.getElementById('filterBtn');
 if (filterBtn) {
 filterBtn.addEventListener('click', filterComplaints);
 }

 // Add event listener for confirm assign button
 const confirmAssignBtn = document.getElementById('confirmAssignBtn');
 if (confirmAssignBtn) {
 confirmAssignBtn.addEventListener('click', confirmAssignOfficer);
 }

 // Add event listener for cancel button
 const cancelAssignBtn = document.getElementById('cancelAssignBtn');
 if (cancelAssignBtn) {
 cancelAssignBtn.addEventListener('click', function() {
 document.getElementById('assignOfficerModal').style.display = 'none';
 });
 }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
 if (!checkAuth()) return;

 loadCategories();
 loadComplaints();

 document.getElementById('statusFilter').addEventListener('change', filterComplaints);
 document.getElementById('categoryFilter').addEventListener('change', filterComplaints);
 document.getElementById('searchInput').addEventListener('keyup', (e) => {
 if (e.key === 'Enter') filterComplaints();
 });
});
