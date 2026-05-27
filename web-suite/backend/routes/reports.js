/**
 * Reports Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/summary
// @desc    Get complaint summary report
// @access  Private (Admin/Officer)
router.get('/summary', authMiddleware, asyncHandler(async (req, res) => {
    const { startDate, endDate, department } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    if (department) {
        whereClause += ' AND c.department_id = ?';
        params.push(department);
    }

    const summary = await db.queryRow(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN c.status = 'Closed' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN c.status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN c.priority = 'Critical' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN c.priority = 'High' THEN 1 ELSE 0 END) as high,
            SUM(CASE WHEN c.priority = 'Medium' THEN 1 ELSE 0 END) as medium,
            SUM(CASE WHEN c.priority = 'Low' THEN 1 ELSE 0 END) as low,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_resolution_hours
         FROM complaints c
         WHERE ${whereClause}`,
        params
    );

    // Department breakdown
    const byDepartment = await db.queryRows(
        `SELECT 
            d.department_name,
            COUNT(c.complaint_id) as total,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            ROUND(
                SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as resolution_rate
         FROM departments d
         LEFT JOIN complaints c ON d.department_id = c.department_id AND ${whereClause}
         GROUP BY d.department_id, d.department_name`
    );

    // Status breakdown
    const byStatus = await db.queryRows(
        `SELECT status, COUNT(*) as count
         FROM complaints c
         WHERE ${whereClause}
         GROUP BY status`,
        params
    );

    res.json({
        status: 'success',
        data: { summary, byDepartment, byStatus }
    });
}));

// @route   GET /api/reports/department/:id
// @desc    Get department performance report
// @access  Private (Admin/Officer)
router.get('/department/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let whereClause = 'c.department_id = ?';
    const params = [req.params.id];

    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );

    if (!department) {
        throw new AppError('Department not found', 404);
    }

    const performance = await db.queryRow(
        `SELECT 
            COUNT(c.complaint_id) as total_received,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
            ROUND(
                SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_resolution_hours,
            SUM(CASE WHEN c.priority = 'Critical' THEN 1 ELSE 0 END) as critical_cases
         FROM complaints c
         WHERE ${whereClause}`,
        params
    );

    // Category breakdown
    const byCategory = await db.queryRows(
        `SELECT 
            ct.category_name,
            COUNT(c.complaint_id) as total,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_hours
         FROM complaint_categories ct
         LEFT JOIN complaints c ON ct.category_id = c.category_id AND ${whereClause}
         WHERE ct.department_id = ?
         GROUP BY ct.category_id, ct.category_name`,
        [req.params.id]
    );

    // Officer performance
    const byOfficer = await db.queryRows(
        `SELECT 
            o.officer_name,
            o.badge_number,
            COUNT(c.complaint_id) as assigned,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_hours
         FROM officers o
         LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id AND ${whereClause}
         WHERE o.department_id = ? AND o.is_active = 1
         GROUP BY o.officer_id, o.officer_name, o.badge_number`,
        params
    );

    res.json({
        status: 'success',
        data: { department, performance, byCategory, byOfficer }
    });
}));

// @route   GET /api/reports/sla
// @desc    Get SLA performance report
// @access  Private (Admin/Officer)
router.get('/sla', authMiddleware, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    const slaPerformance = await db.queryRows(
        `SELECT 
            d.department_name,
            COUNT(c.complaint_id) as total,
            SUM(CASE 
                WHEN TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at) <= cc.sla_hours 
                THEN 1 ELSE 0 END 
            ) as within_sla,
            SUM(CASE 
                WHEN TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at) > cc.sla_hours 
                THEN 1 ELSE 0 END 
            ) as breached,
            ROUND(
                SUM(CASE 
                    WHEN TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at) <= cc.sla_hours 
                    THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as sla_compliance_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_resolution_hours,
            ROUND(AVG(cc.sla_hours), 1) as avg_sla_hours
         FROM complaints c
         JOIN departments d ON c.department_id = d.department_id
         JOIN complaint_categories cc ON c.category_id = cc.category_id
         WHERE c.status = 'Resolved' AND ${whereClause}
         GROUP BY d.department_id, d.department_name`,
        params
    );

    // Overdue complaints
    const overdue = await db.queryRows(
        `SELECT 
            c.complaint_id, c.complaint_number, c.complaint_title, c.status, c.priority,
            ct.category_name, d.department_name, o.officer_name,
            c.created_at, cc.sla_hours,
            TIMESTAMPDIFF(HOUR, c.created_at, NOW()) as hours_elapsed,
            TIMESTAMPDIFF(HOUR, c.created_at, NOW()) - cc.sla_hours as hours_overdue
         FROM complaints c
         JOIN complaint_categories cc ON c.category_id = cc.category_id
         JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE c.status IN ('Pending', 'In Progress')
           AND TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > cc.sla_hours
           AND ${whereClause}
         ORDER BY hours_overdue DESC`,
        params
    );

    res.json({
        status: 'success',
        data: { slaPerformance, overdue }
    });
}));

// @route   GET /api/reports/export
// @desc    Export report data
// @access  Private (Admin)
router.get('/export', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { type = 'all', format = 'json', startDate, endDate } = req.query;

    let complaints;
    const params = [];
    
    let whereClause = '1=1';
    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    complaints = await db.queryRows(
        `SELECT 
            c.complaint_id, c.complaint_number, c.complaint_title, c.complaint_description,
            c.location, c.latitude, c.longitude, c.priority, c.status,
            c.created_at, c.updated_at, c.resolved_at,
            ci.citizen_name, ci.phone_number, ci.ward_number,
            ct.category_name, d.department_name, o.officer_name
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC`,
        params
    );

    if (format === 'csv') {
        const csv = convertToCSV(complaints);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=complaints-report.csv');
        return res.send(csv);
    }

    res.json({
        status: 'success',
        data: { complaints },
        meta: { exportedAt: new Date(), count: complaints.length }
    });
}));

// @route   POST /api/reports/department
// @desc    Generate department report
// @access  Private (DeptAdmin, Admin)
router.post('/department', authMiddleware, asyncHandler(async (req, res) => {
    const { reportType = 'complaint-summary', startDate, endDate } = req.body;

    let reportData = {};
    const params = [];

    // Get department ID based on user type
    let departmentId;
    if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT department_id FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        departmentId = deptAdmin ? deptAdmin.department_id : null;
    } else if (req.user.type === 'SuperAdmin') {
        departmentId = null; // Admin can see all
    } else {
        throw new AppError('Access denied', 403);
    }

    let whereClause = '1=1';
    if (departmentId) {
        whereClause += ' AND c.department_id = ?';
        params.push(departmentId);
    }
    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    switch (reportType) {
        case 'complaint-summary':
            reportData = await db.queryRow(
                `SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN c.status = 'Rejected' THEN 1 ELSE 0 END) as rejected
                 FROM complaints c
                 WHERE ${whereClause}`,
                params
            );
            break;

        case 'officer-performance':
            reportData.officers = await db.queryRows(
                `SELECT
                    o.officer_id, o.officer_name, o.badge_number,
                    COUNT(c.complaint_id) as assigned,
                    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
                    ROUND(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(c.complaint_id), 0), 2) as resolution_rate
                 FROM officers o
                 LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
                 WHERE ${departmentId ? 'o.department_id = ?' : '1=1'}
                 ${departmentId ? '' : ''}
                 GROUP BY o.officer_id, o.officer_name, o.badge_number
                 ORDER BY resolution_rate DESC`,
                departmentId ? [departmentId] : []
            );
            break;

        case 'category-breakdown':
            reportData.categories = await db.queryRows(
                `SELECT
                    ct.category_name,
                    COUNT(c.complaint_id) as count,
                    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
                 FROM complaint_categories ct
                 LEFT JOIN complaints c ON ct.category_id = c.category_id
                 WHERE ${departmentId ? 'c.department_id = ?' : '1=1'}
                 ${departmentId ? '' : ''}
                 GROUP BY ct.category_id, ct.category_name
                 ORDER BY count DESC`,
                departmentId ? [departmentId] : []
            );
            break;

        case 'time-analysis':
            reportData = await db.queryRow(
                `SELECT
                    AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) as avg_resolution_hours,
                    MIN(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) as min_resolution_hours,
                    MAX(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) as max_resolution_hours
                 FROM complaints c
                 WHERE c.status = 'Resolved' AND c.resolved_at IS NOT NULL AND ${whereClause}`,
                params
            );
            break;

        case 'trend-analysis':
            reportData.monthly = await db.queryRows(
                `SELECT
                    DATE_FORMAT(c.created_at, '%Y-%m') as month,
                    COUNT(*) as total,
                    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
                 FROM complaints c
                 WHERE ${whereClause}
                 GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
                 ORDER BY month DESC
                 LIMIT 12`,
                params
            );
            break;

        case 'citizen-feedback':
            reportData = await db.queryRow(
                `SELECT
                    AVG(c.rating) as avg_rating,
                    COUNT(c.rating) as total_ratings,
                    SUM(CASE WHEN c.rating >= 4 THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN c.rating < 3 THEN 1 ELSE 0 END) as negative
                 FROM complaints c
                 WHERE c.rating IS NOT NULL AND ${whereClause}`,
                params
            );
            break;

        default:
            throw new AppError('Invalid report type', 400);
    }

    res.json({
        status: 'success',
        data: reportData,
        meta: {
            reportType,
            startDate,
            endDate,
            generatedAt: new Date()
        }
    });
}));

function convertToCSV(data) {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value || '';
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

module.exports = router;
