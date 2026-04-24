-- ============================================================
-- SMART CITIZEN COMPLAINT MANAGEMENT SYSTEM
-- Database Schema Implementation
-- ============================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS citizen_complaint_db;
USE citizen_complaint_db;

-- ============================================================
-- TABLE 1: DEPARTMENTS
-- Municipal departments responsible for handling complaints
-- ============================================================
CREATE TABLE departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_head VARCHAR(100),
    contact_number VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABLE 2: OFFICERS
-- Municipal officers who handle complaints
-- ============================================================
CREATE TABLE officers (
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
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 3: COMPLAINT_CATEGORIES
-- Categories/types of complaints
-- ============================================================
CREATE TABLE complaint_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sla_hours INT NOT NULL DEFAULT 72, -- Service Level Agreement in hours
    department_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 4: CITIZENS
-- Citizen registration and details
-- ============================================================
CREATE TABLE citizens (
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

-- ============================================================
-- TABLE 5: COMPLAINTS
-- Main complaint registration table
-- ============================================================
CREATE TABLE complaints (
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
    FOREIGN KEY (citizen_id) REFERENCES citizens(citizen_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES complaint_categories(category_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_officer_id) REFERENCES officers(officer_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 6: COMPLAINT_STATUS_HISTORY
-- Audit trail for complaint status changes
-- ============================================================
CREATE TABLE complaint_status_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    previous_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'),
    new_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected') NOT NULL,
    changed_by INT NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES officers(officer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 7: COMPLAINT_ATTACHMENTS
-- Supporting documents/photos for complaints
-- ============================================================
CREATE TABLE complaint_attachments (
    attachment_id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- TABLE 8: USERS
-- System users for application access
-- ============================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('Citizen', 'Officer', 'Admin') NOT NULL,
    reference_id INT, -- Links to citizen_id or officer_id
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 9: AUDIT_LOGS
-- System audit trail
-- ============================================================
CREATE TABLE audit_logs (
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

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_department ON complaints(department_id);
CREATE INDEX idx_complaints_created ON complaints(created_at);
CREATE INDEX idx_officers_department ON officers(department_id);
CREATE INDEX idx_status_history_complaint ON complaint_status_history(complaint_id);

-- ============================================================
-- VIEWS FOR REPORTING
-- ============================================================

-- View: Active Complaints Summary
CREATE VIEW v_active_complaints AS
SELECT 
    c.complaint_id,
    c.complaint_number,
    c.complaint_title,
    c.status,
    c.priority,
    c.created_at,
    ct.category_name,
    d.department_name,
    o.officer_name AS assigned_officer,
    ci.citizen_name,
    ci.phone_number,
    TIMESTAMPDIFF(HOUR, c.created_at, NOW()) AS hours_since_filed,
    CASE 
        WHEN c.status = 'Pending' AND TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > cc.sla_hours 
        THEN 'Overdue'
        ELSE 'Within SLA'
    END AS sla_status
FROM complaints c
LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
LEFT JOIN departments d ON c.department_id = d.department_id
LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
WHERE c.status IN ('Pending', 'In Progress');

-- View: Department Performance
CREATE VIEW v_department_performance AS
SELECT 
    d.department_name,
    COUNT(c.complaint_id) AS total_complaints,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
    ROUND(
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(c.complaint_id), 0), 2
    ) AS resolution_rate_percent,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours
FROM departments d
LEFT JOIN complaints c ON d.department_id = c.department_id
GROUP BY d.department_id, d.department_name;

-- View: Citizen Complaint History
CREATE VIEW v_citizen_complaints AS
SELECT 
    ci.citizen_name,
    ci.phone_number,
    ci.email,
    COUNT(c.complaint_id) AS total_complaints,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    MAX(c.created_at) AS last_complaint_date
FROM citizens ci
LEFT JOIN complaints c ON ci.citizen_id = c.citizen_id
GROUP BY ci.citizen_id, ci.citizen_name, ci.phone_number, ci.email;

-- View: Officer Workload
CREATE VIEW v_officer_workload AS
SELECT 
    o.officer_name,
    o.badge_number,
    d.department_name,
    o.designation,
    COUNT(c.complaint_id) AS assigned_complaints,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) AS active_cases,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours
FROM officers o
LEFT JOIN departments d ON o.department_id = d.department_id
LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
WHERE o.is_active = TRUE
GROUP BY o.officer_id, o.officer_name, o.badge_number, d.department_name, o.designation;

-- View: Complaint Trend Analysis
CREATE VIEW v_complaint_trends AS
SELECT 
    DATE(created_at) AS complaint_date,
    COUNT(*) AS total_complaints,
    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS high_priority,
    SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) AS critical
FROM complaints
GROUP BY DATE(created_at)
ORDER BY complaint_date;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Procedure: Generate Complaint Number
DELIMITER //
CREATE PROCEDURE sp_generate_complaint_number(IN category_id INT, OUT complaint_number VARCHAR(20))
BEGIN
    DECLARE category_code VARCHAR(5);
    DECLARE sequence_num INT;
    DECLARE year_code VARCHAR(4);
    
    SELECT SUBSTRING(category_name, 1, 3) INTO category_code 
    FROM complaint_categories WHERE category_id = category_id;
    
    SELECT YEAR(NOW()) INTO year_code;
    
    SELECT IFNULL(MAX(CAST(SUBSTRING(complaint_number, 9, 6) AS UNSIGNED)), 0) + 1 
    INTO sequence_num
    FROM complaints 
    WHERE complaint_number LIKE CONCAT(year_code, '%');
    
    SET complaint_number = CONCAT(year_code, '-', category_code, '-', LPAD(sequence_num, 6, '0'));
END //
DELIMITER ;

-- Procedure: Update Complaint Status with History
DELIMITER //
CREATE PROCEDURE sp_update_complaint_status(
    IN p_complaint_id INT,
    IN p_new_status ENUM('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'),
    IN p_officer_id INT,
    IN p_change_reason TEXT
)
BEGIN
    DECLARE old_status VARCHAR(20);
    
    SELECT status INTO old_status FROM complaints WHERE complaint_id = p_complaint_id;
    
    UPDATE complaints 
    SET status = p_new_status,
        updated_at = NOW(),
        resolved_at = CASE WHEN p_new_status = 'Resolved' THEN NOW() ELSE resolved_at END
    WHERE complaint_id = p_complaint_id;
    
    INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason)
    VALUES (p_complaint_id, old_status, p_new_status, p_officer_id, p_change_reason);
END //
DELIMITER ;

-- Procedure: Auto-assign complaint to officer
DELIMITER //
CREATE PROCEDURE sp_assign_complaint(IN p_complaint_id INT, IN p_officer_id INT)
BEGIN
    UPDATE complaints 
    SET assigned_officer_id = p_officer_id,
        status = 'In Progress',
        updated_at = NOW()
    WHERE complaint_id = p_complaint_id;
END //
DELIMITER ;

-- Procedure: Check for duplicate complaints
DELIMITER //
CREATE PROCEDURE sp_check_duplicate_complaint(
    IN p_citizen_id INT,
    IN p_category_id INT,
    IN p_location VARCHAR(500),
    OUT is_duplicate BOOLEAN,
    OUT duplicate_id INT
)
BEGIN
    SELECT complaint_id INTO duplicate_id
    FROM complaints
    WHERE citizen_id = p_citizen_id
      AND category_id = p_category_id
      AND location LIKE CONCAT('%', p_location, '%')
      AND status IN ('Pending', 'In Progress')
    LIMIT 1;
    
    SET is_duplicate = duplicate_id IS NOT NULL;
END //
DELIMITER ;

-- Procedure: Generate Department Report
DELIMITER //
CREATE PROCEDURE sp_department_report(IN p_department_id INT, IN p_start_date DATE, IN p_end_date DATE)
BEGIN
    SELECT 
        d.department_name,
        COUNT(c.complaint_id) AS total_received,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
        ROUND(
            SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
            NULLIF(COUNT(c.complaint_id), 0), 2
        ) AS resolution_rate,
        ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours,
        SUM(CASE WHEN c.priority = 'Critical' THEN 1 ELSE 0 END) AS critical_cases
    FROM departments d
    LEFT JOIN complaints c ON d.department_id = c.department_id
        AND DATE(c.created_at) BETWEEN p_start_date AND p_end_date
    WHERE d.department_id = p_department_id
    GROUP BY d.department_id, d.department_name;
END //
DELIMITER ;

-- Procedure: Get Complaint Details with History
DELIMITER //
CREATE PROCEDURE sp_get_complaint_details(IN p_complaint_id INT)
BEGIN
    SELECT 
        c.complaint_id,
        c.complaint_number,
        c.complaint_title,
        c.complaint_description,
        c.location,
        c.priority,
        c.status,
        c.created_at,
        c.updated_at,
        c.resolved_at,
        ci.citizen_name,
        ci.phone_number,
        ci.email,
        ct.category_name,
        d.department_name,
        o.officer_name AS assigned_officer,
        GROUP_CONCAT(ca.file_name SEPARATOR ', ') AS attachments
    FROM complaints c
    LEFT JOIN citizens ci ON c.citizen_id = ci.citizen_id
    LEFT JOIN complaint_categories ct ON c.category_id = ct.category_id
    LEFT JOIN departments d ON c.department_id = d.department_id
    LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
    LEFT JOIN complaint_attachments ca ON c.complaint_id = ca.complaint_id
    WHERE c.complaint_id = p_complaint_id
    GROUP BY c.complaint_id;
    
    SELECT 
        history_id,
        previous_status,
        new_status,
        changed_at,
        change_reason,
        (SELECT officer_name FROM officers WHERE officer_id = changed_by) AS changed_by
    FROM complaint_status_history
    WHERE complaint_id = p_complaint_id
    ORDER BY changed_at;
END //
DELIMITER ;

-- ============================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================

-- Trigger: Create audit log on complaints update
DELIMITER //
CREATE TRIGGER trg_complaints_audit
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action_type, table_name, record_id, old_values, new_values)
    VALUES (NULL, 'UPDATE', 'complaints', NEW.complaint_id, 
            JSON_OBJECT('status', OLD.status, 'assigned_officer_id', OLD.assigned_officer_id),
            JSON_OBJECT('status', NEW.status, 'assigned_officer_id', NEW.assigned_officer_id));
END //
DELIMITER ;

-- Trigger: Validate status transition
DELIMITER //
CREATE TRIGGER trg_validate_status_transition
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
    DECLARE valid_transition BOOLEAN DEFAULT FALSE;
    
    -- Define valid status transitions
    IF (OLD.status = 'Pending' AND NEW.status IN ('In Progress', 'Rejected')) THEN
        SET valid_transition = TRUE;
    ELSEIF (OLD.status = 'In Progress' AND NEW.status IN ('Resolved', 'Pending')) THEN
        SET valid_transition = TRUE;
    ELSEIF (OLD.status = 'Resolved' AND NEW.status = 'Closed') THEN
        SET valid_transition = TRUE;
    ELSEIF (OLD.status = NEW.status) THEN
        SET valid_transition = TRUE;
    END IF;
    
    IF NOT valid_transition THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid status transition';
    END IF;
END //
DELIMITER ;

-- Trigger: Set resolved timestamp
DELIMITER //
CREATE TRIGGER trg_set_resolved_timestamp
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
        SET NEW.resolved_at = NOW();
    END IF;
END //
DELIMITER ;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Calculate complaint age in days
DELIMITER //
CREATE FUNCTION fn_complaint_age_days(p_complaint_id INT) 
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE age INT;
    SELECT DATEDIFF(NOW(), created_at) INTO age 
    FROM complaints WHERE complaint_id = p_complaint_id;
    RETURN age;
END //
DELIMITER ;

-- Function: Check if complaint is within SLA
DELIMITER //
CREATE FUNCTION fn_check_sla(p_complaint_id INT) 
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE sla_hours INT;
    DECLARE age_hours INT;
    DECLARE result VARCHAR(20);
    
    SELECT cc.sla_hours INTO sla_hours
    FROM complaints c
    JOIN complaint_categories cc ON c.category_id = cc.category_id
    WHERE c.complaint_id = p_complaint_id;
    
    SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) INTO age_hours
    FROM complaints WHERE complaint_id = p_complaint_id;
    
    IF age_hours <= sla_hours THEN
        SET result = 'Within SLA';
    ELSE
        SET result = 'Overdue';
    END IF;
    
    RETURN result;
END //
DELIMITER ;

-- Function: Get complaint summary by status
DELIMITER //
CREATE FUNCTION fn_status_summary(p_status VARCHAR(20))
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE count INT;
    SELECT COUNT(*) INTO count FROM complaints WHERE status = p_status;
    RETURN count;
END //
DELIMITER ;
