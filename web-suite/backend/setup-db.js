/**
 * Database Setup Script
 * Run this to initialize all tables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'citizen_complaint_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

async function setupDatabase() {
    console.log('🔧 Setting up database...\n');
    
    try {
        // Create database if not exists
        await pool.query('CREATE DATABASE IF NOT EXISTS citizen_complaint_db');
        console.log('✅ Database created/verified');
        
        // Use the database
        await pool.query('USE citizen_complaint_db');
        
        // Create tables
        const tables = [
            `CREATE TABLE IF NOT EXISTS departments (
                department_id INT PRIMARY KEY AUTO_INCREMENT,
                department_name VARCHAR(100) NOT NULL UNIQUE,
                department_head VARCHAR(100),
                contact_number VARCHAR(20),
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )`,
            
            `CREATE TABLE IF NOT EXISTS officers (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS complaint_categories (
                category_id INT PRIMARY KEY AUTO_INCREMENT,
                category_name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                sla_hours INT NOT NULL DEFAULT 72,
                department_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(department_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS citizens (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS users (
                user_id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                user_type ENUM('Citizen', 'Officer', 'Admin') NOT NULL,
                reference_id INT,
                last_login TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS complaints (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS complaint_status_history (
                history_id INT PRIMARY KEY AUTO_INCREMENT,
                complaint_id INT NOT NULL,
                previous_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'),
                new_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected') NOT NULL,
                changed_by INT NOT NULL,
                change_reason TEXT,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES officers(officer_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS complaint_attachments (
                attachment_id INT PRIMARY KEY AUTO_INCREMENT,
                complaint_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(50),
                file_size INT,
                attachment_type ENUM('citizen', 'officer_proof') DEFAULT 'citizen',
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
            )`,
            
            `CREATE TABLE IF NOT EXISTS audit_logs (
                log_id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action_type VARCHAR(50) NOT NULL,
                table_name VARCHAR(50),
                record_id INT,
                old_values JSON,
                new_values JSON,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Additional tables from schema
            `CREATE TABLE IF NOT EXISTS projects (
                project_id INT PRIMARY KEY AUTO_INCREMENT,
                project_name VARCHAR(100) NOT NULL,
                location VARCHAR(100),
                project_leader VARCHAR(100),
                start_date DATE NOT NULL,
                end_date DATE,
                budget DECIMAL(12,2) NOT NULL,
                department_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(department_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS services (
                service_id INT PRIMARY KEY AUTO_INCREMENT,
                service_name VARCHAR(100) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                department_id INT NOT NULL,
                officer_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(department_id),
                FOREIGN KEY (officer_id) REFERENCES officers(officer_id)
            )`
        ];
        
        for (const sql of tables) {
            await pool.query(sql);
        }
        console.log('✅ All tables created');
        
        // Insert sample data
        await insertSampleData();
        
        console.log('\n🎉 Database setup complete!');
        console.log('You can now start the backend server.');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        pool.end();
    }
}

async function insertSampleData() {
    console.log('📦 Inserting sample data...');
    
    // Check if data exists
    const [depts] = await pool.query('SELECT COUNT(*) as count FROM departments');
    if (depts[0].count > 0) {
        console.log('⚠️  Sample data already exists, skipping...');
        return;
    }
    
    // Insert departments
    await pool.query(`INSERT INTO departments (department_name, department_head, contact_number, email) VALUES 
        ('Public Works Department', 'John Smith', '9876543210', 'pwd@citizenconnect.gov'),
        ('Water Supply Department', 'Sarah Johnson', '9876543211', 'water@citizenconnect.gov'),
        ('Electrical Department', 'Mike Brown', '9876543212', 'electric@citizenconnect.gov'),
        ('Sanitation Department', 'Lisa Davis', '9876543213', 'sanitation@citizenconnect.gov'),
        ('Road Transport Department', 'David Wilson', '9876543214', 'transport@citizenconnect.gov')`);
    console.log('✅ Departments inserted');
    
    // Insert officers
    await pool.query(`INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email) VALUES 
        ('Rajesh Kumar', 'OFF001', 1, 'Junior Engineer', '9988776655', 'rajesh@citizenconnect.gov'),
        ('Priya Patel', 'OFF002', 2, 'Senior Officer', '9988776656', 'priya@citizenconnect.gov'),
        ('Amit Singh', 'OFF003', 3, 'Electrician', '9988776657', 'amit@citizenconnect.gov'),
        ('Sunita Rao', 'OFF004', 4, 'Sanitation Inspector', '9988776658', 'sunita@citizenconnect.gov'),
        ('Vikram Mehta', 'OFF005', 5, 'Traffic Officer', '9988776659', 'vikram@citizenconnect.gov')`);
    console.log('✅ Officers inserted');
    
    // Insert categories
    await pool.query(`INSERT INTO complaint_categories (category_name, description, sla_hours, department_id) VALUES 
        ('Pothole Repair', 'Road damage and potholes', 48, 1),
        ('Water Leakage', 'Water pipe leaks and supply issues', 24, 2),
        ('No Water Supply', 'Water supply disruption', 12, 2),
        ('Power Outage', 'Electricity supply issues', 24, 3),
        ('Electrical Hazard', 'Dangerous electrical issues', 4, 3),
        ('Garbage Collection', 'Waste management issues', 24, 4),
        ('Street Light', 'Street light repairs', 48, 3),
        ('Drainage Blockage', 'Drain and sewer issues', 24, 4),
        ('Road Signage', 'Damaged road signs', 72, 5),
        ('Traffic Signal', 'Traffic light repairs', 12, 5)`);
    console.log('✅ Categories inserted');
    
    // Insert sample citizen
    await pool.query(`INSERT INTO citizens (citizen_name, aadhaar_number, email, phone_number, address, ward_number, pincode) VALUES 
        ('John Doe', '123456789012', 'john.doe@email.com', '9876543210', '123 Main Street, Chennai', 'Ward 15', '600001')`);
    console.log('✅ Sample citizen inserted');
    
    // Insert sample user with random password
    const bcrypt = require('bcryptjs');
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(`INSERT INTO users (username, password_hash, user_type, reference_id) VALUES 
        ('citizen', '${passwordHash}', 'Citizen', 1),
        ('admin', '${passwordHash}', 'Admin', NULL),
        ('officer', '${passwordHash}', 'Officer', 1)`);
    console.log(`✅ Sample users inserted (password: ${password})`);
    console.log('⚠️  IMPORTANT: Save this password securely!');
    
    // Insert sample complaints
    await pool.query(`INSERT INTO complaints (complaint_number, citizen_id, category_id, department_id, assigned_officer_id, complaint_title, complaint_description, location, priority, status) VALUES 
        ('2024-POT-000001', 1, 1, 1, 1, 'Large pothole on Main Road', 'There is a large pothole near the bus stop causing traffic issues', 'Main Road, Near Bus Stop, Ward 15', 'High', 'In Progress'),
        ('2024-WTR-000002', 1, 2, 2, 2, 'Water leakage from main pipe', 'Water is leaking from the main pipe for past 2 days', 'Near Park, Ward 15', 'Medium', 'Pending'),
        ('2024-LGT-000003', 1, 7, 3, 3, 'Street light not working', 'Street light has been out for a week', 'Park Street, Ward 15', 'Low', 'Resolved')`);
    console.log('✅ Sample complaints inserted');
    
    // Insert sample projects
    await pool.query(`INSERT INTO projects (project_name, location, project_leader, start_date, end_date, budget, department_id) VALUES 
        ('Road Improvement Project', 'Zone A - Main Road', 'Rajesh Kumar', '2026-01-01', '2026-06-30', 5000000, 1),
        ('Water Pipeline Upgrade', 'Zone B - Residential Area', 'Priya Patel', '2026-02-01', '2026-08-31', 7500000, 2),
        ('Street Light Installation', 'Zone C - Industrial Area', 'Amit Singh', '2026-03-01', '2026-05-31', 2500000, 3),
        ('Garbage Disposal Plant', 'Zone D - Town Center', 'Sunita Rao', '2026-01-15', '2026-12-31', 15000000, 4),
        ('Traffic Signal Upgrade', 'Zone A - Major Intersections', 'Vikram Mehta', '2026-04-01', '2026-09-30', 3000000, 5)`);
    console.log('✅ Sample projects inserted');
    
    // Insert sample services
    await pool.query(`INSERT INTO services (service_name, amount, department_id, officer_id) VALUES 
        ('Water Connection Request', 500, 2, 2),
        ('Electricity Connection', 750, 3, 3),
        ('Road Damage Repair Request', 200, 1, 1),
        ('Drainage Cleaning Request', 300, 4, 4),
        ('Building Plan Approval', 5000, 1, 1),
        ('Water Quality Testing', 1000, 2, 2),
        ('Street Light Maintenance', 150, 3, 3),
        ('Waste Collection Service', 250, 4, 4),
        ('Traffic Permission', 500, 5, 5),
        ('Public Park Maintenance', 1000, 4, 4)`);
    console.log('✅ Sample services inserted');
}

setupDatabase();
