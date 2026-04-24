/**
 * Complaint Categories Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const categories = await db.queryRows(
        `SELECT c.*, d.department_name
         FROM complaint_categories c
         LEFT JOIN departments d ON c.department_id = d.department_id
         ORDER BY c.category_name`
    );

    res.json({ status: 'success', data: { categories } });
}));

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const category = await db.queryRow(
        `SELECT c.*, d.department_name
         FROM complaint_categories c
         LEFT JOIN departments d ON c.department_id = d.department_id
         WHERE c.category_id = ?`,
        [req.params.id]
    );

    if (!category) {
        throw new AppError('Category not found', 404);
    }

    // Get stats
    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_resolution_hours
         FROM complaints
         WHERE category_id = ?`,
        [req.params.id]
    );

    res.json({
        status: 'success',
        data: { category, stats }
    });
}));

// @route   GET /api/categories/:id/complaints
// @desc    Get category complaints
// @access  Private
router.get('/:id/complaints', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    let whereClause = 'c.category_id = ?';
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
        `SELECT c.*, d.department_name, o.officer_name
         FROM complaints c
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ${limitNum} OFFSET ${offset}`,
        params
    );

    const response = require('../utils/helpers').buildPaginationResponse(complaints, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

module.exports = router;
