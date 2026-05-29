var API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '/api';
// Load user info on page load
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Check auth
    if (!token) {
        window.location.replace('../auth.html');
        return;
    }

    // Only citizens can file complaints
    if (user.type !== 'Citizen') {
        // Redirect non-citizens to their dashboards
        if (user.type === 'SuperAdmin') window.location.replace('../admin/dashboard.html');
        else if (user.type === 'DeptAdmin') window.location.replace('../dept-admin/dashboard.html');
        else if (user.type === 'Officer') window.location.replace('../officer/dashboard.html');
        else window.location.replace('../auth.html');
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    }

    // Load categories from API
    loadCategories();

    // Handle form submission
    const complaintForm = document.getElementById('complaintForm');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please login first');
                window.location.href = '../auth.html';
                return;
            }

            const categoryId = parseInt(document.getElementById('category').value);
            if (!categoryId || isNaN(categoryId)) {
                alert('Please select a category');
                return;
            }

            const title = document.getElementById('title').value;
            if (!title || title.trim().length < 5) {
                alert('Title must be at least 5 characters');
                return;
            }

            const description = document.getElementById('description').value;
            if (!description || description.trim().length < 10) {
                alert('Description must be at least 10 characters');
                return;
            }

            const location = document.getElementById('location').value;
            if (!location || location.trim().length === 0) {
                alert('Location is required');
                return;
            }

            const formData = new FormData();
            formData.append('categoryId', categoryId);
            formData.append('complaintTitle', title);
            formData.append('complaintDescription', description);
            formData.append('location', location);
            formData.append('priority', document.getElementById('priority').value.charAt(0).toUpperCase() + document.getElementById('priority').value.slice(1));
            formData.append('ward', document.getElementById('ward').value);

            // Handle file attachments
            const fileInput = document.getElementById('attachments');
            const hasFiles = fileInput && fileInput.files.length > 0;
            
            if (hasFiles) {
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('attachments', fileInput.files[i]);
                }
            }

            try {
                let res;
                if (hasFiles) {
                    // Use FormData when files are present
                    res = await fetch(API_URL + '/complaints', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        },
                        body: formData
                    });
                } else {
                    // Use JSON when no files
                    const jsonData = {
                        categoryId: categoryId,
                        complaintTitle: title,
                        complaintDescription: description,
                        location: location,
                        priority: document.getElementById('priority').value.charAt(0).toUpperCase() + document.getElementById('priority').value.slice(1),
                        ward: document.getElementById('ward').value
                    };
                    res = await fetch(API_URL + '/complaints', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(jsonData)
                    });
                }

                const data = await res.json();

                if (data.status === 'success') {
                    alert('Complaint filed successfully!\nComplaint Number: ' + data.data.complaint.complaint_number);
                    window.location.href = 'complaints.html';
                } else {
                    alert('Failed: ' + data.message);
                }
            } catch (err) {
                console.error('Error:', err);
                alert('Failed to file complaint. Please try again.');
            }
        });
    }

    // Add event listeners for logout and cancel buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            window.location.href = 'dashboard.html';
        });
    }
});

async function loadCategories() {
    try {
        const res = await fetch(API_URL + '/categories');
        const data = await res.json();
        if (data.status === 'success') {
            var select = document.getElementById('category');
            select.innerHTML = '<option value="">Select a category</option>';
            var cats = data.data.categories || [];
            cats.forEach(function(cat) {
                const opt = document.createElement('option');
                opt.value = cat.category_id;
                opt.textContent = cat.category_name;
                opt.dataset.department = cat.department_name || '';
                select.appendChild(opt);
            });

            // Show department when category selected
            select.addEventListener('change', function() {
                const deptEl = document.getElementById('assignedDepartment');
                const selected = this.options[this.selectedIndex];
                if (deptEl && selected.dataset.department) {
                    deptEl.textContent = 'Auto-assigned: ' + selected.dataset.department;
                    deptEl.style.display = 'block';
                } else if (deptEl) {
                    deptEl.style.display = 'none';
                }
            });
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('../auth.html');
}
