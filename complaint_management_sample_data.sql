-- ============================================================
-- SMART CITIZEN COMPLAINT MANAGEMENT SYSTEM
-- Sample Data Insertion (DML)
-- ============================================================

USE citizen_complaint_db;

-- ============================================================
-- INSERT DEPARTMENTS
-- ============================================================
INSERT INTO departments (department_name, department_head, contact_number, email) VALUES
('Roads & Infrastructure', 'Rajesh Kumar', '044-2345-1001', 'roads@municipal.gov'),
('Water Supply', 'Priya Sharma', '044-2345-1002', 'water@municipal.gov'),
('Electricity', 'Suresh Babu', '044-2345-1003', 'electricity@municipal.gov'),
('Sanitation & Waste Management', 'Anitha Rani', '044-2345-1004', 'sanitation@municipal.gov'),
('Drainage', 'Murugan P', '044-2345-1005', 'drainage@municipal.gov'),
('Street Lights', 'Venkatesh Iyer', '044-2345-1006', 'streetlights@municipal.gov');

-- ============================================================
-- INSERT OFFICERS
-- ============================================================
INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email, date_of_joining) VALUES
('Arun Kumar', 'RD-001', 1, 'Junior Engineer', '9444-123-001', 'arun.roads@municipal.gov', '2022-01-15'),
('Ravi Shankar', 'RD-002', 1, 'Senior Inspector', '9444-123-002', 'ravi.roads@municipal.gov', '2021-06-01'),
('Lakshmi Devi', 'WS-001', 2, 'Junior Engineer', '9444-123-003', 'lakshmi.water@municipal.gov', '2022-03-10'),
('Karthik Raja', 'WS-002', 2, 'Supervisor', '9444-123-004', 'karthik.water@municipal.gov', '2020-11-20'),
('Muthu Kumar', 'EL-001', 3, 'Junior Engineer', '9444-123-005', 'muthu.electric@municipal.gov', '2022-02-28'),
('Saravanan S', 'EL-002', 3, 'Senior Electrician', '9444-123-006', 'saravanan.electric@municipal.gov', '2019-08-15'),
('Janaki R', 'SW-001', 4, 'Sanitation Inspector', '9444-123-007', 'janaki.sanitation@municipal.gov', '2021-04-10'),
('Dhanapal G', 'SW-002', 4, 'Supervisor', '9444-123-008', 'dhanapal.sanitation@municipal.gov', '2020-01-05'),
('Boopathi Raja', 'DR-001', 5, 'Junior Engineer', '9444-123-009', 'boopathi.drainage@municipal.gov', '2022-07-20'),
('Selvam K', 'SL-001', 6, 'Street Light Technician', '9444-123-010', 'selvam.streetlight@municipal.gov', '2021-09-12');

-- ============================================================
-- INSERT COMPLAINT CATEGORIES
-- ============================================================
INSERT INTO complaint_categories (category_name, description, sla_hours, department_id) VALUES
('Pothole Repair', 'Road surface damage requiring repair', 48, 1),
('Road Damage', 'Major road damage or collapse', 72, 1),
('Water Leakage', 'Underground or surface water pipeline leakage', 24, 2),
('No Water Supply', 'Complete or partial water supply disruption', 12, 2),
('Power Outage', 'Area-wide or street-level power failure', 6, 3),
('Electrical Hazard', 'Dangerous electrical situations like exposed wires', 2, 3),
('Garbage Accumulation', 'Uncollected garbage or overflow', 24, 4),
('Street Cleaning', 'General street cleaning requirements', 48, 4),
('Drainage Blockage', 'Clogged or overflowing drains', 24, 5),
('Waterlogging', 'Flooding due to poor drainage', 6, 5),
('Street Light Out', 'Non-functioning street lights', 48, 6),
('Hazardous Light', 'Dangerous electrical situation at street light', 4, 6);

-- ============================================================
-- INSERT CITIZENS
-- ============================================================
INSERT INTO citizens (citizen_name, aadhaar_number, email, phone_number, address, ward_number, pincode) VALUES
('Mahendran S', '1234-5678-9012', 'mahendran@email.com', '9876-543-2101', '12, Gandhi Nagar, 1st Street', 'Ward-01', '600001'),
('Radha Krishnan', '1234-5678-9013', 'radha@email.com', '9876-543-2102', '25, Nehru Colony, 2nd Main Road', 'Ward-02', '600002'),
('Vijaya Lakshmi', '1234-5678-9014', 'vijaya@email.com', '9876-543-2103', '8, Kamaraj Avenue, Block A', 'Ward-03', '600003'),
('Gopalakrishnan M', '1234-5678-9015', 'gopal@email.com', '9876-543-2104', '45, Indira Nagar, 3rd Cross', 'Ward-04', '600004'),
('Meena Kumari', '1234-5678-9016', 'meena@email.com', '9876-543-2105', '67, Annanagar, Sector 12', 'Ward-05', '600005'),
('Prabhakaran T', '1234-5678-9017', 'prabha@email.com', '9876-543-2106', '89, Vadivelu Street', 'Ward-06', '600006'),
('Sundari R', '1234-5678-9018', 'sundari@email.com', '9876-543-2107', '34, MGR Road, T Nagar', 'Ward-07', '600007'),
('Ramasamy P', '1234-5678-9019', 'ramasamy@email.com', '9876-543-2108', '56, EVR Road, Kilpauk', 'Ward-08', '600008'),
('Jayanthi K', '1234-5678-9020', 'jayanthi@email.com', '9876-543-2109', '78, Mount Road, Saidapet', 'Ward-09', '600009'),
('Natarajan S', '1234-5678-9021', 'natarajan@email.com', '9876-543-2110', '90, LGP Street, Adyar', 'Ward-10', '600010');

-- ============================================================
-- INSERT COMPLAINTS
-- ============================================================
INSERT INTO complaints (complaint_number, citizen_id, category_id, department_id, assigned_officer_id, complaint_title, complaint_description, location, latitude, longitude, priority, status) VALUES
('2024-POT-000001', 1, 1, 1, 1, 'Large pothole on main road', 'There is a large pothole approximately 3 feet diameter on the main road near Gandhi Nagar junction. It is causing traffic disruption and two-wheelers are finding it difficult to pass.', 'Main Road, Gandhi Nagar Junction', 13.0827, 80.2707, 'High', 'In Progress'),
('2024-WAT-000001', 2, 3, 2, 3, 'Water leakage from main pipe', 'Continuous water leakage from the main pipeline near Nehru Colony. Water is being wasted and causing road damage.', 'Nehru Colony, 2nd Main Road', 13.0865, 80.2750, 'High', 'In Progress'),
('2024-ELC-000001', 3, 6, 3, 5, 'Exposed electrical wires', 'Dangerous exposed electrical wires near Kamaraj Avenue post. Children are playing nearby and it is a serious safety hazard.', 'Kamaraj Avenue, Block A', 13.0890, 80.2780, 'Critical', 'Pending'),
('2024-SAN-000001', 4, 7, 4, 7, 'Garbage not collected for days', 'Garbage has accumulated near Indira Nagar bus stop. It has been 5 days since last collection and the smell is unbearable.', 'Indira Nagar Bus Stop', 13.0912, 80.2810, 'Medium', 'Resolved'),
('2024-DRN-000001', 5, 9, 5, 9, 'Drainage blockage causing overflow', 'The drainage near Annanagar Sector 12 is completely blocked. Water is overflowing onto the road.', 'Annanagar, Sector 12', 13.0833, 80.2725, 'High', 'In Progress'),
('2024-STR-000001', 6, 11, 6, 10, 'Multiple street lights not working', 'All street lights on Vadivelu Street have been out for the past week. This creates safety concerns at night.', 'Vadivelu Street', 13.0850, 80.2760, 'Medium', 'Pending'),
('2024-POT-000002', 7, 1, 1, 2, 'Multiple potholes on MGR Road', 'There are multiple potholes on MGR Road in T Nagar area. It is damaging vehicles.', 'MGR Road, T Nagar', 13.0410, 80.2330, 'Medium', 'Resolved'),
('2024-WAT-000002', 8, 4, 2, 4, 'No water supply since morning', 'There has been no water supply in our area since 6 AM today. Please check and restore supply.', 'LGP Street, Kilpauk', 13.0838, 80.2540, 'High', 'Resolved'),
('2024-ELC-000002', 9, 5, 3, 6, 'Frequent power fluctuations', 'We are experiencing frequent power fluctuations in Adyar area. This is damaging our appliances.', 'LGP Street, Adyar', 13.0031, 80.2576, 'Medium', 'In Progress'),
('2024-DRN-000002', 10, 10, 5, 9, 'Severe waterlogging after rain', 'After last night rain, water has accumulated badly on Mount Road. Pedestrians cannot cross.', 'Mount Road, Saidapet', 13.0218, 80.2325, 'Critical', 'Pending');

-- ============================================================
-- INSERT COMPLAINT STATUS HISTORY
-- ============================================================
INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_by, change_reason) VALUES
(1, 'Pending', 'In Progress', 1, 'Assigned to field engineer for inspection'),
(2, 'Pending', 'In Progress', 3, 'Leakage identified. Repair team dispatched'),
(3, 'Pending', 'Pending', 5, 'Complaint received. Priority escalated to Critical'),
(4, 'Pending', 'In Progress', 7, 'Sanitation team assigned'),
(4, 'In Progress', 'Resolved', 7, 'Garbage cleared and area cleaned'),
(5, 'Pending', 'In Progress', 9, 'Drainage cleaning team dispatched'),
(6, 'Pending', 'Pending', 10, 'Materials ordered for repair'),
(7, 'Pending', 'In Progress', 2, 'Road repair scheduled'),
(7, 'In Progress', 'Resolved', 2, 'Road surface repaired and leveled'),
(8, 'Pending', 'In Progress', 4, 'Pump house checked, issue identified'),
(8, 'In Progress', 'Resolved', 4, 'Water supply restored'),
(9, 'Pending', 'In Progress', 6, 'Transformer checked, voltage fluctuation issue'),
(10, 'Pending', 'Pending', 9, 'Heavy rain caused temporary waterlogging');

-- ============================================================
-- INSERT USERS (Sample)
-- ============================================================
INSERT INTO users (username, password_hash, user_type, reference_id) VALUES
('admin001', '$2y$10$abcdefghijklmnopqrstuv', 'Admin', NULL),
('citizen_001', '$2y$10$uvwxyzabcdefghijklmnop', 'Citizen', 1),
('citizen_002', '$2y$10$abcdefghijklmnopqrstu2', 'Citizen', 2),
('officer_rd_001', '$2y$10$123456789abcdefghijklm', 'Officer', 1),
('officer_ws_001', '$2y$10$abcdefghijklmnopqrst3', 'Officer', 3),
('officer_el_001', '$2y$10$opqrstuvwxyzabcdefghij', 'Officer', 5),
('head_roads', '$2y$10$abcdefghijklmnopqrstuv', 'Officer', 1),
('reports_admin', '$2y$10$ijklmnopqrstuvwxyzabcd', 'Officer', 1),
('audit_admin', '$2y$10$efghijklmnopqrstuvwxyz', 'Admin', NULL);

-- ============================================================
-- INSERT AUDIT LOGS (Sample)
-- ============================================================
INSERT INTO audit_logs (user_id, action_type, table_name, record_id, old_values, new_values, ip_address) VALUES
(4, 'UPDATE', 'complaints', 1, '{"status": "Pending"}', '{"status": "In Progress"}', '192.168.1.100'),
(5, 'UPDATE', 'complaints', 2, '{"status": "Pending"}', '{"status": "In Progress"}', '192.168.1.101'),
(4, 'UPDATE', 'complaints', 7, '{"status": "In Progress"}', '{"status": "Resolved"}', '192.168.1.100'),
(6, 'UPDATE', 'complaints', 8, '{"status": "In Progress"}', '{"status": "Resolved"}', '192.168.1.102'),
(4, 'INSERT', 'complaint_status_history', 1, NULL, '{"complaint_id": 1, "new_status": "In Progress"}', '192.168.1.100'),
(5, 'INSERT', 'complaint_status_history', 2, NULL, '{"complaint_id": 2, "new_status": "In Progress"}', '192.168.1.101'),
(1, 'CREATE', 'users', 9, NULL, '{"username": "audit_admin"}', '192.168.1.50'),
(1, 'ALTER', 'roles', 1, NULL, '{"role": "db_admin"}', '192.168.1.50');

-- ============================================================
-- SAMPLE SELECT QUERIES FOR TESTING
-- ============================================================

-- Query 1: Get all pending complaints
-- SELECT * FROM complaints WHERE status = 'Pending';

-- Query 2: Get complaints by department
-- SELECT c.*, d.department_name FROM complaints c 
-- JOIN departments d ON c.department_id = d.department_id 
-- WHERE d.department_name = 'Roads & Infrastructure';

-- Query 3: Get complaint with all details
-- SELECT c.*, ct.category_name, d.department_name, o.officer_name, ci.citizen_name 
-- FROM complaints c
-- JOIN complaint_categories ct ON c.category_id = ct.category_id
-- JOIN departments d ON c.department_id = d.department_id
-- LEFT JOIN officers o ON c.assigned_officer_id = o.officer_id
-- JOIN citizens ci ON c.citizen_id = ci.citizen_id;

-- Query 4: Count complaints by status
-- SELECT status, COUNT(*) as count FROM complaints GROUP BY status;

-- Query 5: Get complaints overdue SLA
-- SELECT c.*, ct.sla_hours, TIMESTAMPDIFF(HOUR, c.created_at, NOW()) as hours_elapsed
-- FROM complaints c
-- JOIN complaint_categories ct ON c.category_id = ct.category_id
-- WHERE TIMESTAMPDIFF(HOUR, c.created_at, NOW()) > ct.sla_hours
-- AND c.status NOT IN ('Resolved', 'Closed');
