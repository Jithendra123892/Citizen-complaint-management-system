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

    loadCategories();
});

async function loadCategories() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API_URL + '/categories', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.status === 'success') {
            renderCategories(data.data.categories || []);
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function renderCategories(categories) {
    const tbody = document.getElementById('categoriesTable');
    if (!tbody) return;
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>${cat.category_id}</td>
            <td>${cat.category_name}</td>
            <td>${cat.department_name || '-'}</td>
            <td>${cat.sla_hours} hours</td>
            <td>${cat.is_active ? 'Active' : 'Inactive'}</td>
            <td>
                <button class="btn-sm edit-btn" data-id="${cat.category_id}">Edit</button>
                <button class="btn-sm btn-danger delete-btn" data-id="${cat.category_id}">Delete</button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to edit and delete buttons
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            editCategory(parseInt(categoryId));
        });
    });
    
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            deleteCategory(parseInt(categoryId));
        });
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.href = '../auth.html';
}

// Add event listeners after DOM load
document.addEventListener('DOMContentLoaded', function() {
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', openModal);
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', window.closeModal);
    }

    const cancelModal = document.getElementById('cancelModal');
    if (cancelModal) {
        cancelModal.addEventListener('click', window.closeModal);
    }

    const saveCategory = document.getElementById('saveCategory');
    if (saveCategory) {
        saveCategory.addEventListener('click', window.saveCategory);
    }
});
