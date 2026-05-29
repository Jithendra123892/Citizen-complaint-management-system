/**
 * CitizenConnect - Smart Complaint Management System
 * Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

// Validate critical environment variables at startup
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    console.error('Please set it in your .env file: JWT_SECRET=your-secret-key-here');
    process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const citizenRoutes = require('./routes/citizens');
const complaintRoutes = require('./routes/complaints');
const departmentRoutes = require('./routes/departments');
const officerRoutes = require('./routes/officers');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const projectRoutes = require('./routes/projects');
const serviceRoutes = require('./routes/services');
const deptAdminRoutes = require('./routes/dept-admin');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter, sanitizeInput, securityHeaders } = require('./middleware/security');

// Import database
const db = require('./config/database');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// CORS configured via environment variables for flexibility in deployment
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);

        // Allow custom FRONTEND_URL env var (Railway custom domain or Vercel)
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.API_BASE_URL?.replace('/api', ''), // derive frontend origin from API URL
        ].filter(Boolean);

        // Allow all Railway.app subdomains (auto-generated deployment URLs)
        if (origin && (origin.endsWith('.railway.app') || origin.endsWith('.railway.app/'))) {
            return callback(null, true);
        }

        // Allow localhost for development
        if (origin.match(/^http:\/\/localhost/)) {
            return callback(null, true);
        }

        // Check explicit allow list
        if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://citizen-complaint-management-system-production.up.railway.app", "https://citizen-complaint-management-system-production.up.railway.app:5000", "ws:", "wss:"],
            fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
}));
app.use(generalLimiter);
app.use(sanitizeInput);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'CitizenConnect API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Dedicated file serving route with MIME type from database
// Security: validates resolved path stays within uploads directory
app.get('/uploads/:path(*)', async (req, res) => {
    const filePath = req.params.path;
    const uploadDir = path.join(__dirname, 'uploads');
    const fullPath = path.join(uploadDir, filePath);

    // Path traversal protection: ensure resolved path is inside uploadDir
    if (path.normalize(fullPath).indexOf(uploadDir) !== 0) {
        return res.status(403).send('Access denied');
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).send('File not found');
    }
    
    // Try to get MIME type from database for files without extensions
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime'
    };
    
    if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
    } else {
        // No extension, try to find in database
        try {
            const attachment = await db.queryRow(
                'SELECT file_type FROM complaint_attachments WHERE file_path = ? OR file_name = ? LIMIT 1',
                [filePath, path.basename(filePath)]
            );
            if (attachment && attachment.file_type) {
                res.setHeader('Content-Type', attachment.file_type);
            } else {
                res.setHeader('Content-Type', 'application/octet-stream');
            }
        } catch (err) {
            res.setHeader('Content-Type', 'application/octet-stream');
        }
    }
    
    res.sendFile(fullPath);
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/dept-admin', deptAdminRoutes);

// Protected routes
app.use('/api/complaints', authMiddleware, complaintRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Serve uploaded files from backend/uploads/ (persistent storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
    // Serve static frontend files from backend/public/
    app.use(express.static(publicDir));
    console.log('Static files served from:', publicDir);
} else {
    console.log('Note: backend/public/ not found — run the copy script before deploying');
}

// SPA fallback: serve index.html for non-API routes (single-page app behavior)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next(); // Let API and upload routes respond first
    }
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next(); // Fall through to 404
    }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 CitizenConnect Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Initialize database tables
    try {
        await db.initDatabase();
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }

    // Test database connection
    try {
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;
