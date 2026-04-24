/**
 * Security Middleware
 * Implements various security measures for the application
 */

// Rate limiting configuration
const rateLimit = require('express-rate-limit');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input sanitization
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Basic sanitization - remove potentially dangerous characters
        req.body[key] = req.body[key]
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, ''');
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, ''');
      }
    }
  }

  next();
};

// Input validation helper
const validateInput = (input, type) => {
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'phone':
      return /^[0-9]{10}$/.test(input);
    case 'username':
      return /^[a-zA-Z0-9_]{3,20}$/.test(input);
    case 'password':
      // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(input);
    case 'name':
      return /^[a-zA-Z\s]{2,50}$/.test(input);
    case 'aadhaar':
      return /^[0-9]{12}$/.test(input);
    default:
      return true;
  }
};

module.exports = {
  loginLimiter,
  generalLimiter,
  sanitizeInput,
  validateInput
};