var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || 'http://localhost:5000/api';
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
        window.location.href = '../auth.html';
        return;
    }

    // Only SuperAdmin can access
    if (user.type !== 'SuperAdmin') {
        sessionStorage.setItem('redirecting', 'true');
        if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
        else if (user.type === 'Citizen') window.location.replace('../citizen/dashboard.html');
        else window.location.href = '../auth.html';
        return;
    }

    // Set admin name
    const adminName = document.getElementById('adminName');
    if (adminName) {
        adminName.textContent = user.username || user.name || 'Admin';
    }

    loadDepartments();
});

async function loadDepartments() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/departments', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderDepartments(data.data.departments || []);
        }
    } catch (err) {
        console.error('Error loading departments:', err);
    }
}

function renderDepartments(departments) {
    const tbody = document.getElementById('departmentsTable');
    if (!tbody) return;
    
    if (departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No departments found</td></tr>';
        return;
    }

    tbody.innerHTML = departments.map(dept => `
        <tr>
            <td>${dept.department_id}</td>
            <td>${dept.department_name}</td>
            <td>${dept.department_head || '-'}</td>
            <td>${dept.contact_number || '-'}</td>
            <td>${dept.email || '-'}</td>
            <td>${dept.officer_count || 0}</td>
            <td>${dept.total_complaints || 0}</td>
            <td>${dept.is_active ? 'Active' : 'Inactive'}</td>
            <td class="action-links">
                <button class="btn btn-sm btn-outline edit-btn" data-id="${dept.department_id}">Edit</button>
                <button class="btn btn-sm btn-red deactivate-btn" data-id="${dept.department_id}">Deactivate</button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to edit buttons
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const deptId = this.getAttribute('data-id');
            console.log('Edit button clicked, deptId:', deptId);
            openModal(deptId);
        });
    });

    // Add event listeners to deactivate buttons
    tbody.querySelectorAll('.deactivate-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const deptId = this.getAttribute('data-id');
            console.log('Deactivate button clicked, deptId:', deptId);
            deactivateDepartment(deptId);
        });
    });
}

window.openModal = function(deptId = null) {
    console.log('openModal called with deptId:', deptId, 'Type:', typeof deptId);
    
    // Reject if deptId is not null, string, or number (prevent event object passing)
    if (deptId !== null && typeof deptId !== 'string' && typeof deptId !== 'number') {
        console.error('Invalid deptId type:', typeof deptId);
        return;
    }
    
    const modal = document.getElementById('departmentModal');
    console.log('Modal element found:', modal);
    if (!modal) {
        console.error('Modal element not found!');
        return;
    }
    
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('departmentForm');
    
    if (deptId) {
        title.textContent = 'Edit Department';
        // Load department data and populate form
        loadDepartment(deptId);
    } else {
        title.textContent = 'Add New Department';
        form.reset();
        document.getElementById('departmentId').value = '';
    }
    
    modal.classList.add('active');
    modal.classList.add('show');
    console.log('Modal classes after adding active:', modal.className);
};

window.closeModal = function() {
    const modal = document.getElementById('departmentModal');
    modal.classList.remove('active');
    modal.classList.remove('show');
};

async function loadDepartment(deptId) {
    const token = localStorage.getItem('token');
    console.log('Loading department with ID:', deptId, 'Type:', typeof deptId);
    try {
        const res = await fetch(`api/departments/' + deptId`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        console.log('Department API response:', data);
        if (data.status === 'success' && data.data.department) {
            const dept = data.data.department;
            document.getElementById('departmentId').value = dept.department_id;
            document.getElementById('deptName').value = dept.department_name || '';
            document.getElementById('deptHead').value = dept.department_head || '';
            document.getElementById('deptContact').value = dept.contact_number || '';
            document.getElementById('deptEmail').value = dept.email || '';
        } else {
            alert('Department not found: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error loading department:', err);
        alert('Error loading department data');
    }
}

window.saveDepartment = async function(e) {
    e.preventDefault();
    
    const deptId = document.getElementById('departmentId').value;
    const deptData = {
        departmentName: document.getElementById('deptName').value,
        departmentHead: document.getElementById('deptHead').value,
        contactNumber: document.getElementById('deptContact').value,
        email: document.getElementById('deptEmail').value
    };
    
    const token = localStorage.getItem('token');
    const url = deptId ? API_URL + '/departments/' + deptId : API_URL + '/departments';
    const method = deptId ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(deptData)
        });
        const data = await res.json();
        
        if (data.status === 'success') {
            alert(deptId ? 'Department updated successfully' : 'Department created successfully');
            closeModal();
            loadDepartments();
        } else {
            alert('Failed: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error saving department:', err);
        alert('Error saving department');
    }
};

async function deactivateDepartment(deptId) {
    if (!confirm('Are you sure you want to deactivate this department?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`api/departments/' + deptId/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ is_active: false })
        });
        const data = await res.json();
        
        if (data.status === 'success') {
            alert('Department deactivated successfully');
            loadDepartments();
        } else {
            alert('Failed: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error deactivating department:', err);
        alert('Error deactivating department');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
}

// Add event listeners after DOM load
document.addEventListener('DOMContentLoaded', function() {
    const addDeptBtn = document.getElementById('addDeptBtn');
    if (addDeptBtn) {
        addDeptBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add Department button clicked');
            openModal();
        });
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', window.closeModal);
    }

    const cancelModal = document.getElementById('cancelModal');
    if (cancelModal) {
        cancelModal.addEventListener('click', window.closeModal);
    }

    const saveDepartment = document.getElementById('saveDepartment');
    if (saveDepartment) {
        saveDepartment.addEventListener('click', window.saveDepartment);
    }
});
