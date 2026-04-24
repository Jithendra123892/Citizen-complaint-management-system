-- ============================================================
-- SMART CITIZEN COMPLAINT MANAGEMENT SYSTEM
-- Useful SQL Queries for Analysis and Reporting
-- ============================================================

USE citizen_complaint_db;

-- ============================================================
-- QUERY 1: Complaint Summary by Status
-- ============================================================
SELECT 
    status,
    COUNT(*) AS total_complaints,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints), 2) AS percentage
FROM complaints
GROUP BY status
ORDER BY FIELD(status, 'Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected');

-- ============================================================
-- QUERY 2: Complaints by Priority Level
-- ============================================================
SELECT 
    priority,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM complaints), 2) AS percentage
FROM complaints
GROUP BY priority
ORDER BY FIELD(priority, 'Critical', 'High', 'Medium', 'Low');

-- ============================================================
-- QUERY 3: Department-wise Complaint Distribution
-- ============================================================
SELECT 
    d.department_name,
    COUNT(c.complaint_id) AS total,
    SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    ROUND(
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(c.complaint_id), 0), 2
    ) AS resolution_rate
FROM departments d
LEFT JOIN complaints c ON d.department_id = c.department_id
GROUP BY d.department_id, d.department_name
ORDER BY resolution_rate ASC;

-- ============================================================
-- QUERY 4: Category-wise Complaint Analysis
-- ============================================================
SELECT 
    ct.category_name,
    d.department_name,
    COUNT(c.complaint_id) AS total,
    cc.sla_hours,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours,
    SUM(CASE 
        WHEN TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at) > cc.sla_hours 
        THEN 1 ELSE 0 END 
    ) AS sla_breaches
FROM complaint_categories ct
LEFT JOIN complaints c ON ct.category_id = c.category_id
LEFT JOIN departments d ON ct.department_id = d.department_id
LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
GROUP BY ct.category_id, ct.category_name, d.department_name, cc.sla_hours
ORDER BY sla_breaches DESC;

-- ============================================================
-- QUERY 5: Top 10 Most Frequent Complainants
-- ============================================================
SELECT 
    ci.citizen_name,
    ci.phone_number,
    COUNT(c.complaint_id) AS total_complaints,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) AS pending,
    MAX(c.created_at) AS last_complaint_date
FROM citizens ci
LEFT JOIN complaints c ON ci.citizen_id = c.citizen_id
GROUP BY ci.citizen_id, ci.citizen_name, ci.phone_number
ORDER BY total_complaints DESC
LIMIT 10;

-- ============================================================
-- QUERY 6: Officer Performance Ranking
-- ============================================================
SELECT 
    ROW_NUMBER() OVER (ORDER BY resolved DESC) AS rank,
    o.officer_name,
    o.badge_number,
    d.department_name,
    COUNT(c.complaint_id) AS assigned,
    SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    ROUND(
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(c.complaint_id), 0), 2
    ) AS resolution_rate,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours
FROM officers o
LEFT JOIN complaints c ON o.officer_id = c.assigned_officer_id
LEFT JOIN departments d ON o.department_id = d.department_id
WHERE o.is_active = TRUE
GROUP BY o.officer_id, o.officer_name, o.badge_number, d.department_name
ORDER BY resolution_rate DESC;

-- ============================================================
-- QUERY 7: Daily Complaint Trend (Last 30 Days)
-- ============================================================
SELECT 
    DATE(created_at) AS complaint_date,
    DAYNAME(created_at) AS day_name,
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
FROM complaints
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), DAYNAME(created_at)
ORDER BY complaint_date;

-- ============================================================
-- QUERY 8: Monthly Complaint Trend
-- ============================================================
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*) AS total_complaints,
    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
    ROUND(
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
        COUNT(*), 2
    ) AS resolution_rate
FROM complaints
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month;

-- ============================================================
-- QUERY 9: Overdue Complaints (SLA Breached)
-- ============================================================
SELECT 
    c.complaint_number,
    c.complaint_title,
    c.priority,
    c.status,
    ct.category_name,
    d.department_name,
    o.officer_name AS assigned_officer,
    c.created_at,
    TIMESTAMPDIFF(HOUR, c.created_at, NOW()) AS hours_since_filed,
    ct.sla_hours,
    TIMESTAMPDIFF(HOUR, c.created_at, NOW()) - ct.sla_hours AS hours_overdue
FROM complaints c
JOIN complaint_categories ct ON c.category_id = ct.category_id
LEFT JOIN departments d ON c.department_id = d.department_id
LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
WHERE c.status IN ('Pending', 'In Progress')
  AND TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > ct.sla_hours
ORDER BY hours_overdue DESC, priority DESC;

-- ============================================================
-- QUERY 10: Complaints by Ward/Location
-- ============================================================
SELECT 
    c.ward_number,
    COUNT(*) AS total_complaints,
    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
    ROUND(
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) * 100.0 / 
        COUNT(*), 2
    ) AS resolution_rate
FROM complaints c
GROUP BY c.ward_number
ORDER BY total_complaints DESC;

-- ============================================================
-- QUERY 11: Critical and High Priority Summary
-- ============================================================
SELECT 
    priority,
    status,
    COUNT(*) AS count
FROM complaints
WHERE priority IN ('Critical', 'High')
GROUP BY priority, status
ORDER BY FIELD(priority, 'Critical', 'High'), 
         FIELD(status, 'Pending', 'In Progress', 'Resolved');

-- ============================================================
-- QUERY 12: Average Resolution Time by Department
-- ============================================================
SELECT 
    d.department_name,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_hours,
    MIN(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) AS min_hours,
    MAX(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)) AS max_hours,
    COUNT(c.complaint_id) AS resolved_count
FROM departments d
LEFT JOIN complaints c ON d.department_id = c.department_id
WHERE c.status = 'Resolved'
GROUP BY d.department_id
ORDER BY avg_hours ASC;

-- ============================================================
-- QUERY 13: Status Transition Analysis
-- ============================================================
SELECT 
    previous_status,
    new_status,
    COUNT(*) AS transition_count,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, changed_at, 
        (SELECT MIN(changed_at) 
         FROM complaint_status_history sh2 
         WHERE sh2.complaint_id = sh1.complaint_id 
         AND sh2.history_id > sh1.history_id
        ))
    ), 1) AS avg_time_to_next_hours
FROM complaint_status_history sh1
WHERE previous_status IS NOT NULL
GROUP BY previous_status, new_status
ORDER BY transition_count DESC;

-- ============================================================
-- QUERY 14: Complaint Completion Rate
-- ============================================================
SELECT 
    DATE(c.resolved_at) AS resolution_date,
    COUNT(*) AS resolved_count,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours
FROM complaints c
WHERE c.status = 'Resolved'
  AND c.resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(c.resolved_at)
ORDER BY resolution_date;

-- ============================================================
-- QUERY 15: Department Load Distribution
-- ============================================================
SELECT 
    d.department_name,
    COUNT(c.complaint_id) AS total_assigned,
    COUNT(DISTINCT c.assigned_officer_id) AS officers,
    ROUND(COUNT(c.complaint_id) / COUNT(DISTINCT c.assigned_officer_id), 1) AS avg_per_officer,
    SUM(CASE WHEN c.status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) AS active_cases
FROM departments d
LEFT JOIN complaints c ON d.department_id = c.department_id
GROUP BY d.department_id
ORDER BY active_cases DESC;

-- ============================================================
-- QUERY 16: Hourly Complaint Pattern
-- ============================================================
SELECT 
    HOUR(created_at) AS hour_of_day,
    COUNT(*) AS total_complaints
FROM complaints
GROUP BY HOUR(created_at)
ORDER BY hour_of_day;

-- ============================================================
-- QUERY 17: Week-over-Week Comparison
-- ============================================================
SELECT 
    YEARWEEK(created_at) AS week,
    MIN(DATE(created_at)) AS week_start,
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
FROM complaints
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
GROUP BY YEARWEEK(created_at)
ORDER BY week;

-- ============================================================
-- QUERY 18: First Response Time Analysis
-- ============================================================
SELECT 
    d.department_name,
    ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, 
        (SELECT MIN(changed_at) 
         FROM complaint_status_history h 
         WHERE h.complaint_id = c.complaint_id 
         AND h.new_status != 'Pending'
        ))
    ), 1) AS avg_first_response_hours,
    COUNT(c.complaint_id) AS total_complaints
FROM complaints c
JOIN departments d ON c.department_id = d.department_id
GROUP BY d.department_id, d.department_name
ORDER BY avg_first_response_hours ASC;

-- ============================================================
-- QUERY 19: Complaint Categories Requiring Attention
-- ============================================================
SELECT 
    ct.category_name,
    d.department_name,
    COUNT(c.complaint_id) AS pending_count,
    ROUND(
        SUM(CASE WHEN TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > cc.sla_hours 
        THEN 1 ELSE 0 END) * 100.0 / 
        COUNT(c.complaint_id), 2
    ) AS overdue_percentage
FROM complaint_categories ct
LEFT JOIN complaints c ON ct.category_id = c.category_id
LEFT JOIN departments d ON ct.department_id = d.department_id
LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
WHERE c.status IN ('Pending', 'In Progress')
GROUP BY ct.category_id, ct.category_name, d.department_name
HAVING pending_count > 0
ORDER BY overdue_percentage DESC, pending_count DESC;

-- ============================================================
-- QUERY 20: System Health Summary
-- ============================================================
SELECT 
    'Total Complaints' AS metric,
    COUNT(*) AS value
FROM complaints
UNION ALL
SELECT 
    'Pending',
    COUNT(*) 
FROM complaints WHERE status = 'Pending'
UNION ALL
SELECT 
    'In Progress',
    COUNT(*) 
FROM complaints WHERE status = 'In Progress'
UNION ALL
SELECT 
    'Resolved',
    COUNT(*) 
FROM complaints WHERE status = 'Resolved'
UNION ALL
SELECT 
    'Critical Open',
    COUNT(*) 
FROM complaints WHERE priority = 'Critical' AND status IN ('Pending', 'In Progress')
UNION ALL
SELECT 
    'Overdue SLA',
    COUNT(*) 
FROM complaints c
JOIN complaint_categories cc ON c.category_id = cc.category_id
WHERE c.status IN ('Pending', 'In Progress')
  AND TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > cc.sla_hours
UNION ALL
SELECT 
    'Avg Resolution Hours',
    ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1)
FROM complaints WHERE status = 'Resolved';
