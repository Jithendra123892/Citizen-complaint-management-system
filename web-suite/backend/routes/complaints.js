/**
 * Complaints Routes
 * Full CRUD operations for complaints
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize, isOfficer } = require('../middleware/auth');
const { generateComplaintNumber, checkSLAStatus } = require('../utils/helpers');

const router = express.Router();

// @route   GET /api/complaints
// @desc    Get all complaints with filters
// @access  Private
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    const { 
        page = 1, limit = 10, 
        status, priority, category, department, 
        citizen, assignedTo, search,
        startDate, endDate
    } = req.query;

    let whereClause = '1=1';
    const params = [];

    // Citizens can only see their own complaints
    if (req.user.type === 'Citizen') {
        whereClause += ' AND c.citizen_id = ?';
        params.push(req.user.referenceId);
    }

    if (status) {
        whereClause += ' AND c.status = ?';
        params.push(status);
    }

    if (priority) {
        whereClause += ' AND c.priority = ?';
        params.push(priority);
    }

    if (category) {
        whereClause += ' AND c.category_id = ?';
        params.push(category);
    }

    if (department) {
        whereClause += ' AND c.department_id = ?';
        params.push(department);
    }

    if (citizen) {
        whereClause += ' AND c.citizen_id = ?';
        params.push(citizen);
    }

    if (assignedTo) {
        whereClause += ' AND c.assigned_officer_id = ?';
        params.push(assignedTo);
    }

    if (search) {
        whereClause += ' AND (c.complaint_title LIKE ? OR c.complaint_number LIKE ? OR c.complaint_description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (startDate) {
        whereClause += ' AND DATE(c.created_at) >= ?';
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ' AND DATE(c.created_at) <= ?';
        params.push(endDate);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM complaints c WHERE ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    const complaints = await db.queryRaw(
        `SELECT c.*, ct.category_name, d.department_name, o.officer_name,
                ci.citizen_name, ci.phone_number, cc.sla_hours
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
         WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ${limitNum} OFFSET ${offsetNum}`,
        params
    );

    // Add SLA status to each complaint
    const complaintsWithSLA = complaints.map(c => {
        const slaStatus = checkSLAStatus(c.created_at, c.sla_hours, c.status);
        return { ...c, sla_status: slaStatus };
    });

    const response = require('../utils/helpers').buildPaginationResponse(complaintsWithSLA, total, page, limitNum);
    res.json({ status: 'success', data: response });
}));

// @route   GET /api/complaints/stats
// @desc    Get complaint statistics
// @access  Private
router.get('/stats/summary', authMiddleware, asyncHandler(async (req, res) => {
    let whereClause = '1=1';
    const params = [];

    // Citizens can only see their own complaint stats
    if (req.user.type === 'Citizen' && req.user.referenceId) {
        whereClause += ' AND citizen_id = ?';
        params.push(req.user.referenceId);
    }

    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN priority = 'Critical' AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as critical_open,
            SUM(CASE WHEN priority = 'High' AND status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as high_open
         FROM complaints
         WHERE ${whereClause}`,
        params
    );

    const monthly = await db.queryRows(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
         FROM complaints
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY month DESC`
    );

    res.json({
        status: 'success',
        data: { summary: stats, monthly }
    });
}));

// @route   GET /api/complaints/track/:complaintNumber
// @desc    Track complaint by complaint number
// @access  Public
router.get('/track/:complaintNumber', asyncHandler(async (req, res) => {
    const complaint = await db.queryRow(
        `SELECT c.complaint_id, c.complaint_number, c.complaint_title, c.status, 
                c.priority, c.location, c.created_at, c.resolved_at,
                ct.category_name, d.department_name, o.officer_name, o.contact_number
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         WHERE c.complaint_number = ?`,
        [req.params.complaintNumber]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    const history = await db.queryRows(
        `SELECT previous_status, new_status, change_reason, changed_at
         FROM complaint_status_history
         WHERE complaint_id = ?
         ORDER BY changed_at ASC`,
        [complaint.complaint_id]
    );

    res.json({
        status: 'success',
        data: { complaint, history }
    });
}));

// @route   GET /api/complaints/:id
// @desc    Get complaint by ID
// @access  Private
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const complaint = await db.queryRow(
        `SELECT c.*, ct.category_name, ct.sla_hours, d.department_name, 
                o.officer_name, o.badge_number, o.contact_number as officer_contact,
                ci.citizen_name, ci.phone_number, ci.email as citizen_email
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE c.complaint_id = ?`,
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Check ownership
    if (req.user.type === 'Citizen' && complaint.citizen_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    // Get status history
    const history = await db.queryRows(
        `SELECT h.*, o.officer_name
         FROM complaint_status_history h
         LEFT JOIN officers o ON h.changed_by = o.officer_id
         WHERE h.complaint_id = ?
         ORDER BY h.changed_at ASC`,
        [req.params.id]
    );

    // Get attachments
    const attachments = await db.queryRows(
        'SELECT * FROM complaint_attachments WHERE complaint_id = ?',
        [req.params.id]
    );

    // Add SLA status
    const slaStatus = checkSLAStatus(complaint.created_at, complaint.sla_hours, complaint.status);

    res.json({
        status: 'success',
        data: { complaint: { ...complaint, sla_status: slaStatus }, history, attachments }
    });
}));

// @route   POST /api/complaints
// @desc    Create new complaint with AUTO-DEPARTMENT ALLOCATION
// @access  Private (Citizen)
router.post('/', authMiddleware, [
    body('categoryId').isInt().withMessage('Valid category required'),
    body('complaintTitle').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
    body('complaintDescription').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('location').trim().notEmpty().withMessage('Location required'),
    body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical'])
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    if (req.user.type !== 'Citizen') {
        throw new AppError('Only citizens can file complaints', 403);
    }

    const {
        categoryId, complaintTitle, complaintDescription,
        location, latitude, longitude, priority = 'Medium'
    } = req.body;

    // Get category details including department_id (AUTO-ALLOCATION LOGIC)
    const category = await db.queryRow(
        'SELECT cc.*, d.department_name FROM complaint_categories cc ' +
        'LEFT JOIN departments d ON cc.department_id = d.department_id ' +
        'WHERE cc.category_id = ?',
        [categoryId]
    );

    if (!category) {
        throw new AppError('Invalid category selected', 400);
    }

    if (!category.department_id) {
        throw new AppError('No department assigned to this category', 400);
    }

    console.log(`Auto-allocating complaint to department: ${category.department_name} (ID: ${category.department_id})`);

    // Check for duplicate complaint
    const duplicate = await db.queryRow(
        `SELECT complaint_id FROM complaints
         WHERE citizen_id = ? AND category_id = ? AND location LIKE ?
         AND status IN ('Pending', 'In Progress')`,
        [req.user.referenceId, categoryId, `%${location}%`]
    );

    if (duplicate) {
        throw new AppError('A similar complaint already exists at this location', 400);
    }

    // Generate complaint number
    const complaintNumber = await generateComplaintNumber(db, categoryId);

    // Insert complaint with AUTO-ALLOCATED department_id
    const result = await db.query(
        `INSERT INTO complaints (
            complaint_number, citizen_id, category_id, department_id,
            complaint_title, complaint_description, location,
            latitude, longitude, priority, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
        [
            complaintNumber, req.user.referenceId, categoryId, category.department_id,
            complaintTitle, complaintDescription, location,
            latitude || null, longitude || null, priority
        ]
    );

    const complaintId = result.insertId;

    // Create status history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, NULL, 'Pending', ?, 'Complaint filed by citizen')`,
        [complaintId, req.user.referenceId]
    );

    // Fetch complete complaint details with department info
    const complaint = await db.queryRow(
        `SELECT c.*, ct.category_name, d.department_name
         FROM complaints c
         LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
         LEFT JOIN departments d ON c.department_id = d.department_id
         WHERE c.complaint_id = ?`,
        [complaintId]
    );

    res.status(201).json({
        status: 'success',
        message: 'Complaint filed and auto-assigned successfully',
        data: { 
            complaint,
            autoAllocation: {
                category: category.category_name,
                department: category.department_name,
                departmentId: category.department_id
            }
        }
    });
}));

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private (Admin/Officer only - limited fields)
router.put('/:id', authMiddleware, isOfficer, [
    body('complaintTitle').optional().trim().isLength({ min: 5, max: 200 }),
    body('complaintDescription').optional().trim().isLength({ min: 10 }),
    body('location').optional().trim(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    const { complaintTitle, complaintDescription, location, latitude, longitude } = req.body;

    await db.query(
        `UPDATE complaints SET
            complaint_title = COALESCE(?, complaint_title),
            complaint_description = COALESCE(?, complaint_description),
            location = COALESCE(?, location),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude)
         WHERE complaint_id = ?`,
        [complaintTitle, complaintDescription, location, latitude, longitude, req.params.id]
    );

    const updatedComplaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Complaint updated successfully',
        data: { complaint: updatedComplaint }
    });
}));

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Officer/Admin)
router.put('/:id/status', authMiddleware, isOfficer, [
    body('status').isIn(['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected']).withMessage('Invalid status'),
    body('changeReason').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { status, changeReason } = req.body;

    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Validate status transition
    const validTransitions = {
        'Pending': ['In Progress', 'Rejected'],
        'In Progress': ['Resolved', 'Pending'],
        'Resolved': ['Closed'],
        'Rejected': [],
        'Closed': []
    };

    if (!validTransitions[complaint.status].includes(status)) {
        throw new AppError(`Cannot transition from ${complaint.status} to ${status}`, 400);
    }

    // Update status
    const updateData = { status };
    if (status === 'Resolved') {
        updateData.resolved_at = new Date();
    }

    await db.query(
        `UPDATE complaints SET ? WHERE complaint_id = ?`,
        [updateData, req.params.id]
    );

    // Get officer ID
    const officer = await db.queryRow(
        'SELECT officer_id FROM officers WHERE user_id = ?',
        [req.user.id]
    );

    // Create history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, complaint.status, status, officer?.officer_id || req.user.id, changeReason || null]
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

// @route   PUT /api/complaints/:id/assign
// @desc    Assign complaint to officer
// @access  Private (Officer/Admin)
router.put('/:id/assign', authMiddleware, isOfficer, [
    body('officerId').isInt().withMessage('Valid officer required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { officerId } = req.body;

    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Verify officer exists
    const officer = await db.queryRow(
        'SELECT * FROM officers WHERE officer_id = ? AND is_active = 1',
        [officerId]
    );

    if (!officer) {
        throw new AppError('Officer not found', 404);
    }

    // Update assignment
    await db.query(
        `UPDATE complaints SET assigned_officer_id = ?, status = 'In Progress' WHERE complaint_id = ?`,
        [officerId, req.params.id]
    );

    // Get officer for user ID
    const assigningOfficer = await db.queryRow(
        'SELECT officer_id FROM officers WHERE user_id = ?',
        [req.user.id]
    );

    // Create history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, 'In Progress', ?, 'Assigned to officer')`,
        [req.params.id, complaint.status, assigningOfficer?.officer_id || req.user.id]
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

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    await db.query('DELETE FROM complaints WHERE complaint_id = ?', [req.params.id]);

    res.json({
        status: 'success',
        message: 'Complaint deleted successfully'
    });
}));

module.exports = router;
