/**
 * Authentication Routes
 * Login, Register, Logout, Password Management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.user_id,
            username: user.username,
            userType: user.user_type,
            referenceId: user.reference_id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @route   POST /api/auth/register
// @desc    Register new citizen
// @access  Public
router.post('/register', [
    body('citizenName').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('aadhaarNumber').trim().isLength({ min: 12, max: 12 }).withMessage('Valid Aadhaar number required (12 digits)'),
    body('phoneNumber').trim().isLength({ min: 10, max: 10 }).withMessage('Valid phone number required (10 digits)'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('address').optional().trim(),
    body('wardNumber').optional().trim(),
    body('pincode').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const {
        citizenName, aadhaarNumber, phoneNumber, email,
        state, city, address, wardNumber, pincode, password
    } = req.body;

    // Check if citizen already exists
    const existingCitizen = await db.queryRow(
        'SELECT * FROM citizens WHERE aadhaar_number = ? OR phone_number = ?',
        [aadhaarNumber, phoneNumber]
    );

    let citizenId;
    let username;
    let isExistingCitizen = false;

    if (existingCitizen) {
        // Citizen exists - check if user account exists
        const existingUser = await db.queryRow(
            'SELECT user_id, username FROM users WHERE reference_id = ? AND user_type = "Citizen"',
            [existingCitizen.citizen_id]
        );
        
        if (existingUser) {
            throw new AppError('Citizen with this Aadhaar or phone already registered', 400);
        }
        
        // Citizen exists but no user account - create one
        citizenId = existingCitizen.citizen_id;
        username = `citizen_${citizenId}`;
        isExistingCitizen = true;
        
        // Update citizen info - always update state/city if provided
        await db.query(
            `UPDATE citizens SET citizen_name = ?, email = ?, state = ?, city = ?, address = ?, ward_number = ?, pincode = ?
             WHERE citizen_id = ?`,
            [citizenName, email || existingCitizen.email, state || existingCitizen.state || 'Tamil Nadu', city || existingCitizen.city || 'Chennai',
             address || existingCitizen.address, wardNumber || existingCitizen.ward_number, pincode || existingCitizen.pincode, citizenId]
        );
    } else {
        // Insert new citizen
        const citizenResult = await db.query(
            `INSERT INTO citizens (citizen_name, aadhaar_number, phone_number, email, state, city, address, ward_number, pincode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [citizenName, aadhaarNumber, phoneNumber, email || null, state, city, address || null, wardNumber || null, pincode || null]
        );
        citizenId = citizenResult.insertId;
        username = `citizen_${citizenId}`;
    }

    // Hash password and create user account
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.query(
        `INSERT INTO users (username, password_hash, user_type, reference_id)
         VALUES (?, ?, 'Citizen', ?)`,
        [username, passwordHash, citizenId]
    );

    const userId = await db.queryRow('SELECT LAST_INSERT_ID() as id');

    // Get created user
    const user = await db.queryRow(
        'SELECT user_id, username, user_type, reference_id FROM users WHERE user_id = ?',
        [userId.id]
    );

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
            user: {
                id: user.user_id,
                username: user.username,
                type: user.user_type
            },
            citizen: {
                id: citizenId,
                name: citizenName,
                phone: phoneNumber
            },
            token
        }
    });
}));

// @route   POST /api/auth/register-superadmin
// @desc    Register new SuperAdmin (one-time setup or special access)
// @access  Public (with special authorization)
router.post('/register-superadmin', [
    body('adminName').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('contactNumber').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { adminName, username, password, state, email, contactNumber } = req.body;

    // Check if username already exists
    const existingUser = await db.queryRow(
        'SELECT user_id FROM users WHERE username = ?',
        [username]
    );

    if (existingUser) {
        throw new AppError('Username already exists', 400);
    }

    // Check if state already has a SuperAdmin
    const existingSuperAdmin = await db.queryRow(
        'SELECT super_admin_id FROM super_admins WHERE state = ? AND is_active = TRUE',
        [state]
    );

    if (existingSuperAdmin) {
        throw new AppError(`State ${state} already has a SuperAdmin`, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert super admin
    const superAdminResult = await db.query(
        `INSERT INTO super_admins (admin_name, username, password_hash, state, email, contact_number)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminName, username, passwordHash, state, email || null, contactNumber || null]
    );

    const superAdminId = superAdminResult.insertId;

    // Create user account
    await db.query(
        `INSERT INTO users (username, password_hash, user_type, reference_id)
         VALUES (?, ?, 'SuperAdmin', ?)`,
        [username, passwordHash, superAdminId]
    );

    const userId = await db.queryRow('SELECT LAST_INSERT_ID() as id');

    // Get created user
    const user = await db.queryRow(
        'SELECT user_id, username, user_type, reference_id FROM users WHERE user_id = ?',
        [userId.id]
    );

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
        status: 'success',
        message: 'SuperAdmin registered successfully',
        data: {
            user: {
                id: user.user_id,
                username: user.username,
                type: user.user_type
            },
            superAdminId: superAdminId,
            token: token
        }
    });
}));

// @route   GET /api/auth/user
// @desc    Get current user info
// @access  Private
router.get('/user', authMiddleware, asyncHandler(async (req, res) => {
    let userInfo = {
        id: req.user.id,
        username: req.user.username,
        type: req.user.type,
        referenceId: req.user.referenceId
    };

    // Add additional info based on user type
    if (req.user.type === 'SuperAdmin') {
        const superAdmin = await db.queryRow(
            'SELECT state, email, contact_number FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        if (superAdmin) {
            userInfo.state = superAdmin.state;
            userInfo.email = superAdmin.email;
            userInfo.contactNumber = superAdmin.contact_number;
        }
    } else if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT state, city, email, contact_number FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (deptAdmin) {
            userInfo.state = deptAdmin.state;
            userInfo.city = deptAdmin.city;
            userInfo.email = deptAdmin.email;
            userInfo.contactNumber = deptAdmin.contact_number;
        }
    } else if (req.user.type === 'Officer') {
        const officer = await db.queryRow(
            'SELECT state, city, email, contact_number FROM officers WHERE officer_id = ?',
            [req.user.referenceId]
        );
        if (officer) {
            userInfo.state = officer.state;
            userInfo.city = officer.city;
            userInfo.email = officer.email;
            userInfo.contactNumber = officer.contact_number;
        }
    } else if (req.user.type === 'Citizen') {
        const citizen = await db.queryRow(
            'SELECT state, city, email, phone_number FROM citizens WHERE citizen_id = ?',
            [req.user.referenceId]
        );
        if (citizen) {
            userInfo.state = citizen.state;
            userInfo.city = citizen.city;
            userInfo.email = citizen.email;
            userInfo.phoneNumber = citizen.phone_number;
        }
    }

    res.json({
        status: 'success',
        data: userInfo
    });
}));

// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginLimiter, [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { username, password } = req.body;

    // Find user by username, email, phone number, or badge number
    const user = await db.queryRow(
        `SELECT u.*, c.citizen_name, c.email as citizen_email, c.phone_number as citizen_phone,
                o.officer_name, o.badge_number as officer_badge,
                da.admin_name as dept_admin_name
         FROM users u
         LEFT JOIN citizens c ON u.user_type = 'Citizen' AND u.reference_id = c.citizen_id
         LEFT JOIN officers o ON u.user_type = 'Officer' AND u.reference_id = o.officer_id
         LEFT JOIN department_admins da ON u.user_type = 'DeptAdmin' AND u.reference_id = da.dept_admin_id
         WHERE (u.username = ? OR c.email = ? OR c.phone_number = ? OR o.badge_number = ? OR da.username = ?) 
           AND u.is_active = 1`,
        [username, username, username, username, username]
    );

    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = ?',
        [user.user_id]
    );

    // Generate token
    const token = generateToken(user);

    // Determine name based on user type
    let name = user.username;
    if (user.user_type === 'Citizen') {
        name = user.citizen_name;
    } else if (user.user_type === 'Officer') {
        name = user.officer_name;
    } else if (user.user_type === 'DeptAdmin') {
        name = user.dept_admin_name;
    } else if (user.user_type === 'SuperAdmin') {
        name = 'Super Administrator';
    }

    res.json({
        status: 'success',
        message: 'Login successful',
        data: {
            user: {
                id: user.user_id,
                username: user.username,
                type: user.user_type,
                name: name,
                referenceId: user.reference_id
            },
            token
        }
    });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    let user = null;

    if (req.user.type === 'Citizen') {
        user = await db.queryRow(
            `SELECT u.user_id, u.username, u.user_type, u.created_at,
                    c.citizen_id, c.citizen_name, c.phone_number, c.ward_number, c.email
             FROM users u
             LEFT JOIN citizens c ON u.reference_id = c.citizen_id
             WHERE u.user_id = ?`,
            [req.user.id]
        );
    } else if (req.user.type === 'Officer') {
        user = await db.queryRow(
            `SELECT u.user_id, u.username, u.user_type, u.created_at,
                    o.officer_id, o.officer_name, o.badge_number, o.designation, o.email,
                    d.department_id, d.department_name
             FROM users u
             LEFT JOIN officers o ON u.reference_id = o.officer_id
             LEFT JOIN departments d ON o.department_id = d.department_id
             WHERE u.user_id = ?`,
            [req.user.id]
        );
    } else if (req.user.type === 'DeptAdmin') {
        user = await db.queryRow(
            `SELECT u.user_id, u.username, u.user_type, u.created_at,
                    da.dept_admin_id, da.admin_name, da.email, da.contact_number,
                    d.department_id, d.department_name
             FROM users u
             LEFT JOIN department_admins da ON u.reference_id = da.dept_admin_id
             LEFT JOIN departments d ON da.department_id = d.department_id
             WHERE u.user_id = ?`,
            [req.user.id]
        );
    } else {
        user = await db.queryRow(
            `SELECT user_id, username, user_type, created_at
             FROM users WHERE user_id = ?`,
            [req.user.id]
        );
    }

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.json({
        status: 'success',
        data: { user }
    });
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
    // In a real app, you might blacklist the token
    res.json({
        status: 'success',
        message: 'Logged out successfully'
    });
}));

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authMiddleware, [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await db.queryRow(
        'SELECT * FROM users WHERE user_id = ?',
        [req.user.id]
    );

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [passwordHash, req.user.id]
    );

    res.json({
        status: 'success',
        message: 'Password changed successfully'
    });
}));

// @route   GET /api/auth/check-citizen/:email
// @desc    Check if citizen exists (diagnostic)
// @access  Public
router.get('/check-citizen/:email', asyncHandler(async (req, res) => {
    const email = req.params.email;
    
    // Check citizen table
    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE email = ?',
        [email]
    );
    
    if (!citizen) {
        return res.json({ status: 'not_found', message: 'No citizen with this email' });
    }
    
    // Check for associated user account
    const user = await db.queryRow(
        `SELECT u.* FROM users u WHERE u.reference_id = ? AND u.user_type = 'Citizen'`,
        [citizen.citizen_id]
    );
    
    res.json({
        status: 'found',
        citizen: {
            id: citizen.citizen_id,
            name: citizen.citizen_name,
            email: citizen.email,
            phone: citizen.phone_number,
            aadhaar: citizen.aadhaar_number
        },
        user: user ? {
            id: user.user_id,
            username: user.username,
            type: user.user_type,
            is_active: user.is_active
        } : null,
        hasUserAccount: !!user
    });
}));

module.exports = router;
