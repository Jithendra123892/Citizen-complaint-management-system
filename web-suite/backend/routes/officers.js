/**
 * Officers Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/officers
// @desc    Get all officers
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, department } = req.query;

    let whereClause = 'o.is_active = 1';
    const params = [];

    if (department) {
        whereClause += ' AND o.department_id = ?';
        params.push(department);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM officers o WHERE ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    const officers = await db.queryRaw(
        `SELECT o.*, d.department_name
         FROM officers o
         LEFT JOIN departments d ON o.department_id = d.department_id
         WHERE ${whereClause}
         ORDER BY o.officer_name
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    const response = require('../utils/helpers').buildPaginationResponse(officers, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   GET /api/officers/:id
// @desc    Get officer by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const officer = await db.queryRow(
        `SELECT o.*, d.department_name
         FROM officers o
         LEFT JOIN departments d ON o.department_id = d.department_id
         WHERE o.officer_id = ?`,
        [req.params.id]
    );

    if (!officer) {
        throw new AppError('Officer not found', 404);
    }

    // Get workload stats
    const stats = await db.queryRow(
        `SELECT 
            COUNT(c.complaint_id) as assigned_complaints,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as active_cases,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_resolution_hours,
            ROUND(
                SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as resolution_rate
         FROM complaints c
         WHERE c.assigned_officer_id = ?`,
        [req.params.id]
    );

    res.json({
        status: 'success',
        data: { officer, stats }
    });
}));

// @route   GET /api/officers/:id/complaints
// @desc    Get officer's assigned complaints
// @access  Private
router.get('/:id/complaints', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    let whereClause = 'c.assigned_officer_id = ?';
    const params = [req.params.id];

    if (status) {
        whereClause += ' AND c.status = ?';
        params.push(status);
    }

    const { limit: limitNum, offset } = require('../utils/helpers').paginate(page, limit);

    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    const complaints = await db.queryRows(
        `SELECT c.*, ct.category_name, d.department_name, ci.citizen_name, ci.phone_number
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE ${whereClause}
         ORDER BY 
            CASE c.priority 
                WHEN 'Critical' THEN 1 
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                ELSE 4 
            END,
            c.created_at ASC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
    );

    const response = require('../utils/helpers').buildPaginationResponse(complaints, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   POST /api/officers
// @desc    Create new officer
// @access  Private (Admin)
router.post('/', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const {
        officerName, badgeNumber, departmentId,
        designation, contactNumber, email, dateOfJoining
    } = req.body;

    // Check for duplicate badge number
    const existing = await db.queryRow(
        'SELECT officer_id FROM officers WHERE badge_number = ?',
        [badgeNumber]
    );

    if (existing) {
        throw new AppError('Officer with this badge number already exists', 400);
    }

    const result = await db.query(
        `INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email, date_of_joining)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [officerName, badgeNumber, departmentId, designation, contactNumber, email, dateOfJoining]
    );

    const officerId = result.insertId;

    const officer = await db.queryRow(
        `SELECT o.*, d.department_name
         FROM officers o
         LEFT JOIN departments d ON o.department_id = d.department_id
         WHERE o.officer_id = ?`,
        [officerId]
    );

    res.status(201).json({
        status: 'success',
        message: 'Officer created successfully',
        data: { officer }
    });
}));

// @route   PUT /api/officers/:id
// @desc    Update officer
// @access  Private (Admin)
router.put('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const officer = await db.queryRow(
        'SELECT * FROM officers WHERE officer_id = ?',
        [req.params.id]
    );

    if (!officer) {
        throw new AppError('Officer not found', 404);
    }

    const updates = req.body;
    await db.query(
        `UPDATE officers SET ? WHERE officer_id = ?`,
        [updates, req.params.id]
    );

    const updatedOfficer = await db.queryRow(
        `SELECT o.*, d.department_name
         FROM officers o
         LEFT JOIN departments d ON o.department_id = d.department_id
         WHERE o.officer_id = ?`,
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Officer updated successfully',
        data: { officer: updatedOfficer }
    });
}));

// @route   PUT /api/officers/:id/deactivate
// @desc    Deactivate officer
// @access  Private (Admin)
router.put('/:id/deactivate', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const officer = await db.queryRow(
        'SELECT * FROM officers WHERE officer_id = ?',
        [req.params.id]
    );

    if (!officer) {
        throw new AppError('Officer not found', 404);
    }

    await db.query(
        'UPDATE officers SET is_active = 0 WHERE officer_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Officer deactivated successfully'
    });
}));

module.exports = router;
