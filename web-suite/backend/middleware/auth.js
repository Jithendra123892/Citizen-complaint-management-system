/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Validate JWT_SECRET at startup
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set');
}

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token expired. Please login again.'
                });
            }
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token.'
            });
        }

        // Get user details
        const user = await db.queryRow(
            'SELECT user_id, username, user_type, reference_id, is_active FROM users WHERE user_id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token. User not found.'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                status: 'error',
                message: 'Account is deactivated.'
            });
        }

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            type: decoded.userType,
            referenceId: decoded.referenceId
        };

        // Add additional info for SuperAdmin
        if (user.user_type === 'SuperAdmin') {
            const superAdmin = await db.queryRow(
                'SELECT state FROM super_admins WHERE super_admin_id = ?',
                [user.reference_id]
            );
            if (superAdmin) {
                req.user.state = superAdmin.state;
            }
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Authentication failed.'
        });
    }
};

// Role-based access control middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Not authenticated.'
            });
        }

        // Check if user type is in allowed roles or is SuperAdmin (which has full access)
        if (!roles.includes(req.user.type) && req.user.type !== 'SuperAdmin') {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to access this resource.'
            });
        }

        next();
    };
}

// Check if user is admin
const isAdmin = authorize('Admin', 'SuperAdmin');

// Check if user is officer or admin
const isOfficer = authorize('Officer', 'Admin', 'SuperAdmin');

// Check if user is citizen
const isCitizen = authorize('Citizen', 'Admin', 'SuperAdmin');

module.exports = {
    authMiddleware,
    authorize,
    isAdmin,
    isOfficer,
    isCitizen
};
