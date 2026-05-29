/**
 * CitizenConnect - Auth Handler
 * Uses APP_CONFIG.API_BASE_URL from js/common/config.js
 */

(function() {
    'use strict';

    const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_BASE_URL : '/api';

    // Helper: Navigate to auth page
    function goToAuth() {
        // Strip any subdirectory path and redirect to auth.html in web-suite root
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
        window.location.href = basePath + '/auth.html';
    }

    // Helper: Navigate to role dashboard
    function goToDashboard(userType) {
        const paths = {
            'SuperAdmin': 'admin/dashboard.html',
            'Admin': 'admin/dashboard.html',
            'DeptAdmin': 'dept-admin/dashboard.html',
            'Officer': 'officer/dashboard.html',
            'Citizen': 'citizen/dashboard.html'
        };
        const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
        const dest = basePath + '/' + (paths[userType] || 'citizen/dashboard.html');
        window.location.replace(dest);
    }

    // Tab switching
    function switchTab(tab) {
        const loginSection = document.getElementById('loginSection');
        const registerSection = document.getElementById('registerSection');
        const tabs = document.querySelectorAll('.tab-btn');

        if (!loginSection || !registerSection) return;

        loginSection.classList.remove('active');
        registerSection.classList.remove('active');
        tabs.forEach(function(t) { t.classList.remove('active'); });

        if (tab === 'login') {
            loginSection.classList.add('active');
            if (tabs[0]) tabs[0].classList.add('active');
        } else {
            registerSection.classList.add('active');
            if (tabs[1]) tabs[1].classList.add('active');
        }
    }

    // Login handler
    function handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('loginUsername');
        const password = document.getElementById('loginPassword');
        if (!username || !password) return;

        const usernameVal = username.value.trim();
        const passwordVal = password.value;

        if (!usernameVal || !passwordVal) {
            showFormMessage('Please enter both username and password.', 'error');
            return;
        }

        showFormMessage('Signing in...', 'info');

        fetch(API_BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameVal, password: passwordVal })
        })
        .then(function(response) {
            return response.json().then(function(data) {
                return { ok: response.ok, status: response.status, data: data };
            });
        })
        .then(function(result) {
            if (result.ok && result.data.status === 'success') {
                // Store token and user
                localStorage.setItem('token', result.data.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.data.user));

                // Clear session flags
                sessionStorage.removeItem('justLoggedOut');

                // Redirect to appropriate dashboard
                goToDashboard(result.data.data.user.type);
            } else {
                // Handle error - show readable message
                const msg = result.data.message || 'Invalid credentials. Please try again.';
                showFormMessage(msg, 'error');
            }
        })
        .catch(function(error) {
            console.error('Login error:', error);
            showFormMessage('Unable to connect to server. Please try again later.', 'error');
        });
    }

    // Register handler
    function handleRegister(e) {
        e.preventDefault();

        const firstName = document.getElementById('regFirstName');
        const lastName = document.getElementById('regLastName');
        const aadhaar = document.getElementById('regAadhaar');
        const email = document.getElementById('regEmail');
        const phone = document.getElementById('regPhone');
        const state = document.getElementById('regState');
        const city = document.getElementById('regCity');
        const ward = document.getElementById('regWard');
        const password = document.getElementById('regPassword');
        const confirmPassword = document.getElementById('regConfirmPassword');

        if (!firstName || !password || !confirmPassword) return;

        const passwordVal = password.value;
        const confirmVal = confirmPassword.value;

        // Basic validation
        if (passwordVal.length < 8) {
            showFormMessage('Password must be at least 8 characters.', 'error');
            return;
        }

        if (passwordVal !== confirmVal) {
            showFormMessage('Passwords do not match. Please try again.', 'error');
            return;
        }

        const userData = {
            citizenName: (firstName.value.trim() + ' ' + (lastName ? lastName.value.trim() : '')).trim(),
            aadhaarNumber: aadhaar ? aadhaar.value.replace(/[-\s]/g, '') : '',
            phoneNumber: phone ? phone.value.replace(/[-\s]/g, '') : '',
            email: email ? email.value.trim() : '',
            state: state ? state.value : '',
            city: city ? city.value.trim() : '',
            wardNumber: ward ? ward.value : '',
            password: passwordVal
        };

        if (!userData.citizenName || !userData.state || !userData.city) {
            showFormMessage('Please fill in all required fields.', 'error');
            return;
        }

        showFormMessage('Creating account...', 'info');

        fetch(API_BASE + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        })
        .then(function(response) {
            return response.json().then(function(data) {
                return { ok: response.ok, status: response.status, data: data };
            });
        })
        .then(function(result) {
            if (result.ok && result.data.status === 'success') {
                showFormMessage('Account created successfully! You can now sign in.', 'success');
                switchTab('login');
                // Clear password fields
                if (password) password.value = '';
                if (confirmPassword) confirmPassword.value = '';
            } else {
                showFormMessage(result.data.message || 'Registration failed. Please try again.', 'error');
            }
        })
        .catch(function(error) {
            console.error('Register error:', error);
            showFormMessage('Unable to connect to server. Please try again later.', 'error');
        });
    }

    // Show inline form message (replaces alert())
    function showFormMessage(message, type) {
        // Try to find existing message element
        var existing = document.querySelector('.form-message');
        if (existing) existing.remove();

        var msg = document.createElement('div');
        msg.className = 'form-message message-' + type;
        msg.textContent = message;
        msg.style.cssText = 'padding:10px 14px;margin-bottom:12px;border-radius:6px;font-size:0.85rem;text-align:center;';

        if (type === 'error') {
            msg.style.background = '#ffebee';
            msg.style.color = '#c62828';
            msg.style.border = '1px solid #ef9a9a';
        } else if (type === 'success') {
            msg.style.background = '#e8f5e9';
            msg.style.color = '#2e7d32';
            msg.style.border = '1px solid #a5d6a7';
        } else {
            msg.style.background = '#e3f2fd';
            msg.style.color = '#1565c0';
            msg.style.border = '1px solid #90caf9';
        }

        var loginForm = document.getElementById('loginForm');
        var registerForm = document.getElementById('registerForm');
        var targetForm = registerForm && registerForm.offsetParent !== null ? registerForm : loginForm;

        if (loginForm) {
            loginForm.parentNode.insertBefore(msg, loginForm);
        }
    }

    // Setup event listeners when DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        // Tab switching
        var loginTab = document.getElementById('loginTab');
        var registerTab = document.getElementById('registerTab');
        var showRegisterLink = document.getElementById('showRegisterLink');
        var showLoginLink = document.getElementById('showLoginLink');

        if (loginTab) {
            loginTab.addEventListener('click', function() { switchTab('login'); });
        }
        if (registerTab) {
            registerTab.addEventListener('click', function() { switchTab('register'); });
        }
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                switchTab('register');
            });
        }
        if (showLoginLink) {
            showLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                switchTab('login');
            });
        }

        // Form submissions
        var loginForm = document.getElementById('loginForm');
        var registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
    });

    // Export for debugging
    window.ccAuth = { switchTab: switchTab, showFormMessage: showFormMessage };
})();