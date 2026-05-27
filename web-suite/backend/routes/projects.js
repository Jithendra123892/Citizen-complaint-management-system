/**
 * Projects Routes
 */

const express = require('express');
const db = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authMiddleware, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    // Note: 'projects' table may not exist in current schema
    try {
        const { page = 1, limit = 10, department } = req.query;

        let whereClause = '1=1';
        const params = [];

        if (department) {
            whereClause += ' AND p.department_id = ?';
            params.push(department);
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offsetNum = (pageNum - 1) * limitNum;

        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM projects p WHERE ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const projects = await db.queryRaw(
            `SELECT p.*, d.department_name
             FROM projects p
             LEFT JOIN departments d ON p.department_id = d.department_id
             WHERE ${whereClause}
             ORDER BY p.start_date DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            params
        );

        res.json({
            status: 'success',
            data: {
                items: projects,
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

// @route   GET /api/projects/stats
// @desc    Get project statistics
// @access  Public
router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await db.queryRow(
        `SELECT 
            COUNT(*) as total_projects,
            SUM(budget) as total_budget,
            COUNT(CASE WHEN end_date >= CURDATE() THEN 1 END) as active_projects,
            COUNT(CASE WHEN end_date < CURDATE() THEN 1 END) as completed_projects
         FROM projects`
    );
    
    const byDepartment = await db.query(
        `SELECT d.department_name, COUNT(p.project_id) as project_count, SUM(p.budget) as budget
         FROM departments d
         LEFT JOIN projects p ON d.department_id = p.department_id
         GROUP BY d.department_id`
    );
    
    res.json({
        status: 'success',
        data: { stats, byDepartment }
    });
}));

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const project = await db.queryRow(
        `SELECT p.*, d.department_name 
         FROM projects p 
         LEFT JOIN departments d ON p.department_id = d.department_id 
         WHERE p.project_id = ?`,
        [req.params.id]
    );
    
    if (!project) {
        throw new AppError('Project not found', 404);
    }
    
    res.json({
        status: 'success',
        data: { project }
    });
}));

// @route   POST /api/projects
// @desc    Create new project
// @access  Private (Admin only)
router.post('/', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { projectName, location, projectLeader, startDate, endDate, budget, departmentId } = req.body;
    
    const result = await db.query(
        `INSERT INTO projects (project_name, location, project_leader, start_date, end_date, budget, department_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectName, location, projectLeader, startDate, endDate, budget, departmentId]
    );
    
    const project = await db.queryRow('SELECT * FROM projects WHERE project_id = ?', [result.insertId]);
    
    res.status(201).json({
        status: 'success',
        message: 'Project created successfully',
        data: { project }
    });
}));

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (Admin)
router.put('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    const { projectName, location, projectLeader, startDate, endDate, budget, departmentId } = req.body;
    
    await db.query(
        `UPDATE projects SET 
            project_name = COALESCE(?, project_name),
            location = COALESCE(?, location),
            project_leader = COALESCE(?, project_leader),
            start_date = COALESCE(?, start_date),
            end_date = COALESCE(?, end_date),
            budget = COALESCE(?, budget),
            department_id = COALESCE(?, department_id)
         WHERE project_id = ?`,
        [projectName, location, projectLeader, startDate, endDate, budget, departmentId, req.params.id]
    );
    
    const project = await db.queryRow('SELECT * FROM projects WHERE project_id = ?', [req.params.id]);
    
    res.json({
        status: 'success',
        message: 'Project updated successfully',
        data: { project }
    });
}));

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Admin)
router.delete('/:id', authMiddleware, authorize('Admin'), asyncHandler(async (req, res) => {
    await db.query('DELETE FROM projects WHERE project_id = ?', [req.params.id]);
    
    res.json({
        status: 'success',
        message: 'Project deleted successfully'
    });
}));

module.exports = router;
