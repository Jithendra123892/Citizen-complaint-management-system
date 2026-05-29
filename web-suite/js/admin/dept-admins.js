var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';

// Check authentication and user type
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.replace('../auth.html');
        return false;
    }

    if (user.type !== 'SuperAdmin') {
        alert('Access denied. SuperAdmins only.');
        window.location.replace('../auth.html');
        return false;
    }

    document.getElementById('adminName').textContent = user.name || user.username;
    return true;
}

// Load SuperAdmin's state
async function loadSuperAdminState() {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const response = await fetch(`${API_BASE}/auth/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.state) {
                document.getElementById('stateName').textContent = data.data.state;
            }
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

// Load departments for dropdown
async function loadDepartments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/departments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('departmentId');
            select.innerHTML = '<option value="">Select Department</option>';
            
            data.data.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Load department admins
async function loadDeptAdmins() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dept-admin/admins`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderDeptAdmins(data.data.admins || []);
        } else {
            document.getElementById('deptAdminsTable').innerHTML = 
                '<tr><td colspan="8" style="text-align:center;padding:20px;">Failed to load department admins</td></tr>';
        }
    } catch (error) {
        console.error('Error loading department admins:', error);
        document.getElementById('deptAdminsTable').innerHTML = 
            '<tr><td colspan="8" style="text-align:center;padding:20px;">Error loading department admins</td></tr>';
    }
}

// Render department admins table
function renderDeptAdmins(admins) {
    const tbody = document.getElementById('deptAdminsTable');
    
    if (admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">No department admins found</td></tr>';
        return;
    }
    
    tbody.innerHTML = admins.map(admin => `
        <tr>
            <td>${admin.dept_admin_id}</td>
            <td>${admin.admin_name}</td>
            <td>${admin.username}</td>
            <td>${admin.department_name || '-'}</td>
            <td>${admin.city || '-'}</td>
            <td>${admin.email || '-'}</td>
            <td><span class="status-badge ${admin.is_active ? 'status-active' : 'status-inactive'}">${admin.is_active ? 'Active' : 'Inactive'}</span></td>
            <td class="action-links">
                <button class="btn btn-sm btn-outline toggle-status-btn" data-id="${admin.dept_admin_id}" data-status="${admin.is_active}">
                    ${admin.is_active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to toggle status buttons
    tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const adminId = this.getAttribute('data-id');
            const currentStatus = this.getAttribute('data-status') === 'true';
            toggleStatus(adminId, currentStatus);
        });
    });
}

// Toggle admin status
async function toggleStatus(adminId, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this admin?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/dept-admin/admins/${adminId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: !currentStatus })
        });
        
        if (response.ok) {
            alert('Status updated successfully');
            loadDeptAdmins();
        } else {
            const data = await response.json();
            alert('Failed to update status: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status');
    }
}

// Add department admin
async function addDeptAdmin(e) {
    e.preventDefault();
    
    const adminName = document.getElementById('adminName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const departmentId = document.getElementById('departmentId').value;
    const city = document.getElementById('city').value.trim();
    const email = document.getElementById('email').value.trim();
    const contactNumber = document.getElementById('contactNumber').value.trim();
    
    if (!adminName || !username || !password || !departmentId || !city) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const response = await fetch(`${API_BASE}/dept-admin/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                adminName,
                username,
                password,
                departmentId: parseInt(departmentId),
                city,
                email: email || null,
                contactNumber: contactNumber || null
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Department Admin registered successfully!');
            closeModal();
            loadDeptAdmins();
            document.getElementById('addDeptAdminForm').reset();
        } else {
            alert('Failed to register: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error registering admin:', error);
        alert('Error registering admin');
    }
}

// Modal functions
function openModal() {
    document.getElementById('addDeptAdminModal').classList.add('active');
    loadDepartments();
}

function closeModal() {
    document.getElementById('addDeptAdminModal').classList.remove('active');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    loadSuperAdminState();
    loadDeptAdmins();
    
    document.getElementById('addDeptAdminBtn').addEventListener('click', openModal);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('addDeptAdminForm').addEventListener('submit', addDeptAdmin);
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Close modal on outside click
    document.getElementById('addDeptAdminModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
});
