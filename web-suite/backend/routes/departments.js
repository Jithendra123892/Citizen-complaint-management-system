/**
 * Departments Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const departments = await db.queryRows(
        'SELECT * FROM departments WHERE is_active = 1 ORDER BY department_name'
    );

    res.json({ status: 'success', data: { departments } });
}));

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );

    if (!department) {
        throw new AppError('Department not found', 404);
    }

    // Get complaint stats
    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as pending,
            ROUND(
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(*), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_resolution_hours
         FROM complaints
         WHERE department_id = ?`,
        [req.params.id]
    );

    // Get officer count
    const officerCount = await db.queryRow(
        'SELECT COUNT(*) as count FROM officers WHERE department_id = ? AND is_active = 1',
        [req.params.id]
    );

    res.json({
        status: 'success',
        data: { department, stats, officerCount: officerCount.count }
    });
}));

// @route   GET /api/departments/:id/complaints
// @desc    Get department complaints
// @access  Private
router.get('/:id/complaints', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    let whereClause = 'c.department_id = ?';
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

    const complaints = await db.queryRaw(
        `SELECT c.*, ct.category_name, o.officer_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    const response = require('../utils/helpers').buildPaginationResponse(complaints, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   GET /api/departments/:id/officers
// @desc    Get department officers
// @access  Public
router.get('/:id/officers', asyncHandler(async (req, res) => {
    const officers = await db.queryRows(
        `SELECT officer_id, officer_name, badge_number, designation, contact_number, email
         FROM officers
         WHERE department_id = ? AND is_active = 1
         ORDER BY officer_name`,
        [req.params.id]
    );

    res.json({ status: 'success', data: { officers } });
}));

module.exports = router;
