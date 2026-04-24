/**
 * CitizenConnect - Smart Complaint Management System
 * Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

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

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter, sanitizeInput, securityHeaders } = require('./middleware/security');

// Import database
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(generalLimiter);
app.use(sanitizeInput);
app.use(securityHeaders);

// CORS configuration
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ],
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'CitizenConnect API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);

// Protected routes
app.use('/api/complaints', authMiddleware, complaintRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/build')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
    });
}

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
