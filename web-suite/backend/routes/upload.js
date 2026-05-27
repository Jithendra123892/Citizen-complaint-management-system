/**
 * Upload Routes
 * Handle file uploads for complaints
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        
        // Create date-based folder structure
        const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const fullPath = path.join(uploadPath, dateFolder);
        
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'video/mp4', 'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and videos are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    }
});

// @route   POST /api/upload/:complaintId
// @desc    Upload files for a complaint
// @access  Private
router.post('/:complaintId', authMiddleware, upload.array('files', 5), asyncHandler(async (req, res) => {
    const { complaintId } = req.params;
    const files = req.files;

    // Verify complaint exists
    const complaint = await db.queryRow(
        'SELECT complaint_id, citizen_id FROM complaints WHERE complaint_id = ?',
        [complaintId]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Check ownership
    if (req.user.type === 'Citizen' && complaint.citizen_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400);
    }

    // Save file records
    const uploadedFiles = [];
    const attachmentType = req.user.type === 'Officer' ? 'officer_proof' : 'citizen';
    
    for (const file of files) {
        const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
        const filePath = `${dateFolder}/${file.filename}`;
        
        const result = await db.query(
            `INSERT INTO complaint_attachments (complaint_id, file_name, file_path, file_type, file_size, attachment_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [complaintId, file.originalname, filePath, file.mimetype, file.size, attachmentType]
        );

        uploadedFiles.push({
            id: result.insertId,
            originalName: file.originalname,
            savedPath: filePath,
            size: file.size,
            type: file.mimetype,
            attachmentType: attachmentType
        });
    }

    res.status(201).json({
        status: 'success',
        message: `${files.length} file(s) uploaded successfully`,
        data: { files: uploadedFiles }
    });
}));

// @route   GET /api/upload/:complaintId
// @desc    Get attachments for a complaint
// @access  Private
router.get('/:complaintId', authMiddleware, asyncHandler(async (req, res) => {
    const { complaintId } = req.params;

    const complaint = await db.queryRow(
        'SELECT complaint_id, citizen_id, department_id, assigned_officer_id FROM complaints WHERE complaint_id = ?',
        [complaintId]
    );

    if (!complaint) {
        throw new AppError('Complaint not found', 404);
    }

    // Citizens can only view their own complaint attachments
    if (req.user.type === 'Citizen' && complaint.citizen_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    // Officers can only view attachments for complaints assigned to them
    if (req.user.type === 'Officer' && complaint.assigned_officer_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    // Department Admins can only view attachments for their department's complaints
    if (req.user.type === 'DeptAdmin') {
        const deptAdmin = await db.queryRow(
            'SELECT department_id FROM department_admins WHERE dept_admin_id = ?',
            [req.user.referenceId]
        );
        if (!deptAdmin || deptAdmin.department_id !== complaint.department_id) {
            throw new AppError('Not authorized', 403);
        }
    }

    const attachments = await db.queryRows(
        'SELECT * FROM complaint_attachments WHERE complaint_id = ? ORDER BY uploaded_at DESC',
        [complaintId]
    );

    res.json({
        status: 'success',
        data: { attachments }
    });
}));

// @route   DELETE /api/upload/:attachmentId
// @desc    Delete an attachment
// @access  Private
router.delete('/:attachmentId', authMiddleware, asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;

    const attachment = await db.queryRow(
        `SELECT a.*, c.citizen_id, a.file_path
         FROM complaint_attachments a
         JOIN complaints c ON a.complaint_id = c.complaint_id
         WHERE a.attachment_id = ?`,
        [attachmentId]
    );

    if (!attachment) {
        throw new AppError('Attachment not found', 404);
    }

    if (req.user.type === 'Citizen' && attachment.citizen_id !== req.user.referenceId) {
        throw new AppError('Not authorized', 403);
    }

    // Delete file from disk
    const fullPath = path.join(process.env.UPLOAD_PATH || './uploads', attachment.file_path);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }

    // Delete record
    await db.query(
        'DELETE FROM complaint_attachments WHERE attachment_id = ?',
        [attachmentId]
    );

    res.json({
        status: 'success',
        message: 'Attachment deleted successfully'
    });
}));

// Error handling for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File size too large. Maximum size is 10MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                status: 'error',
                message: 'Too many files. Maximum is 5 files.'
            });
        }
    }
    
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({
            status: 'error',
            message: error.message
        });
    }

    next(error);
});

module.exports = router;
