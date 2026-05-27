/**
 * Departments Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments with stats (filtered by state for SuperAdmin)
// @access  Private
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    let superAdminState = null;

    // Get SuperAdmin state if applicable
    if (req.user.type === 'SuperAdmin') {
        const superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        superAdminState = superAdmin?.state || null;
    }

    // Get all active departments
    const departments = await db.queryRows(
        `SELECT * FROM departments WHERE is_active = 1 ORDER BY department_name`
    );

    // Get stats for each department with state filtering
    const departmentsWithStats = await Promise.all(departments.map(async (dept) => {
        let officerWhere = 'department_id = ? AND is_active = 1';
        let complaintJoin = '';
        let complaintWhere = 'c.department_id = ?';
        let resolvedWhere = 'c.department_id = ? AND c.status = "Resolved"';
        const params = [dept.department_id];
        const resolvedParams = [dept.department_id];

        if (superAdminState) {
            officerWhere += ' AND state = ?';
            complaintJoin = 'JOIN citizens ci ON c.citizen_id = ci.citizen_id';
            complaintWhere += ' AND ci.state = ?';
            resolvedWhere += ' AND ci.state = ?';
            params.push(superAdminState);
            resolvedParams.push(superAdminState);
        }

        const officerCount = await db.queryRow(
            `SELECT COUNT(*) as count FROM officers WHERE ${officerWhere}`,
            params.slice(0, superAdminState ? 2 : 1)
        );

        const totalComplaints = await db.queryRow(
            `SELECT COUNT(*) as count FROM complaints c ${complaintJoin} WHERE ${complaintWhere}`,
            params
        );

        const resolvedComplaints = await db.queryRow(
            `SELECT COUNT(*) as count FROM complaints c ${complaintJoin} WHERE ${resolvedWhere}`,
            resolvedParams
        );

        return {
            ...dept,
            officer_count: officerCount?.count || 0,
            total_complaints: totalComplaints?.count || 0,
            resolved_complaints: resolvedComplaints?.count || 0
        };
    }));

    // Filter out departments with 0 officers for SuperAdmin (optional - remove if you want to show all)
    const filteredDepartments = superAdminState 
        ? departmentsWithStats.filter(d => d.officer_count > 0 || d.total_complaints > 0)
        : departmentsWithStats;

    res.json({ status: 'success', data: { departments: filteredDepartments } });
}));

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (Admin)
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
    const { departmentName, departmentHead, contactNumber, email } = req.body;

    if (!departmentName) {
        throw new AppError('Department name is required', 400);
    }

    const result = await db.query(
        `INSERT INTO departments (department_name, department_head, contact_number, email)
         VALUES (?, ?, ?, ?)`,
        [departmentName, departmentHead || null, contactNumber || null, email || null]
    );

    const departmentId = result.insertId;

    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [departmentId]
    );

    res.status(201).json({
        status: 'success',
        message: 'Department created successfully',
        data: { department }
    });
}));

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    console.log('GET department by ID:', req.params.id, 'Type:', typeof req.params.id);
    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );
    console.log('Department found:', department);

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

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin)
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );

    if (!department) {
        throw new AppError('Department not found', 404);
    }

    const updates = req.body;
    const allowedFields = ['department_name', 'department_head', 'contact_number', 'email'];
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
        `UPDATE departments SET ${updateFields.join(', ')} WHERE department_id = ?`,
        updateValues
    );

    const updatedDepartment = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Department updated successfully',
        data: { department: updatedDepartment }
    });
}));

// @route   PUT /api/departments/:id/status
// @desc    Update department status (activate/deactivate)
// @access  Private (Admin)
router.put('/:id/status', authMiddleware, asyncHandler(async (req, res) => {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
        throw new AppError('is_active must be a boolean', 400);
    }

    const department = await db.queryRow(
        'SELECT * FROM departments WHERE department_id = ?',
        [req.params.id]
    );

    if (!department) {
        throw new AppError('Department not found', 404);
    }

    await db.query(
        'UPDATE departments SET is_active = ? WHERE department_id = ?',
        [is_active, req.params.id]
    );

    res.json({
        status: 'success',
        message: is_active ? 'Department activated successfully' : 'Department deactivated successfully'
    });
}));

module.exports = router;
