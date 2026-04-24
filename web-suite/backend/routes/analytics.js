/**
 * Analytics Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private (Admin/Officer)
router.get('/dashboard', authMiddleware, asyncHandler(async (req, res) => {
    const { period = '30' } = req.query; // days

    // Key metrics
    const metrics = await db.queryRow(
        `SELECT 
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as active,
            ROUND(
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(*), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_resolution_hours,
            SUM(CASE WHEN priority = 'Critical' AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as critical_open,
            ROUND(
                (SELECT COUNT(*) FROM complaints c2 
                 JOIN complaint_categories cc2 ON c2.category_id = cc2.category_id
                 WHERE c2.status IN ('Pending', 'In Progress')
                   AND TIMESTAMPDIFF(HOUR, c2.created_at, NOW()) > cc2.sla_hours
                   AND c2.created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
                ) * 100.0 / 
                NULLIF((SELECT COUNT(*) FROM complaints 
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)), 0), 2
            ) as overdue_rate
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)`
    );

    // Daily trend
    const dailyTrend = await db.queryRows(
        `SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY DATE(created_at)
         ORDER BY date`
    );

    // Category distribution
    const categoryDistribution = await db.queryRows(
        `SELECT 
            ct.category_name,
            COUNT(c.complaint_id) as count,
            ROUND(COUNT(c.complaint_id) * 100.0 / 
                (SELECT COUNT(*) FROM complaints 
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)), 2
            ) as percentage
         FROM complaint_categories ct
         LEFT JOIN complaints c ON ct.category_id = c.category_id 
            AND c.created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY ct.category_id, ct.category_name
         ORDER BY count DESC`
    );

    // Priority distribution
    const priorityDist = await db.queryRows(
        `SELECT 
            priority,
            COUNT(*) as count
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY priority
         ORDER BY FIELD(priority, 'Critical', 'High', 'Medium', 'Low')`
    );

    // Department performance
    const deptPerformance = await db.queryRows(
        `SELECT 
            d.department_name,
            COUNT(c.complaint_id) as total,
            ROUND(
                SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_hours
         FROM departments d
         LEFT JOIN complaints c ON d.department_id = c.department_id
            AND c.created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY d.department_id, d.department_name
         ORDER BY resolution_rate DESC`
    );

    // Top wards with most complaints
    const wardAnalysis = await db.queryRows(
        `SELECT 
            ward_number,
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
         FROM complaints
         WHERE ward_number IS NOT NULL 
           AND created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY ward_number
         ORDER BY total_complaints DESC
         LIMIT 10`
    );

    // Hourly distribution
    const hourlyDist = await db.queryRows(
        `SELECT 
            HOUR(created_at) as hour,
            COUNT(*) as count
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY HOUR(created_at)
         ORDER BY hour`
    );

    // Day of week distribution
    const dowDist = await db.queryRows(
        `SELECT 
            DAYNAME(created_at) as day,
            COUNT(*) as count
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)
         GROUP BY DAYNAME(created_at)
         ORDER BY FIELD(DAYOFWEEK(created_at), 1, 2, 3, 4, 5, 6, 7)`
    );

    res.json({
        status: 'success',
        data: {
            metrics,
            dailyTrend,
            categoryDistribution,
            priorityDist,
            deptPerformance,
            wardAnalysis,
            hourlyDist,
            dowDist
        }
    });
}));

// @route   GET /api/analytics/realtime
// @desc    Get real-time statistics
// @access  Private (Admin/Officer)
router.get('/realtime', authMiddleware, asyncHandler(async (req, res) => {
    const realtime = await db.queryRow(
        `SELECT 
            (SELECT COUNT(*) FROM complaints WHERE status = 'Pending') as pending,
            (SELECT COUNT(*) FROM complaints WHERE status = 'In Progress') as in_progress,
            (SELECT COUNT(*) FROM complaints WHERE status = 'Resolved' AND DATE(resolved_at) = CURDATE()) as resolved_today,
            (SELECT COUNT(*) FROM complaints WHERE DATE(created_at) = CURDATE()) as filed_today,
            (SELECT COUNT(*) FROM complaints c
             JOIN complaint_categories cc ON c.category_id = cc.category_id
             WHERE c.status IN ('Pending', 'In Progress')
               AND TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > cc.sla_hours
            ) as overdue`
    );

    // Recently resolved
    const recentlyResolved = await db.queryRows(
        `SELECT 
            c.complaint_number, c.complaint_title, c.resolved_at,
            ct.category_name, d.department_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         WHERE c.status = 'Resolved'
         ORDER BY c.resolved_at DESC
         LIMIT 5`
    );

    // Recently filed
    const recentlyFiled = await db.queryRows(
        `SELECT 
            c.complaint_number, c.complaint_title, c.created_at,
            ct.category_name, c.priority
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         ORDER BY c.created_at DESC
         LIMIT 5`
    );

    // Critical complaints
    const critical = await db.queryRows(
        `SELECT 
            c.complaint_id, c.complaint_number, c.complaint_title, c.priority, c.status,
            c.created_at, ct.category_name, d.department_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         WHERE c.priority = 'Critical' AND c.status IN ('Pending', 'In Progress')
         ORDER BY c.created_at ASC`
    );

    res.json({
        status: 'success',
        data: { realtime, recentlyResolved, recentlyFiled, critical }
    });
}));

// @route   GET /api/analytics/comparison
// @desc    Get period comparison analytics
// @access  Private (Admin)
router.get('/comparison', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { currentPeriod = 30, previousPeriod = 30 } = req.query;

    const current = await db.queryRow(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_hours
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${currentPeriod} DAY)`
    );

    const previous = await db.queryRow(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_hours
         FROM complaints
         WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL ${parseInt(currentPeriod) + parseInt(previousPeriod)} DAY)
                            AND DATE_SUB(NOW(), INTERVAL ${currentPeriod} DAY)`
    );

    const comparison = {
        total: {
            current: current.total,
            previous: previous.total,
            change: previous.total ? ((current.total - previous.total) / previous.total * 100).toFixed(2) : 0
        },
        resolved: {
            current: current.resolved,
            previous: previous.resolved,
            change: previous.resolved ? ((current.resolved - previous.resolved) / previous.resolved * 100).toFixed(2) : 0
        },
        avgResolutionHours: {
            current: current.avg_hours,
            previous: previous.avg_hours,
            change: previous.avg_hours ? (current.avg_hours - previous.avg_hours).toFixed(1) : 0
        }
    };

    res.json({
        status: 'success',
        data: { comparison }
    });
}));

module.exports = router;
