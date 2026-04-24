/**
 * Database Configuration
 * MySQL Connection Pool using mysql2
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'citizen_complaint_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Execute query with parameters
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

// Execute raw query (for complex queries with LIMIT/OFFSET)
const queryRaw = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

// Execute query and return rows
const queryRows = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

// Get single row
const queryRow = async (sql, params = []) => {
    try {
        const rows = await queryRows(sql, params);
        return rows[0] || null;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

// Get last inserted ID
const insert = async (sql, params = []) => {
    try {
        const result = await query(sql, params);
        return result.insertId;
    } catch (error) {
        console.error('Insert Error:', error.message);
        throw error;
    }
};

// Transaction support
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Initialize database tables
const initDatabase = async () => {
    const createTablesSQL = `
        -- Departments Table
        CREATE TABLE IF NOT EXISTS departments (
            department_id INT PRIMARY KEY AUTO_INCREMENT,
            department_name VARCHAR(100) NOT NULL UNIQUE,
            department_head VARCHAR(100),
            contact_number VARCHAR(20),
            email VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        );

        -- Officers Table
        CREATE TABLE IF NOT EXISTS officers (
            officer_id INT PRIMARY KEY AUTO_INCREMENT,
            officer_name VARCHAR(100) NOT NULL,
            badge_number VARCHAR(20) NOT NULL UNIQUE,
            department_id INT NOT NULL,
            designation VARCHAR(50),
            contact_number VARCHAR(20),
            email VARCHAR(100),
            date_of_joining DATE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(department_id)
        );

        -- Complaint Categories Table
        CREATE TABLE IF NOT EXISTS complaint_categories (
            category_id INT PRIMARY KEY AUTO_INCREMENT,
            category_name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            sla_hours INT NOT NULL DEFAULT 72,
            department_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (department_id) REFERENCES departments(department_id)
        );

        -- Citizens Table
        CREATE TABLE IF NOT EXISTS citizens (
            citizen_id INT PRIMARY KEY AUTO_INCREMENT,
            citizen_name VARCHAR(100) NOT NULL,
            aadhaar_number VARCHAR(12) NOT NULL UNIQUE,
            email VARCHAR(100),
            phone_number VARCHAR(15) NOT NULL,
            address TEXT,
            ward_number VARCHAR(20),
            pincode VARCHAR(10),
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        );

        -- Complaints Table
        CREATE TABLE IF NOT EXISTS complaints (
            complaint_id INT PRIMARY KEY AUTO_INCREMENT,
            complaint_number VARCHAR(20) NOT NULL UNIQUE,
            citizen_id INT NOT NULL,
            category_id INT NOT NULL,
            department_id INT NOT NULL,
            assigned_officer_id INT,
            complaint_title VARCHAR(200) NOT NULL,
            complaint_description TEXT NOT NULL,
            location VARCHAR(500),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
            status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected') DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL,
            FOREIGN KEY (citizen_id) REFERENCES citizens(citizen_id),
            FOREIGN KEY (category_id) REFERENCES complaint_categories(category_id),
            FOREIGN KEY (department_id) REFERENCES departments(department_id),
            FOREIGN KEY (assigned_officer_id) REFERENCES officers(officer_id)
        );

        -- Complaint Status History
        CREATE TABLE IF NOT EXISTS complaint_status_history (
            history_id INT PRIMARY KEY AUTO_INCREMENT,
            complaint_id INT NOT NULL,
            previous_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'),
            new_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected') NOT NULL,
            changed_by INT NOT NULL,
            change_reason TEXT,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by) REFERENCES officers(officer_id)
        );

        -- Complaint Attachments
        CREATE TABLE IF NOT EXISTS complaint_attachments (
            attachment_id INT PRIMARY KEY AUTO_INCREMENT,
            complaint_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_type VARCHAR(50),
            file_size INT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
        );

        -- Users Table
        CREATE TABLE IF NOT EXISTS users (
            user_id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            user_type ENUM('Citizen', 'Officer', 'Admin') NOT NULL,
            reference_id INT,
            last_login TIMESTAMP NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Audit Logs
        CREATE TABLE IF NOT EXISTS audit_logs (
            log_id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            action_type VARCHAR(50) NOT NULL,
            table_name VARCHAR(50),
            record_id INT,
            old_values JSON,
            new_values JSON,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(createTablesSQL);
        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
};

module.exports = {
    pool,
    query,
    queryRaw,
    queryRows,
    queryRow,
    insert,
    transaction,
    testConnection,
    initDatabase
};
