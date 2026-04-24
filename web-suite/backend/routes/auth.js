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
    body('citizenName').trim().notEmpty().withMessage('Name is required'),
    body('aadhaarNumber').trim().isLength({ min: 12, max: 12 }).withMessage('Valid Aadhaar required'),
    body('phoneNumber').trim().isLength({ min: 10, max: 10 }).withMessage('Valid phone required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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
        address, wardNumber, pincode, password
    } = req.body;

    // Check if citizen already exists
    const existingCitizen = await db.queryRow(
        'SELECT citizen_id FROM citizens WHERE aadhaar_number = ? OR phone_number = ?',
        [aadhaarNumber, phoneNumber]
    );

    if (existingCitizen) {
        throw new AppError('Citizen with this Aadhaar or phone already registered', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert citizen
    const citizenResult = await db.query(
        `INSERT INTO citizens (citizen_name, aadhaar_number, phone_number, email, address, ward_number, pincode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [citizenName, aadhaarNumber, phoneNumber, email || null, address || null, wardNumber || null, pincode || null]
    );

    const citizenId = citizenResult.insertId;

    // Create user account
    const username = `citizen_${citizenId}`;
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

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { username, password } = req.body;

    // Find user
    const user = await db.queryRow(
        `SELECT u.*, c.citizen_name, o.officer_name 
         FROM users u
         LEFT JOIN citizens c ON u.user_type = 'Citizen' AND u.reference_id = c.citizen_id
         LEFT JOIN officers o ON u.user_type = 'Officer' AND u.reference_id = o.officer_id
         WHERE u.username = ? AND u.is_active = 1`,
        [username]
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

    res.json({
        status: 'success',
        message: 'Login successful',
        data: {
            user: {
                id: user.user_id,
                username: user.username,
                type: user.user_type,
                name: user.citizen_name || user.officer_name
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

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', authMiddleware, [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { currentPassword, newPassword } = req.body;

    const user = await db.queryRow(
        'SELECT password_hash FROM users WHERE user_id = ?',
        [req.user.id]
    );

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
        throw new AppError('Current password is incorrect', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
        'UPDATE users SET password_hash = ? WHERE user_id = ?',
        [newPasswordHash, req.user.id]
    );

    res.json({
        status: 'success',
        message: 'Password changed successfully'
    });
}));

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email required')
], asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await db.queryRow(
        'SELECT user_id, username FROM users WHERE email = ?',
        [email]
    );

    // Always return success to prevent email enumeration
    res.json({
        status: 'success',
        message: 'If an account exists with this email, a password reset link has been sent.'
    });
}));

module.exports = router;
