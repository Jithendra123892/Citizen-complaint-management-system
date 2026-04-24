/**
 * Complex SQL Queries for CitizenConnect Database
 * Topics: Constraints, Aggregate Functions, Sets, Subqueries, Joins, Views, Triggers, Cursors
 */

// ============================================
// 3.1 CONSTRAINTS
// ============================================

/* 
Question: Add constraints to ensure data integrity - 
phone numbers must be 10 digits, priority must be valid, budget must be positive
*/

-- Add CHECK constraint for phone number format
ALTER TABLE citizens 
ADD CONSTRAINT chk_phone_length 
CHECK (CHAR_LENGTH(phone_number) >= 10);

-- Add CHECK constraint for priority values
ALTER TABLE complaints 
ADD CONSTRAINT chk_priority 
CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- Add CHECK constraint for status values
ALTER TABLE complaints 
ADD CONSTRAINT chk_status 
CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'));

-- Add CHECK constraint for budget must be positive
ALTER TABLE projects 
ADD CONSTRAINT chk_budget_positive 
CHECK (budget > 0);

-- Add DEFAULT constraint for status
ALTER TABLE complaints 
ALTER COLUMN status SET DEFAULT 'Pending';

-- Add DEFAULT constraint for priority
ALTER TABLE complaints 
ALTER COLUMN priority SET DEFAULT 'Medium';

-- Add NOT NULL constraint to existing columns
ALTER TABLE departments 
MODIFY COLUMN department_name VARCHAR(100) NOT NULL;

ALTER TABLE officers 
MODIFY COLUMN officer_name VARCHAR(100) NOT NULL;

ALTER TABLE citizens 
MODIFY COLUMN citizen_name VARCHAR(100) NOT NULL;

-- Add UNIQUE constraint for badge number
ALTER TABLE officers 
ADD CONSTRAINT uq_badge_number UNIQUE (badge_number);

-- Add composite key for citizen + category combination
ALTER TABLE complaints 
ADD CONSTRAINT uq_citizen_category_date 
UNIQUE (citizen_id, category_id, created_at);

SELECT * FROM information_schema.table_constraints 
WHERE table_schema = 'citizen_complaint_db';


-- ============================================
// 3.2 AGGREGATE FUNCTIONS
// ============================================

/*
Question: Find total revenue from services by each department
*/
SELECT 
    d.department_name,
    COUNT(s.service_id) AS total_services,
    COALESCE(SUM(s.amount), 0) AS total_revenue,
    COALESCE(AVG(s.amount), 0) AS average_service_amount,
    COALESCE(MAX(s.amount), 0) AS max_service_charge,
    COALESCE(MIN(s.amount), 0) AS min_service_charge
FROM departments d
LEFT JOIN services s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name
ORDER BY total_revenue DESC;

/*
Question: Find complaint statistics by status and priority
*/
SELECT 
    status,
    priority,
    COUNT(*) AS total_complaints,
    COUNT(DISTINCT citizen_id) AS unique_citizens,
    MIN(created_at) AS earliest_complaint,
    MAX(created_at) AS latest_complaint
FROM complaints
GROUP BY status, priority
ORDER BY status, priority;

/*
Question: Find department-wise project statistics
*/
SELECT 
    d.department_name,
    COUNT(p.project_id) AS total_projects,
    COALESCE(SUM(p.budget), 0) AS total_budget,
    COALESCE(AVG(p.budget), 0) AS avg_budget,
    COUNT(CASE WHEN p.end_date >= CURDATE() THEN 1 END) AS active_projects,
    COUNT(CASE WHEN p.end_date < CURDATE() THEN 1 END) AS completed_projects
FROM departments d
LEFT JOIN projects p ON d.department_id = p.department_id
GROUP BY d.department_id, d.department_name;

/*
Question: Find officer performance metrics
*/
SELECT 
    o.officer_name,
    o.designation,
    d.department_name,
    COUNT(c.complaint_id) AS assigned_complaints,
    COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) AS resolved_complaints,
    COUNT(CASE WHEN c.status = 'In Progress' THEN 1 END) AS in_progress,
    ROUND(COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) * 100.0 / COUNT(*), 2) AS resolution_rate
FROM officers o
JOIN departments d ON o.department_id = d.department_id
LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
GROUP BY o.officer_id, o.officer_name, o.designation, d.department_name
ORDER BY resolution_rate DESC;


/* 
Question: Count citizens by city with HAVING clause
*/
SELECT 
    city,
    COUNT(*) AS citizen_count,
    COUNT(DISTINCT ward_number) AS unique_wards
FROM citizens
GROUP BY city
HAVING citizen_count > 0
ORDER BY citizen_count DESC;


/* 
Question: Find departments with above-average project budgets
*/
SELECT 
    d.department_name,
    COUNT(p.project_id) AS project_count,
    SUM(p.budget) AS total_budget
FROM departments d
JOIN projects p ON d.department_id = p.department_id
GROUP BY d.department_id, d.department_name
HAVING SUM(p.budget) > (
    SELECT AVG(total) FROM (
        SELECT SUM(budget) AS total FROM projects GROUP BY department_id
    ) AS dept_totals
)
ORDER BY total_budget DESC;


/* 
Question: Use GROUP_CONCAT to list all services per department
*/
SELECT 
    d.department_name,
    GROUP_CONCAT(s.service_name SEPARATOR ', ') AS services_offered,
    COUNT(s.service_id) AS service_count,
    SUM(s.amount) AS total_service_value
FROM departments d
LEFT JOIN services s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name;


/* 
Question: Use ROLLUP for hierarchical summary
*/
SELECT 
    COALESCE(d.department_name, 'TOTAL') AS department,
    COUNT(p.project_id) AS project_count,
    COALESCE(SUM(p.budget), 0) AS total_budget
FROM departments d
LEFT JOIN projects p ON d.department_id = p.department_id
GROUP BY ROLLUP (d.department_name);


-- ============================================
// 3.3 SET OPERATIONS (UNION, INTERSECT, MINUS)
// ============================================

/*
Question: Find all entities (citizens who filed complaints OR citizens who use services)
*/
-- UNION: Combine citizens who filed complaints with those who might use services
SELECT c.citizen_id, c.citizen_name, c.phone_number, 'Complainant' AS involvement_type
FROM citizens c
JOIN complaints comp ON c.citizen_id = comp.citizen_id

UNION

SELECT c.citizen_id, c.citizen_name, c.phone_number, 'Service User' AS involvement_type
FROM citizens c
WHERE c.citizen_id IN (
    SELECT DISTINCT citizen_id FROM complaints
);

/*
Question: Find citizens who BOTH filed high-priority complaints AND are in specific ward
*/
-- INTERSECT equivalent in MySQL (using INNER JOIN)
SELECT DISTINCT c.citizen_id, c.citizen_name, c.ward_number
FROM citizens c
INNER JOIN (
    SELECT citizen_id FROM complaints WHERE priority = 'High'
) high_prio ON c.citizen_id = high_prio.citizen_id
WHERE c.ward_number IS NOT NULL;

/*
Question: Find departments with projects but NO services
*/
-- MINUS equivalent in MySQL (using LEFT JOIN + IS NULL)
SELECT d.department_id, d.department_name
FROM departments d
LEFT JOIN projects p ON d.department_id = p.department_id
WHERE p.project_id IS NOT NULL
AND d.department_id NOT IN (
    SELECT DISTINCT department_id FROM services WHERE department_id IS NOT NULL
);

/*
Question: Combine multiple aggregates using UNION ALL
*/
SELECT 'Total Projects' AS metric, COUNT(*) AS count FROM projects
UNION ALL
SELECT 'Active Projects', COUNT(*) FROM projects WHERE end_date >= CURDATE()
UNION ALL
SELECT 'Total Services', COUNT(*) FROM services
UNION ALL
SELECT 'Total Complaints', COUNT(*) FROM complaints
UNION ALL
SELECT 'Resolved Complaints', COUNT(*) FROM complaints WHERE status = 'Resolved'
UNION ALL
SELECT 'Pending Complaints', COUNT(*) FROM complaints WHERE status = 'Pending';


-- ============================================
// 3.4 SUBQUERIES
// ============================================

/*
Question: Find citizens who filed more complaints than average
*/
SELECT 
    c.citizen_id,
    c.citizen_name,
    c.phone_number,
    COUNT(comp.complaint_id) AS complaint_count
FROM citizens c
JOIN complaints comp ON c.citizen_id = comp.citizen_id
GROUP BY c.citizen_id, c.citizen_name, c.phone_number
HAVING COUNT(comp.complaint_id) > (
    SELECT AVG(cnt) FROM (
        SELECT COUNT(*) AS cnt FROM complaints GROUP BY citizen_id
    ) AS avg_count
);

/*
Question: Find most expensive service in each department
*/
SELECT 
    s.service_id,
    s.service_name,
    s.amount,
    d.department_name
FROM services s
JOIN departments d ON s.department_id = d.department_id
WHERE s.amount = (
    SELECT MAX(amount) 
    FROM services 
    WHERE department_id = s.department_id
)
ORDER BY d.department_name;

/*
Question: Find complaints that are still pending after SLA time
*/
SELECT 
    c.complaint_id,
    c.complaint_number,
    c.complaint_title,
    c.created_at,
    DATEDIFF(CURDATE(), c.created_at) AS days_pending,
    cc.sla_hours,
    CASE 
        WHEN DATEDIFF(CURDATE(), c.created_at) * 24 > cc.sla_hours THEN 'OVERDUE'
        ELSE 'WITHIN SLA'
    END AS sla_status
FROM complaints c
JOIN complaint_categories cc ON c.category_id = cc.category_id
WHERE c.status IN ('Pending', 'In Progress')
ORDER BY days_pending DESC;

/*
Question: Find departments with budget more than twice the average
*/
SELECT 
    department_name,
    total_budget
FROM (
    SELECT 
        d.department_name,
        COALESCE(SUM(p.budget), 0) AS total_budget
    FROM departments d
    LEFT JOIN projects p ON d.department_id = p.department_id
    GROUP BY d.department_id, d.department_name
) dept_budget
WHERE total_budget > 2 * (
    SELECT AVG(total) FROM (
        SELECT SUM(budget) AS total FROM projects GROUP BY department_id
    ) AS avg_budget
);

/*
Question: Find citizens who never filed a complaint (using subquery)
*/
SELECT 
    citizen_id,
    citizen_name,
    phone_number,
    registration_date
FROM citizens
WHERE citizen_id NOT IN (
    SELECT DISTINCT citizen_id FROM complaints
);

/*
Question: Correlated subquery - Find officers with above-average assignments
*/
SELECT 
    o.officer_name,
    o.designation,
    COUNT(c.complaint_id) AS assigned_count,
    ROUND((
        SELECT AVG(cnt) FROM (
            SELECT COUNT(*) AS cnt 
            FROM complaints 
            GROUP BY assigned_officer_id
        ) AS avg_assign
    ), 2) AS avg_assignments
FROM officers o
LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
GROUP BY o.officer_id, o.officer_name, o.designation
HAVING COUNT(c.complaint_id) > (
    SELECT AVG(cnt) FROM (
        SELECT COUNT(*) AS cnt 
        FROM complaints 
        GROUP BY assigned_officer_id
    ) AS avg_assign
)
ORDER BY assigned_count DESC;

/*
Question: Subquery in FROM clause - Find monthly complaint trends
*/
SELECT 
    month_name,
    total_complaints,
    resolved_complaints,
    pending_complaints,
    ROUND(resolved_complaints * 100.0 / total_complaints, 2) AS resolution_percentage
FROM (
    SELECT 
        MONTHNAME(created_at) AS month_name,
        COUNT(*) AS total_complaints,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_complaints,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_complaints
    FROM complaints
    WHERE YEAR(created_at) = 2026
    GROUP BY MONTH(created_at), MONTHNAME(created_at)
) monthly_data
ORDER BY FIELD(month_name, 'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December');


-- ============================================
// 3.5 JOINS
// ============================================

/*
Question: Get complete complaint details with all related information (INNER JOIN)
*/
SELECT 
    c.complaint_id,
    c.complaint_number,
    c.complaint_title,
    c.complaint_description,
    c.location,
    c.priority,
    c.status,
    c.created_at,
    ct.category_name,
    d.department_name,
    o.officer_name AS assigned_officer,
    ci.citizen_name AS complainant,
    ci.phone_number
FROM complaints c
INNER JOIN complaint_categories ct ON c.category_id = ct.category_id
INNER JOIN departments d ON c.department_id = d.department_id
LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
INNER JOIN citizens ci ON c.citizen_id = ci.citizen_id
ORDER BY c.created_at DESC
LIMIT 20;

/*
Question: Get all departments with their projects and services (LEFT JOIN)
*/
SELECT 
    d.department_name,
    d.department_head,
    d.email,
    p.project_name,
    p.budget,
    p.status AS project_status,
    s.service_name,
    s.amount AS service_charge
FROM departments d
LEFT JOIN projects p ON d.department_id = p.department_id
LEFT JOIN services s ON d.department_id = s.department_id
ORDER BY d.department_name, p.project_name;

/*
Question: Get all citizens and their complaint counts (RIGHT JOIN simulation)
*/
SELECT 
    ci.citizen_id,
    ci.citizen_name,
    ci.email,
    COALESCE(COUNT(c.complaint_id), 0) AS total_complaints,
    COALESCE(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END), 0) AS resolved,
    COALESCE(SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending
FROM citizens ci
LEFT JOIN complaints c ON ci.citizen_id = c.citizen_id
GROUP BY ci.citizen_id, ci.citizen_name, ci.email
ORDER BY total_complaints DESC;

/*
Question: Self-join to find officers in same department
*/
SELECT 
    o1.officer_name AS officer_1,
    o1.designation,
    o2.officer_name AS colleague,
    o2.designation,
    d.department_name
FROM officers o1
JOIN officers o2 ON o1.department_id = o2.department_id AND o1.officer_id < o2.officer_id
JOIN departments d ON o1.department_id = d.department_id
ORDER BY d.department_name, o1.officer_name;

/*
Question: Multiple JOINs - Full service request analysis
*/
SELECT 
    s.service_id,
    s.service_name,
    s.amount,
    d.department_name AS service_provider,
    o.officer_name AS handling_officer,
    o.contact_number AS officer_contact
FROM services s
INNER JOIN departments d ON s.department_id = d.department_id
LEFT JOIN officers o ON s.officer_id = o.officer_id
WHERE s.amount > 500
ORDER BY s.amount DESC;

/*
Question: CROSS JOIN to create all department-officer combinations for assignment matrix
*/
SELECT 
    d.department_name,
    o.officer_name,
    o.designation,
    CASE 
        WHEN o.department_id = d.department_id THEN 'SAME DEPT'
        ELSE 'DIFFERENT DEPT'
    END AS assignment_possible
FROM departments d
CROSS JOIN officers o
ORDER BY d.department_name, o.officer_name;

/*
Question: NATURAL JOIN between projects and departments
*/
SELECT 
    p.project_id,
    p.project_name,
    p.location,
    p.budget,
    p.start_date,
    p.end_date,
    d.department_name,
    d.department_head
FROM projects p
NATURAL JOIN departments d
ORDER BY p.start_date DESC;

/*
Question: Join with calculated fields - Project duration and budget analysis
*/
SELECT 
    p.project_name,
    d.department_name,
    p.location,
    p.budget,
    p.start_date,
    p.end_date,
    DATEDIFF(COALESCE(p.end_date, CURDATE()), p.start_date) AS duration_days,
    ROUND(p.budget / NULLIF(DATEDIFF(COALESCE(p.end_date, CURDATE()), p.start_date), 0), 2) AS daily_budget,
    CASE 
        WHEN p.end_date < CURDATE() THEN 'COMPLETED'
        WHEN p.end_date >= CURDATE() AND p.start_date <= CURDATE() THEN 'IN PROGRESS'
        ELSE 'YET TO START'
    END AS project_status
FROM projects p
JOIN departments d ON p.department_id = d.department_id
ORDER BY p.budget DESC;


-- ============================================
// 3.6 VIEWS
// ============================================

/*
Question: Create view for active complaints with full details
*/
CREATE OR REPLACE VIEW v_active_complaints AS
SELECT 
    c.complaint_id,
    c.complaint_number,
    c.complaint_title,
    c.location,
    c.priority,
    c.status,
    c.created_at,
    ct.category_name,
    d.department_name,
    o.officer_name AS assigned_officer,
    ci.citizen_name AS complainant,
    ci.phone_number,
    DATEDIFF(CURDATE(), c.created_at) AS days_pending
FROM complaints c
JOIN complaint_categories ct ON c.category_id = ct.category_id
JOIN departments d ON c.department_id = d.department_id
LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
JOIN citizens ci ON c.citizen_id = ci.citizen_id
WHERE c.status IN ('Pending', 'In Progress');

/*
Question: Create view for department performance summary
*/
CREATE OR REPLACE VIEW v_department_performance AS
SELECT 
    d.department_id,
    d.department_name,
    d.department_head,
    COUNT(DISTINCT p.project_id) AS project_count,
    COUNT(DISTINCT s.service_id) AS service_count,
    COUNT(DISTINCT o.officer_id) AS officer_count,
    COALESCE(SUM(p.budget), 0) AS total_project_budget,
    COUNT(DISTINCT c.complaint_id) AS total_complaints,
    ROUND(COALESCE(
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(c.complaint_id), 0), 
    0), 2) AS resolution_rate
FROM departments d
LEFT JOIN projects p ON d.department_id = p.department_id
LEFT JOIN services s ON d.department_id = s.department_id
LEFT JOIN officers o ON d.department_id = o.department_id
LEFT JOIN complaints c ON d.department_id = c.department_id
GROUP BY d.department_id, d.department_name, d.department_head;

/*
Question: Create view for citizen dashboard
*/
CREATE OR REPLACE VIEW v_citizen_dashboard AS
SELECT 
    ci.citizen_id,
    ci.citizen_name,
    ci.phone_number,
    ci.ward_number,
    COUNT(c.complaint_id) AS total_complaints,
    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN c.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
    MAX(c.created_at) AS last_complaint_date
FROM citizens ci
LEFT JOIN complaints c ON ci.citizen_id = c.citizen_id
GROUP BY ci.citizen_id, ci.citizen_name, ci.phone_number, ci.ward_number;

/*
Question: Create view for officer workload
*/
CREATE OR REPLACE VIEW v_officer_workload AS
SELECT 
    o.officer_id,
    o.officer_name,
    o.badge_number,
    d.department_name,
    COUNT(c.complaint_id) AS assigned_cases,
    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    ROUND(COALESCE(
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(c.complaint_id), 0),
    0), 2) AS resolution_rate,
    AVG(DATEDIFF(COALESCE(c.resolved_at, CURDATE()), c.created_at)) AS avg_resolution_days
FROM officers o
JOIN departments d ON o.department_id = d.department_id
LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
GROUP BY o.officer_id, o.officer_name, o.badge_number, d.department_name;

/*
Question: Create view for project status overview
*/
CREATE OR REPLACE VIEW v_project_status AS
SELECT 
    p.project_id,
    p.project_name,
    p.location,
    p.budget,
    p.start_date,
    p.end_date,
    d.department_name,
    p.project_leader,
    CASE 
        WHEN p.end_date < CURDATE() THEN 'COMPLETED'
        WHEN p.start_date > CURDATE() THEN 'NOT STARTED'
        ELSE 'IN PROGRESS'
    END AS current_status,
    DATEDIFF(COALESCE(p.end_date, CURDATE()), CURDATE()) AS days_remaining,
    DATEDIFF(p.end_date, p.start_date) AS total_duration,
    ROUND(DATEDIFF(CURDATE(), p.start_date) * 100.0 / NULLIF(DATEDIFF(p.end_date, p.start_date), 0), 2) AS percent_complete
FROM projects p
JOIN departments d ON p.department_id = d.department_id;

/*
Query views
*/
SELECT * FROM v_active_complaints;
SELECT * FROM v_department_performance;
SELECT * FROM v_citizen_dashboard;
SELECT * FROM v_officer_workload;
SELECT * FROM v_project_status;


/* 
Question: Update through view (with check option)
*/
CREATE OR REPLACE VIEW v_pending_complaints AS
SELECT 
    complaint_id,
    complaint_number,
    citizen_id,
    department_id,
    complaint_title,
    status,
    priority,
    created_at
FROM complaints
WHERE status = 'Pending'
WITH CHECK OPTION;

/*
Question: Drop a view
*/
DROP VIEW IF EXISTS v_old_view_name;


/* 
Question: Get information about views
*/
SELECT 
    table_name AS view_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'citizen_complaint_db'
AND table_type = 'VIEW';


-- ============================================
// 3.7 TRIGGERS
// ============================================

/*
Question: Create trigger to auto-update complaint status when assigned to officer
*/
DELIMITER $$

CREATE TRIGGER trg_complaint_assigned
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NEW.assigned_officer_id IS NOT NULL 
       AND OLD.assigned_officer_id IS NULL 
       AND NEW.status = 'Pending' THEN
        INSERT INTO complaint_status_history 
        (complaint_id, previous_status, new_status, changed_by, change_reason, changed_at)
        VALUES (
            NEW.complaint_id,
            'Pending',
            'In Progress',
            NEW.assigned_officer_id,
            'Automatically assigned to officer',
            NOW()
        );
        
        UPDATE complaints 
        SET status = 'In Progress', updated_at = NOW() 
        WHERE complaint_id = NEW.complaint_id;
    END IF;
END$$

DELIMITER ;


/*
Question: Create trigger to log new complaint creation
*/
DELIMITER $$

CREATE TRIGGER trg_complaint_created
AFTER INSERT ON complaints
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs 
    (user_id, action_type, table_name, record_id, new_values, created_at)
    VALUES (
        NEW.citizen_id,
        'INSERT',
        'complaints',
        NEW.complaint_id,
        JSON_OBJECT(
            'complaint_number', NEW.complaint_number,
            'title', NEW.complaint_title,
            'status', NEW.status,
            'priority', NEW.priority
        ),
        NOW()
    );
END$$

DELIMITER ;


/*
Question: Create trigger to prevent past dates in projects
*/
DELIMITER $$

CREATE TRIGGER trg_project_dates
BEFORE INSERT ON projects
FOR EACH ROW
BEGIN
    IF NEW.start_date < CURDATE() THEN
        SET NEW.start_date = CURDATE();
    END IF;
    
    IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
        SET NEW.end_date = DATE_ADD(NEW.start_date, INTERVAL 6 MONTH);
    END IF;
END$$

DELIMITER ;


/*
Question: Create trigger to update citizen complaint count
*/
DELIMITER $$

CREATE TRIGGER trg_update_citizen_complaint_count
AFTER INSERT ON complaints
FOR EACH ROW
BEGIN
    -- This would require an additional column in citizens table
    -- ALTER TABLE citizens ADD COLUMN complaint_count INT DEFAULT 0;
    
    UPDATE citizens 
    SET complaint_count = complaint_count + 1 
    WHERE citizen_id = NEW.citizen_id;
END$$

DELIMITER ;


/*
Question: Create trigger to validate service amount
*/
DELIMITER $$

CREATE TRIGGER trg_validate_service_amount
BEFORE INSERT ON services
FOR EACH ROW
BEGIN
    IF NEW.amount < 0 THEN
        SET NEW.amount = 0;
    END IF;
    
    IF NEW.amount > 100000 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Service amount cannot exceed 100,000';
    END IF;
END$$

DELIMITER ;


/*
Question: Create trigger for soft delete (archive instead of delete)
*/
DELIMITER $$

CREATE TRIGGER trg_archive_department
BEFORE DELETE ON departments
FOR EACH ROW
BEGIN
    -- Insert into archive table or log
    INSERT INTO audit_logs 
    (user_id, action_type, table_name, record_id, old_values, created_at)
    VALUES (
        NULL,
        'DELETE',
        'departments',
        OLD.department_id,
        JSON_OBJECT(
            'department_name', OLD.department_name,
            'department_head', OLD.department_head
        ),
        NOW()
    );
END$$

DELIMITER ;


/*
Question: Create trigger for automatic resolution date
*/
DELIMITER $$

CREATE TRIGGER trg_resolution_date
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
        SET NEW.resolved_at = NOW();
    END IF;
    
    IF NEW.status = 'Closed' AND OLD.status = 'Resolved' THEN
        SET NEW.updated_at = NOW();
    END IF;
END$$

DELIMITER ;


/*
Question: Show all triggers
*/
SHOW TRIGGERS FROM citizen_complaint_db;


/*
Question: Drop a trigger
*/
DROP TRIGGER IF EXISTS trg_complaint_assigned;


-- ============================================
// 3.8 CURSORS
// ============================================

/*
Question: Create cursor to iterate through all departments and calculate totals
*/
DELIMITER $$

CREATE PROCEDURE sp_department_summary()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_dept_name VARCHAR(100);
    DECLARE v_dept_id INT;
    DECLARE v_project_count INT;
    DECLARE v_total_budget DECIMAL(12,2);
    
    -- Cursor declaration
    DECLARE dept_cursor CURSOR FOR 
        SELECT d.department_id, d.department_name
        FROM departments d;
    
    -- Handler for when cursor finishes
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS dept_summary (
        department_name VARCHAR(100),
        project_count INT,
        total_budget DECIMAL(12,2)
    );
    
    OPEN dept_cursor;
    
    dept_loop: LOOP
        FETCH dept_cursor INTO v_dept_id, v_dept_name;
        
        IF done THEN
            LEAVE dept_loop;
        END IF;
        
        -- Calculate project count and budget for this department
        SELECT COUNT(*), COALESCE(SUM(budget), 0)
        INTO v_project_count, v_total_budget
        FROM projects
        WHERE department_id = v_dept_id;
        
        -- Insert into temp table
        INSERT INTO dept_summary VALUES (v_dept_name, v_project_count, v_total_budget);
        
    END LOOP;
    
    CLOSE dept_cursor;
    
    -- Return results
    SELECT * FROM dept_summary ORDER BY total_budget DESC;
    
    -- Clean up
    DROP TEMPORARY TABLE IF EXISTS dept_summary;
END$$

DELIMITER ;

/*
Question: Create cursor to update officer workload statistics
*/
DELIMITER $$

CREATE PROCEDURE sp_update_officer_stats()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_officer_id INT;
    DECLARE v_complaint_count INT;
    DECLARE v_resolved_count INT;
    
    DECLARE officer_cursor CURSOR FOR 
        SELECT officer_id FROM officers WHERE is_active = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN officer_cursor;
    
    officer_loop: LOOP
        FETCH officer_cursor INTO v_officer_id;
        
        IF done THEN
            LEAVE officer_loop;
        END IF;
        
        -- Calculate stats
        SELECT 
            COUNT(*),
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END)
        INTO v_complaint_count, v_resolved_count
        FROM complaints
        WHERE assigned_officer_id = v_officer_id;
        
        -- Could update a stats table here
        -- For demo, we'll just select the results
        SELECT 
            o.officer_name,
            v_complaint_count AS total_assigned,
            v_resolved_count AS resolved,
            ROUND(v_resolved_count * 100.0 / NULLIF(v_complaint_count, 0), 2) AS resolution_rate
        FROM officers o
        WHERE o.officer_id = v_officer_id;
        
    END LOOP;
    
    CLOSE officer_cursor;
END$$

DELIMITER ;


/*
Question: Create cursor to generate monthly complaint report
*/
DELIMITER $$

CREATE PROCEDURE sp_monthly_complaint_report(IN report_year INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_month INT;
    DECLARE v_month_name VARCHAR(20);
    DECLARE v_total INT;
    DECLARE v_resolved INT;
    DECLARE v_pending INT;
    
    DECLARE month_cursor CURSOR FOR
        SELECT MONTH(created_at), MONTHNAME(created_at), COUNT(*)
        FROM complaints
        WHERE YEAR(created_at) = report_year
        GROUP BY MONTH(created_at), MONTHNAME(created_at)
        ORDER BY MONTH(created_at);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    CREATE TEMPORARY TABLE IF NOT EXISTS monthly_report (
        month_name VARCHAR(20),
        total_complaints INT,
        resolved INT,
        pending INT,
        resolution_rate DECIMAL(5,2)
    );
    
    OPEN month_cursor;
    
    month_loop: LOOP
        FETCH month_cursor INTO v_month, v_month_name, v_total;
        
        IF done THEN
            LEAVE month_loop;
        END IF;
        
        SELECT 
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END),
            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END)
        INTO v_resolved, v_pending
        FROM complaints
        WHERE YEAR(created_at) = report_year AND MONTH(created_at) = v_month;
        
        INSERT INTO monthly_report VALUES (
            v_month_name,
            v_total,
            v_resolved,
            v_pending,
            ROUND(v_resolved * 100.0 / v_total, 2)
        );
        
    END LOOP;
    
    CLOSE month_cursor;
    
    SELECT * FROM monthly_report;
    
    DROP TEMPORARY TABLE IF EXISTS monthly_report;
END$$

DELIMITER ;


/*
Question: Create cursor with nested loop to create assignment matrix
*/
DELIMITER $$

CREATE PROCEDURE sp_create_assignment_matrix()
BEGIN
    DECLARE done_outer INT DEFAULT FALSE;
    DECLARE done_inner INT DEFAULT FALSE;
    DECLARE v_dept_id INT;
    DECLARE v_dept_name VARCHAR(100);
    DECLARE v_officer_id INT;
    DECLARE v_officer_name VARCHAR(100);
    
    DECLARE dept_cursor CURSOR FOR SELECT department_id, department_name FROM departments;
    DECLARE officer_cursor CURSOR FOR SELECT officer_id, officer_name FROM officers;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_inner = TRUE;
    
    CREATE TEMPORARY TABLE IF NOT EXISTS assignment_matrix (
        department_name VARCHAR(100),
        officer_name VARCHAR(100),
        same_department BOOLEAN
    );
    
    OPEN dept_cursor;
    
    outer_loop: LOOP
        FETCH dept_cursor INTO v_dept_id, v_dept_name;
        
        IF done_outer THEN
            LEAVE outer_loop;
        END IF;
        
        SET done_inner = FALSE;
        OPEN officer_cursor;
        
        inner_loop: LOOP
            FETCH officer_cursor INTO v_officer_id, v_officer_name;
            
            IF done_inner THEN
                LEAVE inner_loop;
            END IF;
            
            INSERT INTO assignment_matrix VALUES (
                v_dept_name,
                v_officer_name,
                v_dept_id = (SELECT department_id FROM officers WHERE officer_id = v_officer_id)
            );
            
        END LOOP;
        
        CLOSE officer_cursor;
        
    END LOOP;
    
    CLOSE dept_cursor;
    
    SELECT * FROM assignment_matrix ORDER BY department_name, officer_name;
    
    DROP TEMPORARY TABLE IF EXISTS assignment_matrix;
END$$

DELIMITER ;


/*
Question: Drop a stored procedure
*/
DROP PROCEDURE IF EXISTS sp_department_summary;


/*
Question: Show stored procedures
*/
SHOW PROCEDURE STATUS WHERE db = 'citizen_complaint_db';


/*
Question: Call the procedures
*/
CALL sp_department_summary();
CALL sp_update_officer_stats();
CALL sp_monthly_complaint_report(2026);
CALL sp_create_assignment_matrix();
