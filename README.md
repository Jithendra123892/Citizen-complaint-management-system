# Smart Citizen Complaint Management System

## Project Overview

A comprehensive database-driven complaint management system for municipal authorities to systematically store, track, and manage citizen complaints while ensuring data integrity and accountability.

## Features

- **Citizen Management**: Register and manage citizen details with secure data storage
- **Complaint Registration**: Unique complaint numbers with category and department assignment
- **Status Tracking**: Workflow-based status (Pending → In Progress → Resolved)
- **Department Management**: Multi-department support with officer assignment
- **SLA Monitoring**: Service Level Agreement tracking and overdue alerts
- **Audit Trail**: Complete history of complaint status changes
- **Duplicate Prevention**: Detect and prevent duplicate complaints
- **Role-Based Access Control**: Secure access using database privileges

## Database Schema

### Main Tables

1. **departments** - Municipal departments
2. **officers** - Municipal officers
3. **complaint_categories** - Complaint types with SLA
4. **citizens** - Citizen registration
5. **complaints** - Main complaint records
6. **complaint_status_history** - Status change audit
7. **complaint_attachments** - Supporting documents
8. **users** - System users
9. **audit_logs** - System audit trail

### Views

- `v_active_complaints` - Active complaints with SLA status
- `v_department_performance` - Department resolution metrics
- `v_citizen_complaints` - Citizen complaint history
- `v_officer_workload` - Officer workload analysis
- `v_complaint_trends` - Daily complaint trends

### Stored Procedures

- `sp_generate_complaint_number` - Auto-generate complaint numbers
- `sp_update_complaint_status` - Update status with history
- `sp_assign_complaint` - Assign complaints to officers
- `sp_check_duplicate_complaint` - Detect duplicates
- `sp_department_report` - Generate department reports
- `sp_get_complaint_details` - Get full complaint info

### Functions

- `fn_complaint_age_days` - Calculate complaint age
- `fn_check_sla` - Check SLA compliance
- `fn_status_summary` - Get status counts

## File Structure

```
project_dbms/
├── complaint_management_schema.sql   - DDL (Tables, Views, Procedures)
├── complaint_management_dcl.sql      - DCL (User Management, Privileges)
├── complaint_management_sample_data.sql - DML (Sample Data)
└── README.md                         - This file
```

## Installation Instructions

### MySQL

```bash
# 1. Create database
mysql -u root -p < complaint_management_schema.sql

# 2. Apply DCL (as admin)
mysql -u root -p < complaint_management_dcl.sql

# 3. Insert sample data
mysql -u root -p < complaint_management_sample_data.sql
```

### PostgreSQL

```bash
# Adjust syntax for PostgreSQL (IDENTIFIED BY → PASSWORD, AUTO_INCREMENT → SERIAL)
psql -U postgres -d complaint_db -f complaint_management_schema.sql
```

### Tina SQL

Execute files in order using Tina SQL interface.

## User Roles

| Role | Privileges |
|------|------------|
| db_admin | Full access to all objects |
| dept_head | Manage department complaints |
| municipal_officer | Update assigned complaints |
| citizen_portal | Register complaints |
| report_analyst | Read-only with reporting |
| compliance_audit | Audit trail access |
| read_only | Select on all tables |

## Workflow

```
1. Citizen registers complaint
   ↓
2. System generates unique complaint number
   ↓
3. Complaint assigned to department
   ↓
4. Department head assigns to officer
   ↓
5. Status: Pending → In Progress → Resolved
   ↓
6. Citizen can view status online
   ↓
7. Complaint closed after verification
```

## Sample Queries

### Get all pending complaints:
```sql
SELECT * FROM complaints WHERE status = 'Pending';
```

### Get department performance:
```sql
SELECT * FROM v_department_performance;
```

### Check SLA status:
```sql
SELECT complaint_number, fn_check_sla(complaint_id) AS sla_status 
FROM complaints;
```

## Security Features

- Password hashing for user authentication
- Role-based access control
- Audit logging for all changes
- Row-level security policies
- SSL/TLS encryption for connections

## Compliance

- Data integrity through foreign key constraints
- Duplicate prevention mechanisms
- Status transition validation
- Complete audit trail
- SLA monitoring and alerts

## License

This project is created for educational purposes.
