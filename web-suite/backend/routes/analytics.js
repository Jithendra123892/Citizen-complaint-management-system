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
    console.log('=== DASHBOARD API CALLED ===');
    console.log('User:', req.user);
    console.log('User type:', req.user.type);
    console.log('Reference ID:', req.user.referenceId);
    
    const { period = 'all' } = req.query; // 'all' or days

    let whereClause = period === 'all' ? 'WHERE 1=1' : 'WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ' + period + ' DAY)';
    const params = [];
    let superAdmin = null;

    // SuperAdmins should only see data from their state
    if (req.user.type === 'SuperAdmin') {
        superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        console.log('SuperAdmin state:', superAdmin?.state, 'User type:', req.user.type, 'Reference ID:', req.user.referenceId);
        if (superAdmin && superAdmin.state) {
            whereClause += ' AND ci.state = ?';
            params.push(superAdmin.state);
        }
    }

    console.log('whereClause:', whereClause, 'params:', params);

    // Key metrics
    let metricsQuery = `SELECT 
            COUNT(*) as total_complaints,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as active,
            ROUND(
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(*), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) as avg_resolution_hours,
            SUM(CASE WHEN priority = 'Critical' AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as critical_open,
            0 as overdue_rate
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         ${whereClause}`;
    
    const metrics = await db.queryRow(metricsQuery, params);
    console.log('Metrics:', metrics);

    // Daily trend
    const dailyTrend = await db.queryRows(
        `SELECT 
            DATE(c.created_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         ${whereClause}
         GROUP BY DATE(c.created_at)
         ORDER BY date`,
        params
    );

    // Category distribution
    const categoryDateFilter = period === 'all' ? '' : `AND c.created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)`;
    let categoryQuery = `SELECT 
            ct.category_name,
            COUNT(c.complaint_id) as count,
            0 as percentage
         FROM complaint_categories ct
         LEFT JOIN complaints c ON ct.category_id = c.category_id 
            ${categoryDateFilter}
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE 1=1`;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        categoryQuery += ' AND (ci.state = ? OR ci.state IS NULL)';
    }
    
    categoryQuery += ' GROUP BY ct.category_id, ct.category_name ORDER BY count DESC';
    
    const categoryDistribution = await db.queryRows(categoryQuery, req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state ? [superAdmin.state] : []);

    // Priority distribution
    const priorityDist = await db.queryRows(
        `SELECT 
            priority,
            COUNT(*) as count
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         ${whereClause}
         GROUP BY priority
         ORDER BY FIELD(priority, 'Critical', 'High', 'Medium', 'Low')`,
        params
    );

    // Department performance
    const deptDateFilter = period === 'all' ? '' : `AND c.created_at >= DATE_SUB(NOW(), INTERVAL ${period} DAY)`;
    let deptQuery = `SELECT 
            d.department_name,
            COUNT(c.complaint_id) as total,
            ROUND(
                SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(c.complaint_id), 0), 2
            ) as resolution_rate,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) as avg_hours
         FROM departments d
         LEFT JOIN complaints c ON d.department_id = c.department_id
            ${deptDateFilter}
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE 1=1`;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        deptQuery += ' AND (ci.state = ? OR ci.state IS NULL)';
    }
    
    deptQuery += ' GROUP BY d.department_id, d.department_name ORDER BY resolution_rate DESC';
    
    const deptPerformance = await db.queryRows(deptQuery, req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state ? [superAdmin.state] : []);

    // Hourly distribution
    const hourlyDist = await db.queryRows(
        `SELECT 
            HOUR(c.created_at) as hour,
            COUNT(*) as count
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         ${whereClause}
         GROUP BY HOUR(c.created_at)
         ORDER BY hour`,
        params
    );

    // Day of week distribution
    const dowDist = await db.queryRows(
        `SELECT 
            DAYNAME(c.created_at) as day,
            COUNT(*) as count
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         ${whereClause}
         GROUP BY DAYNAME(c.created_at)
         ORDER BY day`,
        params
    );

    // Debug info
    const debug = {
        userType: req.user.type,
        referenceId: req.user.referenceId,
        superAdminState: superAdmin?.state || null,
        whereClause: whereClause,
        params: params
    };

    res.json({
        status: 'success',
        debug: debug,
        data: {
            metrics,
            dailyTrend,
            categoryDistribution,
            priorityDist,
            deptPerformance,
            hourlyDist,
            dowDist
        }
    });
}));

// @route   GET /api/analytics/realtime
// @desc    Get real-time statistics
// @access  Private (Admin/Officer)
router.get('/realtime', authMiddleware, asyncHandler(async (req, res) => {
    let whereClause = '';
    const params = [];
    let superAdmin = null;

    // SuperAdmins should only see data from their state
    if (req.user.type === 'SuperAdmin') {
        superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        console.log('SuperAdmin state:', superAdmin?.state);
        if (superAdmin && superAdmin.state) {
            whereClause = ' AND ci.state = ?';
            params.push(superAdmin.state);
        }
    }

    // Real-time statistics - use simple queries
    let pending = 0, inProgress = 0, resolvedToday = 0, filedToday = 0;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        pending = await db.queryRow(
            'SELECT COUNT(*) as count FROM complaints c LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE c.status = ? AND ci.state = ?',
            ['Pending', superAdmin.state]
        );
        pending = pending ? pending.count : 0;
        
        inProgress = await db.queryRow(
            'SELECT COUNT(*) as count FROM complaints c LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE c.status = ? AND ci.state = ?',
            ['In Progress', superAdmin.state]
        );
        inProgress = inProgress ? inProgress.count : 0;
        
        resolvedToday = await db.queryRow(
            'SELECT COUNT(*) as count FROM complaints c LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE c.status = ? AND DATE(c.resolved_at) = CURDATE() AND ci.state = ?',
            ['Resolved', superAdmin.state]
        );
        resolvedToday = resolvedToday ? resolvedToday.count : 0;
        
        filedToday = await db.queryRow(
            'SELECT COUNT(*) as count FROM complaints c LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id WHERE DATE(c.created_at) = CURDATE() AND ci.state = ?',
            [superAdmin.state]
        );
        filedToday = filedToday ? filedToday.count : 0;
        
        // Get officer count for this state
        const officerCount = await db.queryRow(
            'SELECT COUNT(*) as count FROM officers WHERE state = ? AND is_active = 1',
            [superAdmin.state]
        );
        console.log('Officer count for state', superAdmin.state, ':', officerCount?.count);
    } else {
        pending = await db.queryRow('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['Pending']);
        pending = pending ? pending.count : 0;
        
        inProgress = await db.queryRow('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['In Progress']);
        inProgress = inProgress ? inProgress.count : 0;
        
        resolvedToday = await db.queryRow('SELECT COUNT(*) as count FROM complaints WHERE status = ? AND DATE(resolved_at) = CURDATE()', ['Resolved']);
        resolvedToday = resolvedToday ? resolvedToday.count : 0;
        
        filedToday = await db.queryRow('SELECT COUNT(*) as count FROM complaints WHERE DATE(created_at) = CURDATE()');
        filedToday = filedToday ? filedToday.count : 0;
    }

    const realtime = {
        pending: pending,
        in_progress: inProgress,
        resolved_today: resolvedToday,
        filed_today: filedToday
    };
    
    // Add officer count for SuperAdmin
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        const officerCount = await db.queryRow(
            'SELECT COUNT(*) as count FROM officers WHERE state = ? AND is_active = 1',
            [superAdmin.state]
        );
        realtime.officer_count = officerCount ? officerCount.count : 0;
    } else {
        const officerCount = await db.queryRow(
            'SELECT COUNT(*) as count FROM officers WHERE is_active = 1'
        );
        realtime.officer_count = officerCount ? officerCount.count : 0;
    }
    
    console.log('Realtime stats:', realtime);

    // Recently resolved - simple query
    let recentlyResolvedQuery = `SELECT 
            c.complaint_number, c.complaint_title, c.resolved_at,
            ct.category_name, d.department_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE c.status = 'Resolved'`;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        recentlyResolvedQuery += ' AND ci.state = ?';
    }
    
    recentlyResolvedQuery += ' ORDER BY c.resolved_at DESC LIMIT 5';
    
    const recentlyResolved = await db.queryRows(recentlyResolvedQuery, req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state ? [superAdmin.state] : []);

    // Recently filed - simple query
    let recentlyFiledQuery = `SELECT 
            c.complaint_number, c.complaint_title, c.created_at,
            ct.category_name, c.priority
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id`;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        recentlyFiledQuery += ' WHERE ci.state = ?';
    }
    
    recentlyFiledQuery += ' ORDER BY c.created_at DESC LIMIT 5';
    
    const recentlyFiled = await db.queryRows(recentlyFiledQuery, req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state ? [superAdmin.state] : []);

    // Critical complaints - simple query
    let criticalQuery = `SELECT 
            c.complaint_id, c.complaint_number, c.complaint_title, c.priority, c.status,
            c.created_at, ct.category_name, d.department_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE c.priority = 'Critical' AND c.status IN ('Pending', 'In Progress')`;
    
    if (req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state) {
        criticalQuery += ' AND ci.state = ?';
    }
    
    criticalQuery += ' ORDER BY c.created_at ASC';
    
    const critical = await db.queryRows(criticalQuery, req.user.type === 'SuperAdmin' && superAdmin && superAdmin.state ? [superAdmin.state] : []);

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
