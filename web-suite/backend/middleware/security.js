/**
 * Security Middleware
 * Implements various security measures for the application
 */

// Rate limiting configuration
const rateLimit = require('express-rate-limit');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// Input sanitization - escape HTML entities to prevent XSS
// Uses a map for clarity and correctness
const HTML_ESCAPE_MAP = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": "'"
};

const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (chr) => HTML_ESCAPE_MAP[chr] || chr);
};

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = escapeHtml(req.body[key]);
      }
    }
  }

  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = escapeHtml(req.query[key]);
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

// Security headers helper (adds to helmet or standalone use)
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

module.exports = {
  loginLimiter,
  generalLimiter,
  sanitizeInput,
  validateInput,
  securityHeaders,
  escapeHtml
};