# Database Setup

## Option 1: Automatic Setup (Recommended)

The tables will be created automatically when you first start the server. The database connection configuration is in `config/database.js`.

## Option 2: Manual Setup

If you prefer to create tables manually, run these SQL commands:

```sql
-- Create Database
CREATE DATABASE IF NOT EXISTS citizen_complaint_db;
USE citizen_complaint_db;

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

-- Complaint Categories Table (KEY FOR AUTO-ALLOCATION)
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

-- Complaints Table (AUTO-ALLOCATION HAPPENS HERE)
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id INT PRIMARY KEY AUTO_INCREMENT,
    complaint_number VARCHAR(20) NOT NULL UNIQUE,
    citizen_id INT NOT NULL,
    category_id INT NOT NULL,
    department_id INT NOT NULL,  -- AUTO-ASSIGNED based on category
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

-- Users Table (for authentication)
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
```

## Seed Data

After creating tables, you can seed them with sample data:

```bash
# In the backend directory
node seed.js
```

This creates:
- 6 departments (Roads, Water, Electricity, Sanitation, Drainage, Street Lights)
- 12 complaint categories mapped to departments
- 5 sample officers

## Auto-Allocation Flow

1. Citizen selects a **Category** (e.g., "Pothole Repair")
2. System looks up `department_id` from `complaint_categories` table
3. Complaint is created with that `department_id` in `complaints` table
4. The complaint is now auto-assigned to the correct department!

Example mapping:
- Pothole Repair → Roads & Infrastructure
- Water Leakage → Water Supply Department
- Power Outage → Electricity Department
- Garbage Collection → Sanitation Department
