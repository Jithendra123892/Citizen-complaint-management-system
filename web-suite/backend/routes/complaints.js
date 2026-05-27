/**
 * Complaints Routes
 * Full CRUD operations for complaints
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize, isOfficer } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { generateComplaintNumber, checkSLAStatus } = require('../utils/helpers');

const router = express.Router();

// Set up multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter(req, file, cb) {
        // Restrict to safe file types
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf'
        ];
        
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images (JPG, PNG, GIF, WebP) and PDF are allowed.'));
        }
    }
});

// Custom storage to save files with date folder structure
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const fullPath = path.join(uploadDir, dateFolder);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, fullPath);
    },
    filename: function (req, file, cb) {
        // Preserve original file extension
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(2, 15) + ext;
        cb(null, uniqueName);
    }
});

const uploadWithFolders = multer({ storage: storage });

// @route   GET /api/complaints
// @desc    Get all complaints with filtering and pagination
// @access  Private
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, category, priority, department, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    let whereClause = '1=1';
    const params = [];
    let deptAdmin = null;

    // Status filter
    if (status) {
        whereClause += ' AND c.status = ?';
        params.push(status);
    }

    // Category filter
    if (category) {
        whereClause += ' AND c.category_id = ?';
        params.push(category);
    }

    // Priority filter
    if (priority) {
        whereClause += ' AND c.priority = ?';
        params.push(priority);
    }

    if (department) {
        whereClause += ' AND c.department_id = ?';
        params.push(department);
    }

    if (search) {
        whereClause += ' AND (c.complaint_title LIKE ? OR c.complaint_number LIKE ? OR c.complaint_description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    // Role-based filtering
    if (req.user.type === 'Citizen') {
        whereClause += ' AND c.citizen_id = ?';
        params.push(req.user.referenceId);
    } else if (req.user.type === 'Officer') {
        whereClause += ' AND c.assigned_officer_id = ?';
        params.push(req.user.referenceId);
    } else if (req.user.type === 'DeptAdmin') {
        deptAdmin = await db.queryRow(
            'SELECT department_id, state, city FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (deptAdmin) {
            whereClause += ' AND c.department_id = ?';
            params.push(deptAdmin.department_id);
            
            // Filter by location if department admin has location data
            if (deptAdmin.state && deptAdmin.city) {
                whereClause += ' AND ci.state = ? AND ci.city = ?';
                params.push(deptAdmin.state, deptAdmin.city);
            }
        }
    } else if (req.user.type === 'SuperAdmin') {
        const superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        if (superAdmin && superAdmin.state) {
            whereClause += ' AND ci.state = ?';
            params.push(superAdmin.state);
        }
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    // Build FROM clause with necessary joins for location filtering
    let fromClause = 'complaints c';
    // Always include citizens join for DeptAdmin/SuperAdmin location filtering
    if (req.user.type === 'DeptAdmin' || req.user.type === 'SuperAdmin' || whereClause.includes('ci.state') || whereClause.includes('ci.city')) {
        fromClause += ' LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id';
    }

    const countResult = await db.query(
        `SELECT COUNT(*) as total FROM ${fromClause} WHERE ${whereClause}`,
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

    // Get attachments for each complaint
    const complaintsWithAttachments = await Promise.all(complaints.map(async (c) => {
        const attachments = await db.queryRows(
            'SELECT * FROM complaint_attachments WHERE complaint_id = ?',
            [c.complaint_id]
        );
        return { ...c, attachments };
    }));

    // Add SLA status to each complaint
    const complaintsWithSLA = complaintsWithAttachments.map(c => {
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
        whereClause += ' AND c.citizen_id = ?';
        params.push(req.user.referenceId);
    }

    // SuperAdmins should only see data from their state
    if (req.user.type === 'SuperAdmin') {
        const superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        if (superAdmin && superAdmin.state) {
            whereClause += ' AND ci.state = ?';
            params.push(superAdmin.state);
        }
    }

    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN c.status = 'Closed' THEN 1 ELSE 0 END) as closed,
            SUM(CASE WHEN c.status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN c.priority = 'Critical' AND c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as critical_open,
            SUM(CASE WHEN c.priority = 'High' AND c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as high_open
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE ${whereClause}`,
        params
    );

    // Monthly stats with state filtering for SuperAdmin
    let monthlyWhere = 'c.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)';
    const monthlyParams = [];
    
    if (req.user.type === 'SuperAdmin') {
        const superAdmin = await db.queryRow(
            'SELECT state FROM super_admins WHERE super_admin_id = ?',
            [req.user.referenceId]
        );
        if (superAdmin && superAdmin.state) {
            monthlyWhere += ' AND ci.state = ?';
            monthlyParams.push(superAdmin.state);
        }
    }
    
    const monthly = await db.queryRows(
        `SELECT DATE_FORMAT(c.created_at, '%Y-%m') as month, COUNT(*) as count
         FROM complaints c
         LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
         WHERE ${monthlyWhere}
         GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
         ORDER BY month DESC`,
        monthlyParams
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

// @route   GET /api/complaints/officer/performance
// @desc    Get officer performance metrics
// @access  Private (Department Admin only)
router.get('/officer/performance', authMiddleware, asyncHandler(async (req, res) => {
    // Verify user is Department Admin
    if (req.user.type !== 'DeptAdmin' && req.user.type !== 'SuperAdmin') {
        throw new AppError('Only department admins can view officer performance', 403);
    }

    let whereClause = '1=1';
    const params = [];

    // Department Admins can only see their department's officers in their location
    if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT department_id, state, city FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (deptAdmin) {
            whereClause += ' AND o.department_id = ?';
            params.push(deptAdmin.department_id);
            
            // Filter by location if department admin has location data
            if (deptAdmin.state && deptAdmin.city) {
                whereClause += ' AND LOWER(o.state) = LOWER(?) AND LOWER(o.city) = LOWER(?)';
                params.push(deptAdmin.state, deptAdmin.city);
            }
        }
    }

    const officers = await db.queryRows(
        `SELECT
            o.officer_id,
            o.officer_name,
            o.badge_number,
            o.designation,
            o.is_active,
            d.department_name,
            -- Total assigned
            (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id) as total_assigned,
            -- Currently working (In Progress + Pending Approval)
            (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND status IN ('In Progress', 'Pending Approval')) as currently_working,
            -- Resolved
            (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND status = 'Resolved') as resolved,
            -- Pending approval
            (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND status = 'Pending Approval') as pending_approval,
            -- Rejected proofs
            (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND approval_status = 'Rejected') as rejected_proofs,
            -- Average resolution time (in hours)
            (SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at))
             FROM complaints
             WHERE assigned_officer_id = o.officer_id AND status = 'Resolved' AND resolved_at IS NOT NULL) as avg_resolution_hours,
            -- Last activity
            (SELECT MAX(updated_at) FROM complaints WHERE assigned_officer_id = o.officer_id) as last_activity
         FROM officers o
         LEFT JOIN departments d ON o.department_id = d.department_id
         WHERE ${whereClause}
         ORDER BY o.officer_name`,
        params
    );

    // Calculate performance metrics
    const officersWithMetrics = officers.map(officer => {
        const isBusy = officer.currently_working > 0;
        const completionRate = officer.total_assigned > 0
            ? ((officer.resolved / officer.total_assigned) * 100).toFixed(1)
            : 0;
        const approvalRate = (officer.resolved + officer.rejected_proofs) > 0
            ? ((officer.resolved / (officer.resolved + officer.rejected_proofs)) * 100).toFixed(1)
            : 100;

        return {
            ...officer,
            is_busy: isBusy,
            status: isBusy ? 'Busy' : 'Available',
            completion_rate: parseFloat(completionRate),
            approval_rate: parseFloat(approvalRate),
            avg_resolution_hours: officer.avg_resolution_hours ? parseFloat(officer.avg_resolution_hours).toFixed(1) : null
        };
    });

    res.json({
        status: 'success',
        data: { officers: officersWithMetrics }
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

    // Officers can only view complaints assigned to them
    if (req.user.type === 'Officer' && complaint.assigned_officer_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    // Department Admins can only view their department's complaints
    if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT department_id FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (!deptAdmin || deptAdmin.department_id !== complaint.department_id) {
            throw new AppError('Not authorized', 403);
        }
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
router.post('/', authMiddleware, upload.fields([{ name: 'attachments', maxCount: 5 }]), asyncHandler(async (req, res) => {
    console.log('DEBUG - req.body:', req.body);
    console.log('DEBUG - req.files:', req.files);
    
    // Manual validation for FormData/JSON
    const categoryId = parseInt(req.body.categoryId);
    const complaintTitle = req.body.complaintTitle?.trim();
    const complaintDescription = req.body.complaintDescription?.trim();
    const location = req.body.location?.trim();
    const priority = req.body.priority || 'Medium';
    const ward = req.body.ward;
    const latitude = req.body.latitude || null;
    const longitude = req.body.longitude || null;

    console.log('DEBUG - categoryId parsed:', categoryId);

    if (!categoryId || isNaN(categoryId)) {
        throw new AppError('Valid category required', 400);
    }

    if (!complaintTitle || complaintTitle.length < 5 || complaintTitle.length > 200) {
        throw new AppError('Title must be 5-200 characters', 400);
    }

    if (!complaintDescription || complaintDescription.length < 10) {
        throw new AppError('Description must be at least 10 characters', 400);
    }

    if (!location || location.length < 5) {
        throw new AppError('Location must be at least 5 characters', 400);
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
        throw new AppError('Invalid priority', 400);
    }

    if (req.user.type !== 'Citizen') {
        throw new AppError('Only citizens can file complaints', 403);
    }

    console.log('DEBUG - User:', req.user);
    console.log('DEBUG - referenceId:', req.user.referenceId);

    // Get citizen's location information
    const citizen = await db.queryRow(
        'SELECT state, city FROM citizens WHERE citizen_id = ?',
        [req.user.referenceId]
    );

    if (!citizen) {
        throw new AppError('Citizen not found', 404);
    }

    console.log('DEBUG - Citizen location:', citizen.state, citizen.city);

    // Get category and auto-allocate department
    const category = await db.queryRow(
        `SELECT cc.*, d.department_name 
         FROM complaint_categories cc 
         LEFT JOIN departments d ON cc.department_id = d.department_id 
         WHERE cc.category_id = ?`,
        [categoryId]
    );

    if (!category) {
        throw new AppError('Category not found', 404);
    }

    console.log('DEBUG - Auto-allocating complaint to department:', category.department_name, '(ID:', category.department_id, ')');

    // Generate complaint number
    const deptCode = (category.department_name || 'GEN').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const complaintNumber = `2026-${deptCode}-${timestamp}`;

    // Auto-assign officer based on location and department
    let assignedOfficerId = null;
    let assignedOfficerName = null;
    
    if (citizen.state && citizen.city) {
        // Try to find officer matching state, city, and department (case-insensitive)
        // Assign to officer with least active complaints (availability-based)
        const officer = await db.queryRow(
            `SELECT o.officer_id, o.officer_name,
                    (SELECT COUNT(*) FROM complaints WHERE assigned_officer_id = o.officer_id AND status NOT IN ('Resolved', 'Closed', 'Rejected')) as active_count
             FROM officers o
             WHERE o.department_id = ? 
             AND LOWER(o.state) = LOWER(?) 
             AND LOWER(o.city) = LOWER(?) 
             AND o.is_active = 1
             ORDER BY active_count ASC, RAND() LIMIT 1`,
            [category.department_id, citizen.state, citizen.city]
        );
        
        if (officer) {
            assignedOfficerId = officer.officer_id;
            assignedOfficerName = officer.officer_name;
            console.log('DEBUG - Auto-assigned to officer:', officer.officer_name, '(ID:', officer.officer_id, ') with', officer.active_count, 'active complaints');
        } else {
            console.log('DEBUG - No officer found for location:', citizen.state, citizen.city, 'and department:', category.department_name);
        }
    } else {
        console.log('DEBUG - Citizen has no location data, cannot auto-assign officer');
    }

    // Insert complaint
    const result = await db.query(
        `INSERT INTO complaints (complaint_number, citizen_id, category_id, department_id, 
            complaint_title, complaint_description, location,
            latitude, longitude, priority, status, assigned_officer_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [
            complaintNumber, req.user.referenceId, categoryId, category.department_id,
            complaintTitle, complaintDescription, location,
            latitude || null, longitude || null, priority, assignedOfficerId
        ]
    );

    const complaintId = result.insertId;

    // Update citizen complaint count
    await db.query(
        `UPDATE citizens SET complaint_count = complaint_count + 1 WHERE citizen_id = ?`,
        [req.user.referenceId]
    );

    // Handle file attachments with date folder structure
    if (req.files && req.files.attachments && req.files.attachments.length > 0) {
        const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const datePath = path.join(uploadDir, dateFolder);
        
        if (!fs.existsSync(datePath)) {
            fs.mkdirSync(datePath, { recursive: true });
        }
        
        for (const file of req.files.attachments) {
            // Move file from temp location to date folder
            const finalPath = path.join(datePath, file.filename);
            fs.renameSync(file.path, finalPath);
            
            // Insert attachment record
            await db.query(
                `INSERT INTO complaint_attachments (complaint_id, file_name, file_path, file_type, file_size, attachment_type)
                 VALUES (?, ?, ?, ?, ?, 'citizen')`,
                [complaintId, file.originalname, `${dateFolder}/${file.filename}`, file.mimetype, file.size]
            );
        }
    }

    // Create status history entry only for officer/admin-filed complaints
    // Citizen-filed complaints don't have an officer to reference in changed_by
    if (req.user.type === 'Officer' || req.user.type === 'DeptAdmin' || req.user.type === 'SuperAdmin') {
        await db.query(
            `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
             VALUES (?, NULL, 'Pending', ?, 'Complaint filed')`,
            [complaintId, req.user.referenceId]
        );
    }

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
        [complaintTitle ?? null, complaintDescription ?? null, location ?? null, latitude ?? null, longitude ?? null, req.params.id]
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
        'In Progress': ['Resolved', 'Pending', 'Rejected'],
        'Resolved': ['Closed'],
        'Rejected': [],
        'Closed': []
    };

    if (!validTransitions[complaint.status].includes(status)) {
        throw new AppError(`Cannot transition from ${complaint.status} to ${status}`, 400);
    }

    // Update status
    if (status === 'Resolved') {
        await db.query(
            `UPDATE complaints SET status = ?, resolved_at = ? WHERE complaint_id = ?`,
            [status, new Date(), req.params.id]
        );
    } else {
        await db.query(
            `UPDATE complaints SET status = ? WHERE complaint_id = ?`,
            [status, req.params.id]
        );
    }

    // Create history entry
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, complaint.status, status, req.user.referenceId, changeReason || null]
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

    // Create history entry - use officer_id for changed_by
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, 'In Progress', ?, 'Assigned to officer')`,
        [req.params.id, complaint.status, officerId]
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

// @route   POST /api/complaints/:id/proof
// @desc    Submit proof of resolution
// @access  Private (Officer only)
router.post('/:id/proof', authMiddleware, isOfficer, [
    body('proofDescription').trim().isLength({ min: 10 }).withMessage('Proof description must be at least 10 characters'),
    body('attachmentIds').optional().isArray()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { proofDescription, attachmentIds = [] } = req.body;

    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Verify officer is assigned to this complaint
    if (complaint.assigned_officer_id !== req.user.referenceId) {
        throw new AppError('You are not assigned to this complaint', 403);
    }

    // Update complaint with proof submission
    await db.query(
        `UPDATE complaints SET
            proof_submitted = 1,
            proof_description = ?,
            approval_status = 'Pending',
            status = 'Pending Approval',
            updated_at = NOW()
         WHERE complaint_id = ?`,
        [proofDescription, req.params.id]
    );

    // Create history entry - use req.user.referenceId as officer_id
    await db.query(
        `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, 'In Progress', 'Pending Approval', ?, 'Proof submitted for approval')`,
        [req.params.id, req.user.referenceId]
    );

    const updatedComplaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    res.json({
        status: 'success',
        message: 'Proof submitted successfully. Waiting for department admin approval.',
        data: { complaint: updatedComplaint }
    });
}));

// @route   PUT /api/complaints/:id/approve
// @desc    Approve or reject proof of resolution
// @access  Private (Department Admin only)
router.put('/:id/approve', authMiddleware, [
    body('action').isIn(['approve', 'reject']).withMessage('Valid action required'),
    body('reason').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
    }

    const { action, reason } = req.body;

    // Verify user is Department Admin
    if (req.user.type !== 'DeptAdmin' && req.user.type !== 'SuperAdmin') {
        throw new AppError('Only department admins can approve proofs', 403);
    }

    const complaint = await db.queryRow(
        'SELECT * FROM complaints WHERE complaint_id = ?',
        [req.params.id]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Verify complaint has proof submitted
    if (!complaint.proof_submitted || complaint.proof_submitted === 0) {
        throw new AppError('No proof has been submitted for this complaint', 400);
    }

    // Verify department admin belongs to the same department
    if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT department_id FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (!deptAdmin || deptAdmin.department_id !== complaint.department_id) {
            throw new AppError('You can only approve complaints in your department', 403);
        }
    }

    if (action === 'approve') {
        // Approve the proof
        await db.query(
            `UPDATE complaints SET
                approval_status = 'Approved',
                approved_by = ?,
                approved_at = NOW(),
                status = 'Resolved',
                resolved_at = NOW(),
                updated_at = NOW()
             WHERE complaint_id = ?`,
            [req.user.referenceId, req.params.id]
        );

        // Create history entry
        await db.query(
            `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
             VALUES (?, 'Pending Approval', 'Resolved', ?, 'Proof approved by department admin')`,
            [req.params.id, req.user.referenceId]
        );

        res.json({
            status: 'success',
            message: 'Proof approved. Complaint marked as resolved.',
            data: { complaint: { ...complaint, status: 'Resolved', approval_status: 'Approved' } }
        });
    } else {
        // Reject the proof
        await db.query(
            `UPDATE complaints SET
                approval_status = 'Rejected',
                approved_by = ?,
                approved_at = NOW(),
                rejection_reason = ?,
                status = 'In Progress',
                proof_submitted = 0,
                updated_at = NOW()
             WHERE complaint_id = ?`,
            [req.user.referenceId, reason || 'Proof rejected. Please resubmit with proper documentation.', req.params.id]
        );

        // Create history entry
        await db.query(
            `INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
             VALUES (?, 'Pending Approval', 'In Progress', ?, ?)`,
            [req.params.id, req.user.referenceId, reason || 'Proof rejected. Please resubmit with proper documentation.']
        );

        res.json({
            status: 'success',
            message: 'Proof rejected. Please resubmit with proper documentation.',
            data: { complaint: { ...complaint, status: 'In Progress', approval_status: 'Rejected' } }
        });
    }
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
