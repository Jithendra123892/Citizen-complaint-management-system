/**
 * Department Admin Routes
 * Registration and management by department admins
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

// @route   POST /api/dept-admin/register
// @desc    Register new department admin (by super admin)
// @access  Private (Super Admin only)
router.post('/register', authMiddleware, [
    body('adminName').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('departmentId').isInt().withMessage('Department ID required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('contactNumber').optional().trim(),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('city').trim().notEmpty().withMessage('City is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { adminName, username, password, departmentId, email, contactNumber, state, city } = req.body;

    // Verify user is SuperAdmin
    if (req.user.type !== 'SuperAdmin') {
        throw new AppError('Only SuperAdmins can register department admins', 403);
    }

    // Get SuperAdmin's state to validate they're registering for their state
    const superAdmin = await db.queryRow(
        'SELECT state FROM super_admins WHERE super_admin_id = ?',
        [req.user.referenceId]
    );

    if (!superAdmin) {
        throw new AppError('SuperAdmin not found', 404);
    }

    // Validate that the state matches SuperAdmin's state
    if (superAdmin.state !== state) {
        throw new AppError(`You can only register department admins for your state (${superAdmin.state})`, 403);
    }

    // Check if username already exists
    const existingUser = await db.queryRow(
        'SELECT user_id FROM users WHERE username = ?',
        [username]
    );

    if (existingUser) {
        throw new AppError('Username already exists', 400);
    }

    // Check if department+city combination already has an active admin
    const existingAdmin = await db.queryRow(
        'SELECT dept_admin_id FROM department_admins WHERE department_id = ? AND city = ? AND is_active = TRUE',
        [departmentId, city]
    );

    if (existingAdmin) {
        throw new AppError('This department already has an active admin in this city', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert department admin
    const deptAdminResult = await db.query(
        `INSERT INTO department_admins (admin_name, username, password_hash, department_id, email, contact_number, state, city)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminName, username, passwordHash, departmentId, email || null, contactNumber || null, state, city]
    );

    const deptAdminId = deptAdminResult.insertId;

    // Create user account
    await db.query(
        `INSERT INTO users (username, password_hash, user_type, reference_id)
         VALUES (?, ?, 'DeptAdmin', ?)`,
        [username, passwordHash, deptAdminId]
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
        message: 'Department admin registered successfully',
        data: {
            user: {
                id: user.user_id,
                username: user.username,
                type: user.user_type
            },
            deptAdminId: deptAdminId
        }
    });
}));

// @route   POST /api/dept-admin/login
// @desc    Login as department admin
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

    // Find department admin by username
    const user = await db.queryRow(
        `SELECT u.*, da.admin_name, da.department_id, d.department_name
         FROM users u
         JOIN department_admins da ON u.reference_id = da.dept_admin_id
         LEFT JOIN departments d ON da.department_id = d.department_id
         WHERE u.username = ? AND u.user_type = 'DeptAdmin' AND u.is_active = 1`,
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
                name: user.admin_name,
                departmentId: user.department_id,
                departmentName: user.department_name
            },
            token
        }
    });
}));

// @route   GET /api/dept-admin/me
// @desc    Get current department admin
// @access  Private
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const user = await db.queryRow(
        `SELECT u.user_id, u.username, u.user_type, u.created_at, u.last_login,
                da.admin_name, da.department_id, da.email, da.contact_number,
                d.department_name
         FROM users u
         JOIN department_admins da ON u.reference_id = da.dept_admin_id
         LEFT JOIN departments d ON da.department_id = d.department_id
         WHERE u.user_id = ? AND u.user_type = 'DeptAdmin'`,
        [req.user.id]
    );

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.json({
        status: 'success',
        data: { user }
    });
}));

// @route   GET /api/dept-admin/officers
// @desc    Get officers managed by this department admin (filtered by location)
// @access  Private
router.get('/officers', authMiddleware, asyncHandler(async (req, res) => {
    const deptAdminId = req.user.referenceId;

    // Get department admin's location
    const deptAdmin = await db.queryRow(
        'SELECT department_id, state, city FROM department_admins WHERE dept_admin_id = ?',
        [deptAdminId]
    );

    if (!deptAdmin) {
        throw new AppError('Department admin not found', 404);
    }

    let whereClause = 'd.department_id = ?';
    const params = [deptAdmin.department_id];

    // Filter by location if department admin has location data
    if (deptAdmin.state && deptAdmin.city) {
        whereClause += ' AND (o.state IS NULL OR LOWER(o.state) = LOWER(?)) AND (o.city IS NULL OR LOWER(o.city) = LOWER(?))';
        params.push(deptAdmin.state, deptAdmin.city);
    }

    const officers = await db.queryRows(
        `SELECT o.officer_id, o.officer_name, o.badge_number, o.designation,
               o.contact_number, o.email, o.is_active,
               d.department_name,
               (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id) as assigned_count,
               (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND status = 'Resolved') as resolved_count
         FROM officers o
         JOIN departments d ON o.department_id = d.department_id
         WHERE ${whereClause}
         ORDER BY o.officer_name`,
        params
    );

    res.json({
        status: 'success',
        data: { officers }
    });
}));

// @route   POST /api/dept-admin/officers
// @desc    Register new officer (by department admin)
// @access  Private
router.post('/officers', authMiddleware, [
    body('officerName').trim().isLength({ min: 2, max: 50 }).withMessage('Officer name required'),
    body('badgeNumber').trim().notEmpty().withMessage('Badge number required'),
    body('designation').trim().isLength({ min: 2, max: 50 }).withMessage('Designation required'),
    body('contactNumber').trim().notEmpty().withMessage('Contact number required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { officerName, badgeNumber, designation, contactNumber, email, state, city, password } = req.body;
    const deptAdminId = req.user.referenceId;

    // Get department ID from department admin
    const deptAdmin = await db.queryRow(
        'SELECT department_id FROM department_admins WHERE dept_admin_id = ? AND is_active = TRUE',
        [deptAdminId]
    );

    if (!deptAdmin) {
        throw new AppError('Department admin not found', 404);
    }

    const departmentId = deptAdmin.department_id;

    // Check if badge number already exists
    const existingOfficer = await db.queryRow(
        'SELECT officer_id FROM officers WHERE badge_number = ?',
        [badgeNumber]
    );

    if (existingOfficer) {
        throw new AppError('Badge number already exists', 400);
    }

    // Insert officer
    const officerResult = await db.query(
        `INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email, state, city)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [officerName, badgeNumber, departmentId, designation, contactNumber, email || null, state, city]
    );

    const officerId = officerResult.insertId;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user account
    const username = `officer_${officerId}`;
    await db.query(
        `INSERT INTO users (username, password_hash, user_type, reference_id)
         VALUES (?, ?, 'Officer', ?)`,
        [username, passwordHash, officerId]
    );

    res.status(201).json({
        status: 'success',
        message: 'Officer registered successfully',
        data: {
            officerId: officerId,
            username: username
        }
    });
}));

// @route   GET /api/dept-admin/admins
// @desc    Get all department admins (for SuperAdmin)
// @access  Private (SuperAdmin only)
router.get('/admins', authMiddleware, asyncHandler(async (req, res) => {
    // Verify user is SuperAdmin
    if (req.user.type !== 'SuperAdmin') {
        throw new AppError('Only SuperAdmins can view department admins', 403);
    }

    // Get SuperAdmin's state
    const superAdmin = await db.queryRow(
        'SELECT state FROM super_admins WHERE super_admin_id = ?',
        [req.user.referenceId]
    );

    if (!superAdmin) {
        throw new AppError('SuperAdmin not found', 404);
    }

    // Get all department admins for this state
    const admins = await db.queryRows(
        `SELECT da.*, d.department_name 
         FROM department_admins da 
         LEFT JOIN departments d ON da.department_id = d.department_id 
         WHERE da.state = ?
         ORDER BY da.created_at DESC`,
        [superAdmin.state]
    );

    res.json({
        status: 'success',
        data: { admins }
    });
}));

// @route   PUT /api/dept-admin/admins/:id/status
// @desc    Toggle department admin status
// @access  Private (SuperAdmin only)
router.put('/admins/:id/status', authMiddleware, asyncHandler(async (req, res) => {
    const { is_active } = req.body;

    console.log('Toggle status request:', { adminId: req.params.id, is_active, userType: req.user.type });

    // Verify user is SuperAdmin
    if (req.user.type !== 'SuperAdmin') {
        throw new AppError('Only SuperAdmins can update admin status', 403);
    }

    // Check if admin exists
    const admin = await db.queryRow(
        'SELECT * FROM department_admins WHERE dept_admin_id = ?',
        [req.params.id]
    );

    if (!admin) {
        throw new AppError('Department admin not found', 404);
    }

    // Update status
    await db.query(
        'UPDATE department_admins SET is_active = ? WHERE dept_admin_id = ?',
        [is_active, req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Admin status updated successfully'
    });
}));

// @route   GET /api/dept-admin/stats
// @desc    Get department admin statistics
// @access   Private
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
    const deptAdminId = req.user.referenceId;
    console.log('=== DEPT-ADMIN STATS ===');
    console.log('deptAdminId:', deptAdminId);

    // Get department admin's department and location
    const deptAdmin = await db.queryRow(
        'SELECT department_id, state, city FROM department_admins WHERE dept_admin_id = ? AND is_active = TRUE',
        [deptAdminId]
    );
    console.log('deptAdmin:', deptAdmin);

    if (!deptAdmin) {
        throw new AppError('Department admin not found', 404);
    }

    const { department_id, state, city } = deptAdmin;
    console.log('department_id:', department_id, 'state:', state, 'city:', city);

    // Build location filter for officers and complaints
    let officerWhere = 'department_id = ?';
    let complaintWhere = 'c.department_id = ?';
    const officerParams = [department_id];
    const complaintParams = [department_id];

    if (state && city) {
        officerWhere += ' AND state = ? AND city = ?';
        officerParams.push(state, city);
        
        // Use citizens table (ci) for state/city filtering
        complaintWhere += ' AND ci.state = ? AND ci.city = ?';
        complaintParams.push(state, city);
    }

    console.log('officerWhere:', officerWhere, 'officerParams:', officerParams);
    console.log('complaintWhere:', complaintWhere, 'complaintParams:', complaintParams);

    const stats = await db.queryRow(
        `SELECT
            (SELECT COUNT(*) FROM officers WHERE ${officerWhere}) as total_officers,
            (SELECT COUNT(*) FROM complaints c JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE ${complaintWhere}) as total_complaints,
            (SELECT COUNT(*) FROM complaints c JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE ${complaintWhere} AND c.status = 'Resolved') as resolved,
            (SELECT COUNT(*) FROM complaints c JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE ${complaintWhere} AND c.status = 'Pending') as pending,
            (SELECT COUNT(*) FROM complaints c JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE ${complaintWhere} AND c.status = 'In Progress') as in_progress
         FROM department_admins da
         JOIN departments d ON da.department_id = d.department_id
         WHERE da.dept_admin_id = ? AND da.is_active = TRUE`,
        [...officerParams, ...complaintParams, ...complaintParams, ...complaintParams, ...complaintParams, deptAdminId]
    );

    console.log('Stats result:', stats);

    res.json({
        status: 'success',
        data: { stats }
    });
}));

// @route   PUT /api/dept-admin/complaints/:id/assign
// @desc    Assign complaint to officer (by department admin)
// @access  Private (Department Admin)
router.put('/complaints/:id/assign', authMiddleware, asyncHandler(async (req, res) => {
    const { officerId } = req.body;
    const deptAdminId = req.user.referenceId;

    // Get department ID from department admin
    const deptAdmin = await db.queryRow(
        'SELECT department_id FROM department_admins WHERE dept_admin_id = ? AND is_active = TRUE',
        [deptAdminId]
    );

    if (!deptAdmin) {
        throw new AppError('Department admin not found', 404);
    }

    const departmentId = deptAdmin.department_id;

    // Verify complaint belongs to this department
    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    if (complaint.department_id !== departmentId) {
        throw new AppError('Complaint does not belong to your department', 403);
    }

    // Get citizen's location for location-based assignment
    const citizen = await db.queryRow(
        'SELECT state, city FROM citizens WHERE citizen_id = ?',
        [complaint.citizen_id]
    );

    // Verify officer belongs to this department AND matches location
    const officer = await db.queryRow(
        'SELECT * FROM officers WHERE officer_id = ? AND department_id = ? AND state = ? AND city = ?',
        [officerId, departmentId, citizen?.state, citizen?.city]
    );

    if (!officer) {
        // If no location match, try department-only match (fallback)
        const deptOfficer = await db.queryRow(
            'SELECT * FROM officers WHERE officer_id = ? AND department_id = ?',
            [officerId, departmentId]
        );
        if (deptOfficer) {
            console.log('WARNING: Assigning officer from different location. Officer state/city:', deptOfficer.state, deptOfficer.city, 'Citizen state/city:', citizen?.state, citizen?.city);
        } else {
            throw new AppError('Officer not found in your department', 404);
        }
    }

    // Update assignment
    await db.query(
        `UPDATE complaints SET assigned_officer_id = ?, status = 'In Progress', updated_at = NOW() WHERE complaint_id = ?`,
        [officerId, req.params.id]
    );

    // Create history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, 'In Progress', ?, 'Assigned by Department Admin')`,
        [req.params.id, complaint.status, deptAdminId]
    );

    const updatedComplaint = await db.queryRow(
        `SELECT c.*, o.officer_name, o.badge_number
         FROM complaints c
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE c.complaint_id = ?`,
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Complaint assigned successfully',
        data: { complaint: updatedComplaint }
    });
}));

// @route   PUT /api/dept-admin/complaints/:id/status
// @desc    Update complaint status (by department admin)
// @access  Private (Department Admin)
router.put('/complaints/:id/status', authMiddleware, [
    body('status').isIn(['Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed']).withMessage('Invalid status'),
    body('changeReason').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { status, changeReason } = req.body;
    const deptAdminId = req.user.referenceId;

    // Get department ID from department admin
    const deptAdmin = await db.queryRow(
        'SELECT department_id FROM department_admins WHERE dept_admin_id = ? AND is_active = TRUE',
        [deptAdminId]
    );

    if (!deptAdmin) {
        throw new AppError('Department admin not found', 404);
    }

    const departmentId = deptAdmin.department_id;

    // Verify complaint belongs to this department
    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    if (complaint.department_id !== departmentId) {
        throw new AppError('Complaint does not belong to your department', 403);
    }

    // Validate status transition
    const validTransitions = {
        'Pending': ['In Progress', 'Rejected'],
        'In Progress': ['Resolved', 'Pending', 'Rejected'],
        'Resolved': ['Closed'],
        'Rejected': [],
        'Closed': []
    };

    if (!validTransitions[complaint.status].includes(status)) {
        throw new AppError(`Cannot transition from ${complaint.status} to ${status}`, 400);
    }

    // Update status
    if (status === 'Resolved') {
        await db.query(
            `UPDATE complaints SET status = ?, resolved_at = ? WHERE complaint_id = ?`,
            [status, new Date(), req.params.id]
        );
    } else {
        await db.query(
            `UPDATE complaints SET status = ? WHERE complaint_id = ?`,
            [status, req.params.id]
        );
    }

    // Create history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, complaint.status, status, deptAdminId, changeReason || null]
    );

    const updatedComplaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Status updated successfully',
        data: { complaint: updatedComplaint }
    });
}));

module.exports = router;
