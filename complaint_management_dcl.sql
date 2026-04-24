-- ============================================================
-- SMART CITIZEN COMPLAINT MANAGEMENT SYSTEM
-- DCL Commands (Data Control Language)
-- User Management and Access Control
-- ============================================================

USE citizen_complaint_db;

-- ============================================================
-- SECTION 1: CREATE DATABASE USERS
-- ============================================================

-- Create Admin User (Full Access)
CREATE USER IF NOT EXISTS 'admin_user'@'localhost' IDENTIFIED BY 'Admin@123#';
CREATE USER IF NOT EXISTS 'admin_user'@'%' IDENTIFIED BY 'Admin@123#';

-- Create Department Head Users
CREATE USER IF NOT EXISTS 'head_roads'@'localhost' IDENTIFIED BY 'Roads@2024';
CREATE USER IF NOT EXISTS 'head_water'@'localhost' IDENTIFIED BY 'Water@2024';
CREATE USER IF NOT EXISTS 'head_electricity'@'localhost' IDENTIFIED BY 'Electric@2024';
CREATE USER IF NOT EXISTS 'head_sanitation'@'localhost' IDENTIFIED BY 'Sanitation@2024';

-- Create Municipal Officer Users
CREATE USER IF NOT EXISTS 'officer_roads_01'@'localhost' IDENTIFIED BY 'Officer01#';
CREATE USER IF NOT EXISTS 'officer_water_01'@'localhost' IDENTIFIED BY 'Officer02#';
CREATE USER IF NOT EXISTS 'officer_electric_01'@'localhost' IDENTIFIED BY 'Officer03#';
CREATE USER IF NOT EXISTS 'officer_sanitation_01'@'localhost' IDENTIFIED BY 'Officer04#';

-- Create Citizen Portal User
CREATE USER IF NOT EXISTS 'portal_user'@'localhost' IDENTIFIED BY 'Portal@2024';
CREATE USER IF NOT EXISTS 'portal_user'@'%' IDENTIFIED BY 'Portal@2024';

-- Create Reporting/Analysis User
CREATE USER IF NOT EXISTS 'reports_user'@'localhost' IDENTIFIED BY 'Reports@2024';
CREATE USER IF NOT EXISTS 'reports_user'@'%' IDENTIFIED BY 'Reports@2024';

-- Create Audit/Compliance User
CREATE USER IF NOT EXISTS 'audit_user'@'localhost' IDENTIFIED BY 'Audit@2024';

-- ============================================================
-- SECTION 2: CREATE ROLES
-- ============================================================

-- Database Administrator Role
CREATE ROLE IF NOT EXISTS 'db_admin';

-- Department Head Role
CREATE ROLE IF NOT EXISTS 'dept_head';

-- Municipal Officer Role
CREATE ROLE IF NOT EXISTS 'municipal_officer';

-- Citizen Portal Role
CREATE ROLE IF NOT EXISTS 'citizen_portal';

-- Reporting Role
CREATE ROLE IF NOT EXISTS 'report_analyst';

-- Audit Role
CREATE ROLE IF NOT EXISTS 'compliance_audit';

-- Read-Only Role
CREATE ROLE IF NOT EXISTS 'read_only';

-- ============================================================
-- SECTION 3: GRANT PRIVILEGES TO ROLES
-- ============================================================

-- Grant privileges to DB Admin role
GRANT ALL PRIVILEGES ON citizen_complaint_db.* TO 'db_admin';
GRANT GRANT OPTION ON citizen_complaint_db.* TO 'db_admin';

-- Grant privileges to Department Head role
GRANT SELECT, INSERT, UPDATE, DELETE ON citizen_complaint_db.complaints TO 'dept_head';
GRANT SELECT, UPDATE ON citizen_complaint_db.officers TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.departments TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.complaint_categories TO 'dept_head';
GRANT SELECT, INSERT, UPDATE ON citizen_complaint_db.complaint_status_history TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.complaint_attachments TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.citizens TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.v_active_complaints TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.v_department_performance TO 'dept_head';
GRANT SELECT ON citizen_complaint_db.v_officer_workload TO 'dept_head';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_department_report TO 'dept_head';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_get_complaint_details TO 'dept_head';

-- Grant privileges to Municipal Officer role
GRANT SELECT ON citizen_complaint_db.complaints TO 'municipal_officer';
GRANT SELECT, UPDATE ON citizen_complaint_db.complaints TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.complaint_categories TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.departments TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.citizens TO 'municipal_officer';
GRANT SELECT, INSERT, UPDATE ON citizen_complaint_db.complaint_status_history TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.complaint_attachments TO 'municipal_officer';
GRANT INSERT ON citizen_complaint_db.complaint_attachments TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.v_active_complaints TO 'municipal_officer';
GRANT SELECT ON citizen_complaint_db.v_officer_workload TO 'municipal_officer';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_update_complaint_status TO 'municipal_officer';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_assign_complaint TO 'municipal_officer';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_get_complaint_details TO 'municipal_officer';

-- Grant privileges to Citizen Portal role
GRANT SELECT ON citizen_complaint_db.complaint_categories TO 'citizen_portal';
GRANT SELECT ON citizen_complaint_db.departments TO 'citizen_portal';
GRANT INSERT ON citizen_complaint_db.citizens TO 'citizen_portal';
GRANT INSERT ON citizen_complaint_db.complaints TO 'citizen_portal';
GRANT SELECT ON citizen_complaint_db.complaint_attachments TO 'citizen_portal';
GRANT INSERT ON citizen_complaint_db.complaint_attachments TO 'citizen_portal';
GRANT SELECT ON citizen_complaint_db.v_citizen_complaints TO 'citizen_portal';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_generate_complaint_number TO 'citizen_portal';
GRANT EXECUTE ON PROCEDURE citizen_complaint_db.sp_check_duplicate_complaint TO 'citizen_portal';

-- Grant privileges to Report Analyst role
GRANT SELECT ON citizen_complaint_db.citizens TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.complaints TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.departments TO 'report_analist';
GRANT SELECT ON citizen_complaint_db.complaint_categories TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.officers TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.complaint_status_history TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.v_active_complaints TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.v_department_performance TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.v_citizen_complaints TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.v_officer_workload TO 'report_analyst';
GRANT SELECT ON citizen_complaint_db.v_complaint_trends TO 'report_analyst';
GRANT EXECUTE ON FUNCTION citizen_complaint_db.fn_complaint_age_days TO 'report_analyst';
GRANT EXECUTE ON FUNCTION citizen_complaint_db.fn_check_sla TO 'report_analyst';
GRANT EXECUTE ON FUNCTION citizen_complaint_db.fn_status_summary TO 'report_analyst';

-- Grant privileges to Compliance Audit role
GRANT SELECT ON citizen_complaint_db.* TO 'compliance_audit';
GRANT SELECT ON citizen_complaint_db.audit_logs TO 'compliance_audit';
GRANT INSERT ON citizen_complaint_db.audit_logs TO 'compliance_audit';
GRANT SELECT ON citizen_complaint_db.users TO 'compliance_audit';

-- Grant privileges to Read-Only role
GRANT SELECT ON citizen_complaint_db.* TO 'read_only';

-- ============================================================
-- SECTION 4: ASSIGN ROLES TO USERS
-- ============================================================

-- Assign DB Admin role
GRANT 'db_admin' TO 'admin_user'@'localhost';
GRANT 'db_admin' TO 'admin_user'@'%';

-- Assign Department Head roles
GRANT 'dept_head' TO 'head_roads'@'localhost';
GRANT 'dept_head' TO 'head_water'@'localhost';
GRANT 'dept_head' TO 'head_electricity'@'localhost';
GRANT 'dept_head' TO 'head_sanitation'@'localhost';

-- Assign Municipal Officer roles
GRANT 'municipal_officer' TO 'officer_roads_01'@'localhost';
GRANT 'municipal_officer' TO 'officer_water_01'@'localhost';
GRANT 'municipal_officer' TO 'officer_electric_01'@'localhost';
GRANT 'municipal_officer' TO 'officer_sanitation_01'@'localhost';

-- Assign Citizen Portal role
GRANT 'citizen_portal' TO 'portal_user'@'localhost';
GRANT 'citizen_portal' TO 'portal_user'@'%';

-- Assign Reporting role
GRANT 'report_analyst' TO 'reports_user'@'localhost';
GRANT 'report_analyst' TO 'reports_user'@'%';

-- Assign Audit role
GRANT 'compliance_audit' TO 'audit_user'@'localhost';

-- ============================================================
-- SECTION 5: SET DEFAULT ROLES
-- ============================================================

SET DEFAULT ROLE 'db_admin' TO 'admin_user'@'localhost';
SET DEFAULT ROLE 'db_admin' TO 'admin_user'@'%';
SET DEFAULT ROLE 'dept_head' TO 'head_roads'@'localhost';
SET DEFAULT ROLE 'dept_head' TO 'head_water'@'localhost';
SET DEFAULT ROLE 'dept_head' TO 'head_electricity'@'localhost';
SET DEFAULT ROLE 'dept_head' TO 'head_sanitation'@'localhost';
SET DEFAULT ROLE 'municipal_officer' TO 'officer_roads_01'@'localhost';
SET DEFAULT ROLE 'municipal_officer' TO 'officer_water_01'@'localhost';
SET DEFAULT ROLE 'municipal_officer' TO 'officer_electric_01'@'localhost';
SET DEFAULT ROLE 'municipal_officer' TO 'officer_sanitation_01'@'localhost';
SET DEFAULT ROLE 'citizen_portal' TO 'portal_user'@'localhost';
SET DEFAULT ROLE 'citizen_portal' TO 'portal_user'@'%';
SET DEFAULT ROLE 'report_analyst' TO 'reports_user'@'localhost';
SET DEFAULT ROLE 'report_analyst' TO 'reports_user'@'%';
SET DEFAULT ROLE 'compliance_audit' TO 'audit_user'@'localhost';

-- ============================================================
-- SECTION 6: ROW-LEVEL SECURITY (If Supported)
-- ============================================================

-- Create view for officer-specific complaints
CREATE OR REPLACE VIEW v_officer_complaints AS
SELECT c.* 
FROM complaints c
JOIN officers o ON c.assigned_officer_id = o.officer_id
WHERE o.officer_id = CURRENT_USER;

-- Create view for department-specific data
CREATE OR REPLACE VIEW v_department_complaints AS
SELECT c.*
FROM complaints c
JOIN departments d ON c.department_id = d.department_id
JOIN officers o ON d.department_id = o.department_id
WHERE o.badge_number = CURRENT_USER;

-- ============================================================
-- SECTION 7: PASSWORD POLICY AND SECURITY
-- ============================================================

-- Create password policy (MySQL 8.0+)
-- ALTER USER 'admin_user'@'localhost' PASSWORD EXPIRE;
-- ALTER USER 'admin_user'@'localhost' PASSWORD REUSE INTERVAL 90 DAY;

-- Lock unused accounts after multiple failed attempts
-- This is typically handled by the application layer

-- ============================================================
-- SECTION 8: REVOKE PRIVILEGES
-- ============================================================

-- Revoke dangerous privileges from citizen portal
REVANT UPDATE, DELETE ON citizen_complaint_db.complaints FROM 'citizen_portal';
REVOKE DROP ON citizen_complaint_db.* FROM 'citizen_portal';
REVOKE INDEX ON citizen_complaint_db.* FROM 'citizen_portal';
REVOKE ALTER ON citizen_complaint_db.* FROM 'citizen_portal';
REVOKE CREATE ON citizen_complaint_db.* FROM 'citizen_portal';

-- Revoke write access from report analyst
REVOKE INSERT ON citizen_complaint_db.* FROM 'report_analyst';
REVOKE UPDATE ON citizen_complaint_db.* FROM 'report_analyst';
REVOKE DELETE ON citizen_complaint_db.* FROM 'report_analyst';

-- ============================================================
-- SECTION 9: GRANT WITH GRANT OPTION (Careful!)
-- ============================================================

-- Only grant with GRANT OPTION to trusted admins
GRANT SELECT, INSERT, UPDATE ON citizen_complaint_db.complaint_status_history TO 'head_roads'@'localhost' WITH GRANT OPTION;

-- ============================================================
-- SECTION 10: REVOKE ROLES FROM USERS
-- ============================================================

-- REVOKE 'municipal_officer' FROM 'officer_roads_01'@'localhost';
-- REVOKE 'citizen_portal' FROM 'old_portal_user'@'localhost';

-- ============================================================
-- SECTION 11: DROP USERS (For cleanup)
-- ============================================================

-- DROP USER IF EXISTS 'temp_user'@'localhost';
-- DROP USER IF EXISTS 'old_officer'@'localhost';

-- ============================================================
-- SECTION 12: DROP ROLES (For cleanup)
-- ============================================================

-- DROP ROLE IF EXISTS 'temp_role';

-- ============================================================
-- SECTION 13: SHOW GRANTS (Verification)
-- ============================================================

-- SHOW GRANTS FOR 'admin_user'@'localhost';
-- SHOW GRANTS FOR 'head_roads'@'localhost';
-- SHOW GRANTS FOR 'officer_roads_01'@'localhost';
-- SHOW GRANTS FOR 'portal_user'@'localhost';
-- SHOW GRANTS FOR 'reports_user'@'localhost';
-- SHOW GRANTS FOR 'audit_user'@'localhost';

-- ============================================================
-- SECTION 14: ACTIVATE CHANGES
-- ============================================================

-- Flush privileges to apply changes immediately
FLUSH PRIVILEGES;

-- ============================================================
-- SECTION 15: VIEW CURRENT ROLES AND PRIVILEGES
-- ============================================================

-- SELECT * FROM information_schema.applicable_roles;
-- SELECT * FROM information_schema.role_table_grants;
-- SELECT * FROM information_schema.user_privileges;
