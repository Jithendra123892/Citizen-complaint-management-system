/**
 * Utility Functions
 */

const crypto = require('crypto');

/**
 * Generate unique complaint number
 */
const generateComplaintNumber = async (db, categoryId) => {
    try {
        // Get category code
        const category = await db.queryRow(
            'SELECT category_name FROM complaint_categories WHERE category_id = ?',
            [categoryId]
        );

        if (!category) {
            throw new Error('Category not found');
        }

        const categoryCode = category.category_name.substring(0, 3).toUpperCase();
        const year = new Date().getFullYear();

        // Get next sequence number
        const result = await db.query(
            `SELECT IFNULL(MAX(CAST(SUBSTRING(complaint_number, 9, 6) AS UNSIGNED)), 0) + 1 as next_num 
             FROM complaints 
             WHERE complaint_number LIKE ?`,
            [`${year}-${categoryCode}%`]
        );

        const sequenceNum = result[0]?.next_num || 1;
        return `${year}-${categoryCode}-${String(sequenceNum).padStart(6, '0')}`;
    } catch (error) {
        console.error('Generate complaint number error:', error);
        throw error;
    }
};

/**
 * Calculate complaint age in hours
 */
const calculateAgeInHours = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.floor((now - created) / (1000 * 60 * 60));
};

/**
 * Check SLA status
 */
const checkSLAStatus = (createdAt, slaHours, status) => {
    if (status === 'Resolved' || status === 'Closed') {
        return { withinSLA: true, hoursElapsed: calculateAgeInHours(createdAt) };
    }

    const hoursElapsed = calculateAgeInHours(createdAt);
    return {
        withinSLA: hoursElapsed <= slaHours,
        hoursElapsed,
        hoursOverdue: hoursElapsed - slaHours
    };
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Format date to readable string
 */
const formatDate = (date, format = 'DD/MM/YYYY') => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD-MM-YYYY':
            return `${day}-${month}-${year}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        default:
            return `${day}/${month}/${year}`;
    }
};

/**
 * Format datetime to readable string
 */
const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Sanitize string for SQL LIKE queries
 */
const sanitizeForLike = (str) => {
    return str.replace(/[%_\\]/g, '\\$&');
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 10, defaultLimit = 10) => {
    const limitNum = Math.max(1, Math.min(Number(limit) || defaultLimit, 100));
    const pageNum = Math.max(1, Number(page) || 1);
    const offset = (pageNum - 1) * limitNum;
    return { limit: limitNum, offset, page: pageNum };
};

/**
 * Build pagination response
 */
const buildPaginationResponse = (items, total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        items,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

/**
 * Validate Aadhaar number format
 */
const validateAadhaar = (aadhaar) => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
};

/**
 * Validate phone number format
 */
const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Mask sensitive data
 */
const maskData = (data, visibleChars = 4) => {
    if (!data || data.length <= visibleChars) {
        return '*'.repeat(data?.length || 0);
    }
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
};

/**
 * Truncate string
 */
const truncate = (str, length = 50) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
};

/**
 * Clean empty fields from object
 */
const cleanObject = (obj) => {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
};

/**
 * Parse JSON fields safely
 */
const parseJSON = (jsonString, defaultValue = null) => {
    try {
        return JSON.parse(jsonString);
    } catch {
        return defaultValue;
    }
};

/**
 * Delay/sleep function
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, baseDelay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (maxRetries <= 0) throw error;
        await delay(baseDelay);
        return retry(fn, maxRetries - 1, baseDelay * 2);
    }
};

module.exports = {
    generateComplaintNumber,
    calculateAgeInHours,
    checkSLAStatus,
    generateRandomString,
    formatDate,
    formatDateTime,
    sanitizeForLike,
    paginate,
    buildPaginationResponse,
    validateAadhaar,
    validatePhone,
    maskData,
    truncate,
    cleanObject,
    parseJSON,
    delay,
    retry
};
