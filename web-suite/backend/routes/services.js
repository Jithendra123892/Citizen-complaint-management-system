/**
 * Services Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all services
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, department } = req.query;

        let whereClause = '1=1';
        const params = [];

        if (department) {
            whereClause += ' AND s.department_id = ?';
            params.push(department);
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offsetNum = (pageNum - 1) * limitNum;

        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM services s WHERE ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const services = await db.queryRaw(
            `SELECT s.*, d.department_name, o.officer_name
             FROM services s
             LEFT JOIN departments d ON s.department_id = d.department_id
             LEFT JOIN officers o ON s.officer_id = o.officer_id
             WHERE ${whereClause}
             ORDER BY s.service_id DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            params
        );

        res.json({
            status: 'success',
            data: {
                items: services,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        // Table may not exist - return empty response
        res.json({ status: 'success', data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } });
    }
}));

// @route   GET /api/services/stats
// @desc    Get service statistics
// @access  Public
router.get('/stats', asyncHandler(async (req, res) => {
    try {
        const stats = await db.queryRow(
            `SELECT
                COUNT(*) as total_services,
                SUM(amount) as total_amount,
                COUNT(DISTINCT department_id) as departments_count
             FROM services`
        );

        const byDepartment = await db.query(
            `SELECT d.department_name, COUNT(s.service_id) as service_count, SUM(s.amount) as total_amount
             FROM departments d
             LEFT JOIN services s ON d.department_id = s.department_id
             GROUP BY d.department_id`
        );

        res.json({
            status: 'success',
            data: { stats, byDepartment }
        });
    } catch (error) {
        res.json({ status: 'success', data: { stats: null, byDepartment: [] } });
    }
}));

// @route   GET /api/services/:id
// @desc    Get service by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const service = await db.queryRow(
            `SELECT s.*, d.department_name, o.officer_name
             FROM services s
             LEFT JOIN departments d ON s.department_id = d.department_id
             LEFT JOIN officers o ON s.officer_id = o.officer_id
             WHERE s.service_id = ?`,
            [req.params.id]
        );

        if (!service) {
            throw new AppError('Service not found', 404);
        }

        res.json({
            status: 'success',
            data: { service }
        });
    } catch (error) {
        if (error.message === 'Service not found') throw error;
        res.json({ status: 'success', data: { service: null } });
    }
}));

// @route   POST /api/services
// @desc    Create new service
// @access  Private (Admin)
router.post('/', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { serviceName, amount, departmentId, officerId } = req.body;
    
    const result = await db.query(
        `INSERT INTO services (service_name, amount, department_id, officer_id)
         VALUES (?, ?, ?, ?)`,
        [serviceName, amount, departmentId, officerId]
    );
    
    const service = await db.queryRow('SELECT * FROM services WHERE service_id = ?', [result.insertId]);
    
    res.status(201).json({
        status: 'success',
        message: 'Service created successfully',
        data: { service }
    });
}));

// @route   PUT /api/services/:id
// @desc    Update service
// @access  Private (Admin)
router.put('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { serviceName, amount, departmentId, officerId } = req.body;
    
    await db.query(
        `UPDATE services SET 
            service_name = COALESCE(?, service_name),
            amount = COALESCE(?, amount),
            department_id = COALESCE(?, department_id),
            officer_id = COALESCE(?, officer_id)
         WHERE service_id = ?`,
        [serviceName, amount, departmentId, officerId, req.params.id]
    );
    
    const service = await db.queryRow('SELECT * FROM services WHERE service_id = ?', [req.params.id]);
    
    res.json({
        status: 'success',
        message: 'Service updated successfully',
        data: { service }
    });
}));

// @route   DELETE /api/services/:id
// @desc    Delete service
// @access  Private (Admin)
router.delete('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    await db.query('DELETE FROM services WHERE service_id = ?', [req.params.id]);
    
    res.json({
        status: 'success',
        message: 'Service deleted successfully'
    });
}));

module.exports = router;
