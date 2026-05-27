/**
 * Citizens Routes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/citizens
// @desc    Get all citizens
// @access  Private (Admin/Officer)
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (search) {
        whereClause += ' AND (citizen_name LIKE ? OR phone_number LIKE ? OR aadhaar_number LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    const { limit: limitNum, offset } = require('../utils/helpers').paginate(page, limit);

    // Get total count
    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM citizens WHERE ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    // Get citizens
    const citizens = await db.queryRaw(
        `SELECT citizen_id, citizen_name, aadhaar_number, phone_number, email, 
                ward_number, pincode, registration_date, is_active
         FROM citizens 
         WHERE ${whereClause}
         ORDER BY registration_date DESC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    const response = require('../utils/helpers').buildPaginationResponse(citizens, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   GET /api/citizens/:id
// @desc    Get citizen by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.params.id]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    // Get complaint count
    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as pending
         FROM complaints WHERE citizen_id = ?`,
        [req.params.id]
    );

    res.json({
        status: 'success',
        data: { citizen, stats }
    });
}));

// @route   PUT /api/citizens/:id
// @desc    Update citizen
// @access  Private (Self or Admin)
router.put('/:id', authMiddleware, [
    body('citizenName').optional().trim().notEmpty(),
    body('phoneNumber').optional().trim(),
    body('email').optional().isEmail(),
    body('address').optional().trim(),
    body('wardNumber').optional().trim(),
    body('pincode').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.params.id]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    // Check ownership or admin
    if (req.user.type !== 'Admin' && 
        (req.user.type !== 'Citizen' || req.user.referenceId !== parseInt(req.params.id))) {
        throw new AppError('Not authorized', 403);
    }

    const updates = req.body;
    const allowedFields = ['name', 'email', 'phone', 'address'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateFields.push(`${field} = ?`);
            updateValues.push(updates[field]);
        }
    }

    if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    updateValues.push(req.params.id);

    await db.query(
        `UPDATE citizens SET ${updateFields.join(', ')} WHERE citizen_id = ?`,
        updateValues
    );

    const updatedCitizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Citizen updated successfully',
        data: { citizen: updatedCitizen }
    });
}));

// @route   GET /api/citizens/:id/complaints
// @desc    Get citizen's complaints
// @access  Private (Self or Admin/Officer)
router.get('/:id/complaints', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, priority } = req.query;

    let whereClause = 'c.citizen_id = ?';
    const params = [req.params.id];

    if (status) {
        whereClause += ' AND c.status = ?';
        params.push(status);
    }

    if (priority) {
        whereClause += ' AND c.priority = ?';
        params.push(priority);
    }

    const { limit: limitNum, offset } = require('../utils/helpers').paginate(page, limit);

    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    const complaints = await db.queryRaw(
        `SELECT c.*, ct.category_name, d.department_name, o.officer_name,
                cc.sla_hours
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    const response = require('../utils/helpers').buildPaginationResponse(complaints, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   GET /api/citizens/profile/me
// @desc    Get current citizen profile
// @access  Private (Citizen)
router.get('/profile/me', authMiddleware, asyncHandler(async (req, res) => {
    if (req.user.type !== 'Citizen') {
        throw new AppError('Not authorized', 403);
    }

    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.user.referenceId]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    // Get complaint stats
    const stats = await db.queryRow(
        `SELECT
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as pending
         FROM complaints WHERE citizen_id = ?`,
        [req.user.referenceId]
    );

    res.json({
        status: 'success',
        data: { citizen, stats }
    });
}));

// @route   PUT /api/citizens/profile
// @desc    Update current citizen profile
// @access  Private (Citizen)
router.put('/profile', authMiddleware, [
    body('citizenName').optional().trim().notEmpty(),
    body('phoneNumber').optional().trim(),
    body('email').optional().isEmail(),
    body('address').optional().trim(),
    body('wardNumber').optional().trim(),
    body('pincode').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    if (req.user.type !== 'Citizen') {
        throw new AppError('Not authorized', 403);
    }

    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.user.referenceId]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    const { citizenName, email, phoneNumber, wardNumber, pincode, address } = req.body;

    await db.query(
        `UPDATE citizens SET
            citizen_name = ?,
            email = ?,
            phone_number = ?,
            ward_number = ?,
            pincode = ?,
            address = ?
         WHERE citizen_id = ?`,
        [citizenName, email, phoneNumber, wardNumber, pincode, address, req.user.referenceId]
    );

    const updatedCitizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.user.referenceId]
    );

    res.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { citizen: updatedCitizen }
    });
}));

// @route   DELETE /api/citizens/account
// @desc    Delete citizen account
// @access  Private (Citizen)
router.delete('/account', authMiddleware, asyncHandler(async (req, res) => {
    if (req.user.type !== 'Citizen') {
        throw new AppError('Not authorized', 403);
    }

    const citizen = await db.queryRow(
        'SELECT * FROM citizens WHERE citizen_id = ?',
        [req.user.referenceId]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    // Delete citizen's complaints first (or handle according to your policy)
    await db.query('DELETE FROM complaints WHERE citizen_id = ?', [req.user.referenceId]);

    // Delete citizen
    await db.query('DELETE FROM citizens WHERE citizen_id = ?', [req.user.referenceId]);

    // Deactivate user account
    await db.query('UPDATE users SET is_active = 0 WHERE user_id = ?', [req.user.id]);

    res.json({
        status: 'success',
        message: 'Account deleted successfully'
    });
}));

module.exports = router;
