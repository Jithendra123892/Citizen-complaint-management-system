/**
 * CitizenConnect - Main JavaScript Application
 */

// ========================================
// API Configuration
// Uses window.APP_CONFIG if available (set by js/common/config.js), fallback to localhost
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
                      (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
                      '/api';

// ========================================
// State Management
// ========================================
const state = {
    user: null,
    token: localStorage.getItem('token'),
    currentPage: 'dashboard',
    theme: localStorage.getItem('theme') || 'light'
};

// ========================================
// Security Utilities
// ========================================
const HTML_ESCAPE_MAP = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
const escapeHtml = (str) => { if (typeof str !== 'string') return str; return str.replace(/[&<>"']/g, (chr) => HTML_ESCAPE_MAP[chr] || chr); };
const createElement = (tag, options = {}) => { const el = document.createElement(tag); if (options.text) el.textContent = options.text; if (options.html) el.innerHTML = escapeHtml(options.html); if (options.className) el.className = options.className; if (options.id) el.id = options.id; if (options.style) Object.assign(el.style, options.style); if (options.attrs) { for (const [k, v] of Object.entries(options.attrs)) el.setAttribute(k, escapeHtml(v)); } if (options.on) { for (const [event, handler] of Object.entries(options.on)) el.addEventListener(event, handler); } return el; };
// ========================================
// Utility Functions
// ========================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const showToast = (message, type = 'info') => {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">×</button>
    `;
    
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => toast.remove(), 5000);
};

const showLoading = () => {
    $('#loader').classList.remove('hidden');
};

const hideLoading = () => {
    $('#loader').classList.add('hidden');
};

// ========================================
// API Functions
// ========================================
const api = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint);
    },
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
};

// ========================================
// Authentication
// ========================================
const auth = {
    async login(username, password) {
        try {
            const data = await api.post('/auth/login', { username, password });
            state.token = data.data.token;
            state.user = data.data.user;
            localStorage.setItem('token', state.token);
            showToast('Login successful!', 'success');
            return true;
        } catch (error) {
            showToast(error.message, 'error');
            return false;
        }
    },
    
    async register(formData) {
        try {
            const data = await api.post('/auth/register', formData);
            showToast('Registration successful!', 'success');
            return true;
        } catch (error) {
            showToast(error.message, 'error');
            return false;
        }
    },
    
    logout() {
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        showDashboard(false);
        showAuthPage();
        showToast('Logged out successfully', 'info');
    },
    
    checkAuth() {
        if (state.token) {
            showDashboard(true);
            return true;
        }
        showAuthPage();
        return false;
    }
};

// ========================================
// Page Navigation
// ========================================
const showPage = (pageName) => {
    // Update nav
    $$('.sidebar-nav li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.page === pageName) {
            li.classList.add('active');
        }
    });
    
    // Update pages
    $$('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = $(`#page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    state.currentPage = pageName;
    
    // Load page data
    loadPageData(pageName);
};

const loadPageData = async (pageName) => {
    switch (pageName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'complaints':
            await loadComplaints();
            break;
        case 'officers':
            await loadOfficers();
            break;
        case 'departments':
            await loadDepartments();
            break;
        case 'analytics':
            await loadAnalytics();
            break;
    }
};

// ========================================
// Dashboard
// ========================================
const loadDashboardData = async () => {
    try {
        const [stats, complaints] = await Promise.all([
            api.get('/complaints/stats/summary'),
            api.get('/complaints?limit=5')
        ]);
        
        renderStats(stats.data);
        renderRecentComplaints(complaints.data.items);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
};

const renderStats = (stats) => {
    const statCards = $$('.stat-card');
    if (statCards.length >= 4) {
        statCards[0].querySelector('.stat-value').textContent = stats.total || 0;
        statCards[1].querySelector('.stat-value').textContent = stats.pending || 0;
        statCards[2].querySelector('.stat-value').textContent = stats.in_progress || 0;
        statCards[3].querySelector('.stat-value').textContent = stats.resolved || 0;
    }
};

const renderRecentComplaints = (complaints) => {
    const tbody = $('#recentComplaintsTable');
    if (!tbody) return;
    
    tbody.innerHTML = complaints.map(c => `
        <tr>
            <td class="complaint-id">${c.complaint_number}</td>
            <td>${c.complaint_title}</td>
            <td>${c.category_name}</td>
            <td><span class="status-badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></td>
            <td><span class="priority-badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
            <td>${formatDate(c.created_at)}</td>
            <td>
                <button class="btn-sm btn-outline view-btn" data-id="${c.complaint_id}">View</button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to view buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            viewComplaint(parseInt(complaintId));
        });
    });
};

// ========================================
// Complaints
// ========================================
const loadComplaints = async () => {
    try {
        const data = await api.get('/complaints?limit=20');
        renderComplaintsList(data.data.items);
    } catch (error) {
        console.error('Failed to load complaints:', error);
    }
};

const renderComplaintsList = (complaints) => {
    const list = $('#complaintsList');
    if (!list) return;
    
    list.innerHTML = complaints.map(c => `
        <div class="complaint-card complaint-card-item" data-id="${c.complaint_id}">
            <div class="complaint-card-left">
                <div class="complaint-id-badge">${c.complaint_number}</div>
            </div>
            <div class="complaint-card-body">
                <h3>${c.complaint_title}</h3>
                <div class="complaint-meta">
                    <span>📁 ${c.category_name}</span>
                    <span>🏛️ ${c.department_name}</span>
                    <span>📅 ${formatDate(c.created_at)}</span>
                </div>
                <div class="complaint-card-footer">
                    <span class="complaint-date">${c.sla_status?.withinSLA ? 'Within SLA' : 'Overdue'}</span>
                    <div class="complaint-card-actions">
                        <span class="status-badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span>
                        <span class="priority-badge ${c.priority.toLowerCase()}">${c.priority}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to complaint cards
    const complaintCards = document.querySelectorAll('.complaint-card-item');
    complaintCards.forEach(card => {
        card.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            viewComplaint(parseInt(complaintId));
        });
    });
};

const viewComplaint = async (complaintId) => {
    try {
        const data = await api.get(`/complaints/${complaintId}`);
        showComplaintModal(data.data);
    } catch (error) {
        showToast('Failed to load complaint details', 'error');
    }
};

const showComplaintModal = (data) => {
    const modal = $('#complaintModal');
    const { complaint, history } = data;
    
    modal.querySelector('.complaint-id-badge').textContent = complaint.complaint_number;
    modal.querySelector('h2').textContent = complaint.complaint_title;
    modal.querySelector('.status-badge').className = `status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`;
    modal.querySelector('.status-badge').textContent = complaint.status;
    
    // Fill details
    const detailItems = modal.querySelectorAll('.detail-item');
    detailItems[0].querySelector('.detail-value').textContent = complaint.category_name;
    detailItems[1].querySelector('.detail-value').textContent = complaint.department_name;
    detailItems[2].querySelector('.detail-value').textContent = complaint.officer_name || 'Not Assigned';
    detailItems[3].querySelector('.detail-value').textContent = complaint.priority;
    detailItems[4].querySelector('.detail-value').textContent = complaint.location;
    detailItems[5].querySelector('.detail-value').textContent = formatDate(complaint.created_at);
    
    // Description
    modal.querySelector('.detail-section p').textContent = complaint.complaint_description;
    
    // Timeline
    renderTimeline(modal.querySelector('.timeline'), history);
    
    modal.classList.add('active');
};

const renderTimeline = (container, history) => {
    container.innerHTML = history.map(h => `
        <div class="timeline-item ${h.new_status === 'Resolved' ? 'completed' : ''}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <p>Status: ${h.new_status}</p>
                <span>${formatDateTime(h.changed_at)}</span>
                ${h.change_reason ? `<span class="timeline-by">${h.change_reason}</span>` : ''}
            </div>
        </div>
    `).join('');
};

// ========================================
// Officers
// ========================================
const loadOfficers = async () => {
    try {
        const data = await api.get('/officers');
        renderOfficers(data.data.items);
    } catch (error) {
        console.error('Failed to load officers:', error);
    }
};

const renderOfficers = (officers) => {
    const grid = $('#officersGrid');
    if (!grid) return;
    
    grid.innerHTML = officers.map(o => `
        <div class="officer-card">
            <div class="officer-avatar">${getInitials(o.officer_name)}</div>
            <h3>${o.officer_name}</h3>
            <p class="officer-designation">${o.designation || 'Officer'}</p>
            <span class="officer-department">${o.department_name}</span>
            <div class="officer-stats">
                <div class="officer-stat">
                    <span class="officer-stat-value">${o.stats?.assigned_complaints || 0}</span>
                    <span class="officer-stat-label">Assigned</span>
                </div>
                <div class="officer-stat">
                    <span class="officer-stat-value">${o.stats?.resolved || 0}</span>
                    <span class="officer-stat-label">Resolved</span>
                </div>
            </div>
        </div>
    `).join('');
};

const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ========================================
// Departments
// ========================================
const loadDepartments = async () => {
    try {
        const data = await api.get('/departments');
        renderDepartments(data.data.departments);
    } catch (error) {
        console.error('Failed to load departments:', error);
    }
};

const renderDepartments = (departments) => {
    const grid = $('#departmentsGrid');
    if (!grid) return;
    
    const icons = {
        'Roads': '🛣️',
        'Water': '💧',
        'Electricity': '⚡',
        'Sanitation': '🧹',
        'Drainage': '🌊',
        'Street': '💡'
    };
    
    const colors = {
        'Roads': '#f59e0b',
        'Water': '#3b82f6',
        'Electricity': '#f59e0b',
        'Sanitation': '#10b981',
        'Drainage': '#8b5cf6',
        'Street': '#ec4899'
    };
    
    grid.innerHTML = departments.map(d => {
        const icon = Object.keys(icons).find(k => d.department_name.includes(k)) || '🏛️';
        const color = Object.keys(colors).find(k => d.department_name.includes(k)) ? 
            colors[Object.keys(colors).find(k => d.department_name.includes(k))] : '#667eea';
        
        return `
            <div class="department-card">
                <div class="department-icon" style="background: ${color}20; color: ${color}">
                    ${icons[icon]}
                </div>
                <h3>${d.department_name}</h3>
                <p>${d.department_head ? `Head: ${d.department_head}` : 'Municipal Department'}</p>
                <div class="department-stats">
                    <div class="department-stat">
                        <span class="department-stat-value">${d.stats?.total || 0}</span>
                        <span class="department-stat-label">Total</span>
                    </div>
                    <div class="department-stat">
                        <span class="department-stat-value">${d.stats?.resolved || 0}</span>
                        <span class="department-stat-label">Resolved</span>
                    </div>
                    <div class="department-stat">
                        <span class="department-stat-value">${d.stats?.resolution_rate || 0}%</span>
                        <span class="department-stat-label">Rate</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// ========================================
// Analytics
// ========================================
const loadAnalytics = async () => {
    try {
        const data = await api.get('/analytics/dashboard');
        renderAnalytics(data.data);
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
};

const renderAnalytics = (data) => {
    // KPI Cards
    const kpis = $$('.kpi-card');
    if (kpis.length >= 4) {
        kpis[0].querySelector('.kpi-value').textContent = `${data.metrics?.resolution_rate || 0}%`;
        kpis[1].querySelector('.kpi-value').textContent = `${data.metrics?.avg_resolution_hours || 0}h`;
        kpis[2].querySelector('.kpi-value').textContent = `${100 - (data.metrics?.overdue_rate || 0)}%`;
        kpis[3].querySelector('.kpi-value').textContent = '4.5';
    }
    
    // Charts would be rendered using Chart.js here
    renderCharts(data);
};

const renderCharts = (data) => {
    // Daily Trend Chart
    const trendCtx = $('#complaintTrendChart');
    if (trendCtx && typeof Chart !== 'undefined') {
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: data.dailyTrend?.map(d => d.date) || [],
                datasets: [{
                    label: 'Complaints',
                    data: data.dailyTrend?.map(d => d.total) || [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Status Pie Chart
    const statusCtx = $('#statusPieChart');
    if (statusCtx && typeof Chart !== 'undefined') {
        const statusData = data.categoryDistribution || [];
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: statusData.map(d => d.category_name),
                datasets: [{
                    data: statusData.map(d => d.count),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12 }
                    }
                }
            }
        });
    }
};

// ========================================
// Complaint Form
// ========================================
const initComplaintForm = () => {
    const form = $('#complaintForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            categoryId: $('#complaintType').value,
            complaintTitle: $('#complaintTitle').value,
            complaintDescription: $('#complaintDesc').value,
            location: $('#location').value,
            latitude: $('#latitude').value,
            longitude: $('#longitude').value,
            priority: $('#priorityLevel').value,
            wardNumber: $('#wardNumber').value,
            pincode: $('#pincode').value
        };
        
        try {
            await api.post('/complaints', formData);
            showToast('Complaint filed successfully!', 'success');
            form.reset();
            showPage('complaints');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
    
    // File upload
    const uploadArea = $('#uploadArea');
    const fileInput = $('#fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', () => {
            handleFileSelect(fileInput.files);
        });
    }
    
    // Location button
    const locationBtn = $('#useCurrentLocation');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        $('#latitude').value = position.coords.latitude;
                        $('#longitude').value = position.coords.longitude;
                        showToast('Location captured!', 'success');
                    },
                    (error) => {
                        showToast('Failed to get location', 'error');
                    }
                );
            } else {
                showToast('Geolocation not supported', 'error');
            }
        });
    }
};

const handleFileSelect = (files) => {
    const container = $('#uploadedFiles');
    if (!container) return;
    
    Array.from(files).forEach(file => {
        const div = document.createElement('div');
        div.className = 'uploaded-file';
        div.innerHTML = `
            <span>📄 ${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        `;
        container.appendChild(div);
    });
};

const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ========================================
// Track Complaint
// ========================================
const initTrackComplaint = () => {
    const trackBtn = $('#trackBtn');
    const trackInput = $('#trackInput');
    
    if (trackBtn && trackInput) {
        trackBtn.addEventListener('click', async () => {
            const complaintNumber = trackInput.value.trim();
            if (!complaintNumber) {
                showToast('Please enter a complaint number', 'warning');
                return;
            }
            
            try {
                const data = await api.get(`/complaints/track/${complaintNumber}`);
                renderTrackResult(data.data);
            } catch (error) {
                showToast('Complaint not found', 'error');
                $('#trackResult').innerHTML = '<p style="text-align: center; padding: 2rem;">Complaint not found. Please check the number.</p>';
            }
        });
        
        // Quick search chips
        $$('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                trackInput.value = chip.dataset.complaint;
                trackBtn.click();
            });
        });
    }
};

const renderTrackResult = (data) => {
    const container = $('#trackResult');
    const { complaint, history } = data;
    
    container.innerHTML = `
        <div class="complaint-details-card">
            <div class="complaint-header-card">
                <div class="complaint-id-badge">${complaint.complaint_number}</div>
                <span class="status-badge ${complaint.status.toLowerCase().replace(' ', '-')}">${complaint.status}</span>
            </div>
            <h2>${complaint.complaint_title}</h2>
            <div class="complaint-meta">
                <span>📁 ${complaint.category_name}</span>
                <span>🏛️ ${complaint.department_name}</span>
                <span>📅 Filed: ${formatDate(complaint.created_at)}</span>
            </div>
            
            <div class="timeline-container">
                <h4>Complaint Timeline</h4>
                <div class="timeline">
                    ${history.map(h => `
                        <div class="timeline-item ${h.new_status === 'Resolved' ? 'completed' : ''} ${h.new_status === 'In Progress' ? 'active' : ''}">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <span class="timeline-date">${formatDateTime(h.changed_at)}</span>
                                <p>${h.new_status}</p>
                                ${h.change_reason ? `<span class="timeline-by">${h.change_reason}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="sla-info">
                <div class="sla-item">
                    <span class="sla-label">SLA Status</span>
                    <span class="sla-value ${complaint.status === 'Resolved' ? 'positive' : ''}">
                        ${complaint.status === 'Resolved' ? 'Resolved' : 'In Progress'}
                    </span>
                </div>
            </div>
        </div>
    `;
};

// ========================================
// UI Handlers
// ========================================
const initUIHandlers = () => {
    // Sidebar toggle
    const sidebarToggle = $('#sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            $('#sidebar').classList.toggle('collapsed');
        });
    }
    
    // Mobile menu
    const mobileMenuBtn = $('#mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            $('#sidebar').classList.toggle('active');
        });
    }
    
    // Notifications
    const notificationBtn = $('#notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            $('#notificationDropdown').classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !$('#notificationDropdown').contains(e.target)) {
                $('#notificationDropdown').classList.remove('active');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = $('#themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', state.theme);
            localStorage.setItem('theme', state.theme);
            themeToggle.textContent = state.theme === 'light' ? '🌙' : '☀️';
        });
    }
    
    // Nav clicks
    $$('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.closest('li').dataset.page;
            if (page) {
                showPage(page);
                // Close mobile menu
                $('#sidebar').classList.remove('active');
            }
        });
    });
    
    // Quick action cards
    $$('.action-card').forEach(card => {
        card.addEventListener('click', () => {
            const page = card.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });
    
    // View all links
    $$('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });
    
    // Modal close
    $$('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            $('#complaintModal').classList.remove('active');
        });
    });
    
    // Logout
    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }
};

// ========================================
// Auth Forms
// ========================================
const initAuthForms = () => {
    const loginForm = $('#loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = $('#loginUsername').value;
            const password = $('#loginPassword').value;
            
            showLoading();
            const success = await auth.login(username, password);
            hideLoading();
            
            if (success) {
                showDashboard(true);
            }
        });
    }
    
    const registerForm = $('#registerFormElement');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                citizenName: registerForm.querySelector('input[placeholder="John"]').value,
                aadhaarNumber: registerForm.querySelector('input[placeholder="1234-5678-9012"]').value,
                phoneNumber: registerForm.querySelector('input[placeholder="9876-543-2101"]').value,
                email: registerForm.querySelector('input[type="email"]').value,
                address: registerForm.querySelector('textarea').value,
                wardNumber: registerForm.querySelector('select').value,
                pincode: registerForm.querySelector('input[placeholder="600001"]').value,
                password: registerForm.querySelectorAll('input[type="password"]')[0].value
            };
            
            showLoading();
            const success = await auth.register(formData);
            hideLoading();
            
            if (success) {
                $('#showLogin').click();
            }
        });
    }
    
    // Switch between login and register
    const showRegister = $('#showRegister');
    const showLogin = $('#showLogin');
    
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            $('#loginForm').classList.add('hidden');
            $('#registerForm').classList.remove('hidden');
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            $('#registerForm').classList.add('hidden');
            $('#loginForm').classList.remove('hidden');
        });
    }
    
    // Password toggle
    $$('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });
};

// ========================================
// View Switching
// ========================================
const showAuthPage = () => {
    $('#authPage').classList.add('visible');
    $('#dashboard').classList.remove('visible');
    hideLoading();
};

const showDashboard = (isLoggedIn) => {
    if (!isLoggedIn) {
        showAuthPage();
        return;
    }
    
    $('#authPage').classList.remove('visible');
    $('#dashboard').classList.add('visible');
    
    // Initialize dashboard
    showPage('dashboard');
};

// ========================================
// Initialize Application
// ========================================
const init = () => {
    // Apply saved theme
    if (state.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        $('#themeToggle').textContent = '☀️';
    }
    
    // Check authentication
    if (auth.checkAuth()) {
        showDashboard(true);
    } else {
        showAuthPage();
    }
    
    // Initialize UI handlers
    initUIHandlers();
    initAuthForms();
    initComplaintForm();
    initTrackComplaint();
    
    // Simulate loading complete
    setTimeout(() => {
        hideLoading();
    }, 2000);
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export for global access
window.viewComplaint = viewComplaint;
window.showPage = showPage;
window.showToast = showToast;
