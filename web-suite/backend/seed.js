/**
 * Database Seed Script
 * Creates Super Admin, Department Admins, departments, categories, officers, and citizens
 */

const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seed...');

        // 1. Insert SuperAdmins for different states
        const superAdmins = [
            { name: 'Tamil Nadu SuperAdmin', username: 'tn_superadmin', state: 'Tamil Nadu', email: 'tn.superadmin@gov.in', contact: '9876543200' },
            { name: 'Karnataka SuperAdmin', username: 'ka_superadmin', state: 'Karnataka', email: 'ka.superadmin@gov.in', contact: '9876543201' },
            { name: 'Maharashtra SuperAdmin', username: 'mh_superadmin', state: 'Maharashtra', email: 'mh.superadmin@gov.in', contact: '9876543202' }
        ];

        console.log('👑 Inserting SuperAdmins...');
        for (const sa of superAdmins) {
            const password = 'SuperAdmin@123';
            const passwordHash = await bcrypt.hash(password, 10);

            const saResult = await db.query(
                `INSERT INTO super_admins (admin_name, username, password_hash, state, email, contact_number)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                [sa.name, sa.username, passwordHash, sa.state, sa.email, sa.contact]
            );
            const saId = saResult.insertId;

            await db.query(
                `INSERT INTO users (username, password_hash, user_type, reference_id, is_active)
                 VALUES (?, ?, 'SuperAdmin', ?, 1)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                [sa.username, passwordHash, saId]
            );
            console.log(`   ✅ SuperAdmin: ${sa.state} - username=${sa.username}, password=${password}`);
        }

        // 2. Insert Departments
        const departments = [
            { name: 'Roads & Infrastructure', head: 'Rajesh Kumar', contact: '9876543210', email: 'roads@municipal.gov' },
            { name: 'Water Supply Department', head: 'Priya Sharma', contact: '9876543211', email: 'water@municipal.gov' },
            { name: 'Electricity Department', head: 'Arun Nair', contact: '9876543212', email: 'electricity@municipal.gov' },
            { name: 'Sanitation Department', head: 'Lakshmi Devi', contact: '9876543213', email: 'sanitation@municipal.gov' },
            { name: 'Drainage Department', head: 'Suresh Menon', contact: '9876543214', email: 'drainage@municipal.gov' },
            { name: 'Street Lights Department', head: 'Karthik Rao', contact: '9876543215', email: 'streetlights@municipal.gov' },
            { name: 'Health Department', head: 'Dr. Anjali Mehta', contact: '9876543216', email: 'health@municipal.gov' },
            { name: 'Police Department', head: 'Inspector Sharma', contact: '9876543217', email: 'police@municipal.gov' },
            { name: 'Education Department', head: 'District Officer', contact: '9876543218', email: 'education@municipal.gov' },
            { name: 'Fire Department', head: 'Fire Chief', contact: '9876543219', email: 'fire@municipal.gov' },
            { name: 'Town Planning Department', head: 'Town Planner', contact: '9876543220', email: 'planning@municipal.gov' }
        ];

        console.log('📋 Inserting departments...');
        for (const dept of departments) {
            await db.query(
                `INSERT INTO departments (department_name, department_head, contact_number, email)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 department_head = VALUES(department_head),
                 contact_number = VALUES(contact_number),
                 email = VALUES(email)`,
                [dept.name, dept.head, dept.contact, dept.email]
            );
        }

        // Get department IDs
        const deptRows = await db.queryRows('SELECT department_id, department_name FROM departments');
        const deptMap = {};
        deptRows.forEach(row => { deptMap[row.department_name] = row.department_id; });

        // 2. Insert Categories
        const categories = [
            { name: 'Pothole Repair', description: 'Road surface damage and potholes', sla: 48, dept: 'Roads & Infrastructure' },
            { name: 'Road Damage', description: 'Cracks, uneven surfaces on roads', sla: 72, dept: 'Roads & Infrastructure' },
            { name: 'Street Light Issue', description: 'Non-working or damaged street lights', sla: 24, dept: 'Street Lights Department' },
            { name: 'Water Leakage', description: 'Water pipe leaks and bursts', sla: 12, dept: 'Water Supply Department' },
            { name: 'No Water Supply', description: 'Water supply interruptions', sla: 24, dept: 'Water Supply Department' },
            { name: 'Power Outage', description: 'Electricity supply issues', sla: 8, dept: 'Electricity Department' },
            { name: 'Exposed Wires', description: 'Dangerous electrical wiring', sla: 4, dept: 'Electricity Department' },
            { name: 'Garbage Collection', description: 'Missed garbage pickup', sla: 24, dept: 'Sanitation Department' },
            { name: 'Garbage Accumulation', description: 'Dumped waste and litter', sla: 48, dept: 'Sanitation Department' },
            { name: 'Drainage Blockage', description: 'Clogged drains and sewers', sla: 24, dept: 'Drainage Department' },
            { name: 'Drainage Overflow', description: 'Sewage overflow issues', sla: 12, dept: 'Drainage Department' },
            { name: 'Damaged Footpath', description: 'Broken or uneven sidewalks', sla: 72, dept: 'Roads & Infrastructure' },
            { name: 'Public Health Issue', description: 'Sanitation and health hazards', sla: 48, dept: 'Health Department' },
            { name: 'Noise Pollution', description: 'Loud noise disturbances', sla: 24, dept: 'Police Department' },
            { name: 'Traffic Signal Issue', description: 'Traffic light problems', sla: 24, dept: 'Police Department' },
            { name: 'Illegal Construction', description: 'Unauthorized building', sla: 72, dept: 'Town Planning Department' },
            { name: 'Fire Safety Issue', description: 'Fire hazards', sla: 12, dept: 'Fire Department' },
            { name: 'Park Maintenance', description: 'Public park issues', sla: 72, dept: 'Roads & Infrastructure' },
            { name: 'Public Toilet Issue', description: 'Public toilet problems', sla: 24, dept: 'Sanitation Department' }
        ];

        console.log('📋 Inserting complaint categories...');
        for (const cat of categories) {
            const deptId = deptMap[cat.dept];
            if (deptId) {
                await db.query(
                    `INSERT INTO complaint_categories (category_name, description, sla_hours, department_id)
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     description = VALUES(description),
                     sla_hours = VALUES(sla_hours),
                     department_id = VALUES(department_id)`,
                    [cat.name, cat.description, cat.sla, deptId]
                );
            }
        }

        // 3. Insert Department Admins with state and city
        const deptAdmins = [
            // Chennai, Tamil Nadu
            { name: 'Rajesh Kumar', username: 'roads_admin', dept: 'Roads & Infrastructure', state: 'Tamil Nadu', city: 'Chennai', email: 'roads.admin@tn.gov.in', contact: '9876543301' },
            { name: 'Priya Sharma', username: 'water_admin', dept: 'Water Supply Department', state: 'Tamil Nadu', city: 'Chennai', email: 'water.admin@tn.gov.in', contact: '9876543302' },
            { name: 'Arun Nair', username: 'electrical_admin', dept: 'Electrical Department', state: 'Tamil Nadu', city: 'Chennai', email: 'electrical.admin@tn.gov.in', contact: '9876543303' },
            { name: 'Lakshmi Devi', username: 'sanitation_admin', dept: 'Sanitation Department', state: 'Tamil Nadu', city: 'Chennai', email: 'sanitation.admin@tn.gov.in', contact: '9876543304' },
            { name: 'Suresh Menon', username: 'drainage_admin', dept: 'Drainage Department', state: 'Tamil Nadu', city: 'Chennai', email: 'drainage.admin@tn.gov.in', contact: '9876543305' },
            { name: 'Karthik Rao', username: 'streetlights_admin', dept: 'Street Lights Department', state: 'Tamil Nadu', city: 'Chennai', email: 'streetlights.admin@tn.gov.in', contact: '9876543306' },
            { name: 'Dr. Anjali Mehta', username: 'health_admin', dept: 'Health Department', state: 'Tamil Nadu', city: 'Chennai', email: 'health.admin@tn.gov.in', contact: '9876543307' },
            { name: 'Inspector Sharma', username: 'police_admin', dept: 'Police Department', state: 'Tamil Nadu', city: 'Chennai', email: 'police.admin@tn.gov.in', contact: '9876543308' },
            { name: 'District Officer', username: 'education_admin', dept: 'Education Department', state: 'Tamil Nadu', city: 'Chennai', email: 'education.admin@tn.gov.in', contact: '9876543309' },
            { name: 'Fire Chief', username: 'fire_admin', dept: 'Fire Department', state: 'Tamil Nadu', city: 'Chennai', email: 'fire.admin@tn.gov.in', contact: '9876543310' },
            { name: 'Town Planner', username: 'planning_admin', dept: 'Town Planning Department', state: 'Tamil Nadu', city: 'Chennai', email: 'planning.admin@tn.gov.in', contact: '9876543311' },
            // Coimbatore, Tamil Nadu
            { name: 'Muthuvel', username: 'roads_admin_cbe', dept: 'Roads & Infrastructure', state: 'Tamil Nadu', city: 'Coimbatore', email: 'roads.admin@cbe.tn.gov.in', contact: '9876543316' },
            { name: 'Kavitha', username: 'water_admin_cbe', dept: 'Water Supply Department', state: 'Tamil Nadu', city: 'Coimbatore', email: 'water.admin@cbe.tn.gov.in', contact: '9876543317' },
            { name: 'Senthil', username: 'electrical_admin_cbe', dept: 'Electrical Department', state: 'Tamil Nadu', city: 'Coimbatore', email: 'electrical.admin@cbe.tn.gov.in', contact: '9876543318' },
            { name: 'Latha', username: 'sanitation_admin_cbe', dept: 'Sanitation Department', state: 'Tamil Nadu', city: 'Coimbatore', email: 'sanitation.admin@cbe.tn.gov.in', contact: '9876543319' },
            { name: 'Ramesh', username: 'police_admin_cbe', dept: 'Police Department', state: 'Tamil Nadu', city: 'Coimbatore', email: 'police.admin@cbe.tn.gov.in', contact: '9876543320' },
            // Madurai, Tamil Nadu
            { name: 'Kumaravel', username: 'roads_admin_mdu', dept: 'Roads & Infrastructure', state: 'Tamil Nadu', city: 'Madurai', email: 'roads.admin@mdu.tn.gov.in', contact: '9876543321' },
            { name: 'Meenakshi', username: 'water_admin_mdu', dept: 'Water Supply Department', state: 'Tamil Nadu', city: 'Madurai', email: 'water.admin@mdu.tn.gov.in', contact: '9876543322' },
            { name: 'Sundar', username: 'electrical_admin_mdu', dept: 'Electrical Department', state: 'Tamil Nadu', city: 'Madurai', email: 'electrical.admin@mdu.tn.gov.in', contact: '9876543323' },
            { name: 'Revathi', username: 'sanitation_admin_mdu', dept: 'Sanitation Department', state: 'Tamil Nadu', city: 'Madurai', email: 'sanitation.admin@mdu.tn.gov.in', contact: '9876543324' },
            { name: 'Karthik', username: 'police_admin_mdu', dept: 'Police Department', state: 'Tamil Nadu', city: 'Madurai', email: 'police.admin@mdu.tn.gov.in', contact: '9876543325' },
            // Bangalore, Karnataka
            { name: 'Ravi Kumar', username: 'roads_admin_ka', dept: 'Roads & Infrastructure', state: 'Karnataka', city: 'Bangalore', email: 'roads.admin@ka.gov.in', contact: '9876543312' },
            { name: 'Meena Sharma', username: 'water_admin_ka', dept: 'Water Supply Department', state: 'Karnataka', city: 'Bangalore', email: 'water.admin@ka.gov.in', contact: '9876543313' },
            // Mumbai, Maharashtra
            { name: 'Vikram Singh', username: 'roads_admin_mh', dept: 'Roads & Infrastructure', state: 'Maharashtra', city: 'Mumbai', email: 'roads.admin@mh.gov.in', contact: '9876543314' },
            { name: 'Sunita Patel', username: 'water_admin_mh', dept: 'Water Supply Department', state: 'Maharashtra', city: 'Mumbai', email: 'water.admin@mh.gov.in', contact: '9876543315' }
        ];

        console.log('👨 Inserting Department Admins...');
        for (const admin of deptAdmins) {
            const deptId = deptMap[admin.dept];
            const password = 'DeptAdmin@123';
            const passwordHash = await bcrypt.hash(password, 10);

            const result = await db.query(
                `INSERT INTO department_admins (admin_name, username, password_hash, department_id, email, contact_number, state, city, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE
                 admin_name = VALUES(admin_name),
                 password_hash = VALUES(password_hash),
                 department_id = VALUES(department_id),
                 email = VALUES(email),
                 contact_number = VALUES(contact_number),
                 state = VALUES(state),
                 city = VALUES(city)`,
                [admin.name, admin.username, passwordHash, deptId, admin.email, admin.contact, admin.state, admin.city]
            );
            
            const deptAdminId = result.insertId || await db.queryRow('SELECT dept_admin_id FROM department_admins WHERE username = ?', [admin.username]).then(r => r.dept_admin_id);
            
            // Create user account for department admin
            await db.query(
                `INSERT INTO users (username, password_hash, user_type, reference_id)
                 VALUES (?, ?, 'DeptAdmin', ?)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                [admin.username, passwordHash, deptAdminId]
            );
            
            console.log(`   ✅ Dept Admin: ${admin.city} - username=${admin.username}, password=${password}`);
        }

        // 4. Insert Officers with state and city
        const officers = [
            // Chennai, Tamil Nadu
            { name: 'Arun Kumar', badge: 'OFF001', dept: 'Roads & Infrastructure', designation: 'Junior Engineer', contact: '9876500001', email: 'arun@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Lakshmi Devi', badge: 'OFF002', dept: 'Water Supply Department', designation: 'Junior Engineer', contact: '9876500002', email: 'lakshmi@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Muthu Kumar', badge: 'OFF003', dept: 'Electrical Department', designation: 'Junior Engineer', contact: '9876500003', email: 'muthu@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Suresh Kumar', badge: 'OFF032', dept: 'Electrical Department', designation: 'Junior Engineer', contact: '9876500032', email: 'suresh.elec@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Janaki R', badge: 'OFF004', dept: 'Sanitation Department', designation: 'Sanitation Inspector', contact: '9876500004', email: 'janaki@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Venkatesh P', badge: 'OFF005', dept: 'Drainage Department', designation: 'Supervisor', contact: '9876500005', email: 'venkatesh@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Karthik Rao', badge: 'OFF006', dept: 'Street Lights Department', designation: 'Lineman', contact: '9876500006', email: 'karthik@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Dr. Anjali Mehta', badge: 'OFF007', dept: 'Health Department', designation: 'Medical Officer', contact: '9876500007', email: 'anjali@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Inspector Sharma', badge: 'OFF008', dept: 'Police Department', designation: 'Inspector', contact: '9876500008', email: 'sharma@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Constable Patil', badge: 'OFF009', dept: 'Police Department', designation: 'Constable', contact: '9876500009', email: 'patil@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Teacher Mehta', badge: 'OFF010', dept: 'Education Department', designation: 'Education Officer', contact: '9876500010', email: 'mehta@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Clerk Joshi', badge: 'OFF011', dept: 'Education Department', designation: 'Clerk', contact: '9876500011', email: 'joshi@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Fire Officer Singh', badge: 'OFF020', dept: 'Fire Department', designation: 'Fire Officer', contact: '9876500020', email: 'singh@tn.gov.in', state: 'Tamil Nadu', city: 'Chennai' },
            // Coimbatore, Tamil Nadu
            { name: 'Balaji', badge: 'OFF022', dept: 'Roads & Infrastructure', designation: 'Junior Engineer', contact: '9876500022', email: 'balaji@cbe.tn.gov.in', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Divya', badge: 'OFF023', dept: 'Water Supply Department', designation: 'Junior Engineer', contact: '9876500023', email: 'divya@cbe.tn.gov.in', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Prakash', badge: 'OFF024', dept: 'Electricity Department', designation: 'Junior Engineer', contact: '9876500024', email: 'prakash@cbe.tn.gov.in', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Kamala', badge: 'OFF025', dept: 'Sanitation Department', designation: 'Sanitation Inspector', contact: '9876500025', email: 'kamala@cbe.tn.gov.in', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Rajesh', badge: 'OFF026', dept: 'Police Department', designation: 'Inspector', contact: '9876500026', email: 'rajesh@cbe.tn.gov.in', state: 'Tamil Nadu', city: 'Coimbatore' },
            // Madurai, Tamil Nadu
            { name: 'Saravanan', badge: 'OFF027', dept: 'Roads & Infrastructure', designation: 'Junior Engineer', contact: '9876500027', email: 'saravanan@mdu.tn.gov.in', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Vijayalakshmi', badge: 'OFF028', dept: 'Water Supply Department', designation: 'Junior Engineer', contact: '9876500028', email: 'vijaya@mdu.tn.gov.in', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Murugan', badge: 'OFF029', dept: 'Electricity Department', designation: 'Junior Engineer', contact: '9876500029', email: 'murugan@mdu.tn.gov.in', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Sivagami', badge: 'OFF030', dept: 'Sanitation Department', designation: 'Sanitation Inspector', contact: '9876500030', email: 'sivagami@mdu.tn.gov.in', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Velu', badge: 'OFF031', dept: 'Police Department', designation: 'Inspector', contact: '9876500031', email: 'velu@mdu.tn.gov.in', state: 'Tamil Nadu', city: 'Madurai' },
            // Bangalore, Karnataka
            { name: 'Engineer Singh', badge: 'OFF012', dept: 'Water Supply Department', designation: 'Junior Engineer', contact: '9876500012', email: 'singh@ka.gov.in', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Technician Kumar', badge: 'OFF013', dept: 'Water Supply Department', designation: 'Technician', contact: '9876500013', email: 'kumar@ka.gov.in', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Supervisor Kulkarni', badge: 'OFF016', dept: 'Sanitation Department', designation: 'Sanitation Supervisor', contact: '9876500016', email: 'kulkarni@ka.gov.in', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Architect Desai', badge: 'OFF018', dept: 'Town Planning Department', designation: 'Town Planner', contact: '9876500018', email: 'desai@ka.gov.in', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Firefighter Kumar', badge: 'OFF021', dept: 'Fire Department', designation: 'Firefighter', contact: '9876500021', email: 'kumar@ka.gov.in', state: 'Karnataka', city: 'Bangalore' },
            // Mumbai, Maharashtra
            { name: 'Lineman Yadav', badge: 'OFF014', dept: 'Electricity Department', designation: 'Lineman', contact: '9876500014', email: 'yadav@mh.gov.in', state: 'Maharashtra', city: 'Mumbai' },
            { name: 'Wireman Gupta', badge: 'OFF015', dept: 'Electricity Department', designation: 'Wireman', contact: '9876500015', email: 'gupta@mh.gov.in', state: 'Maharashtra', city: 'Mumbai' },
            { name: 'Worker Jadhav', badge: 'OFF017', dept: 'Sanitation Department', designation: 'Sanitation Worker', contact: '9876500017', email: 'jadhav@mh.gov.in', state: 'Maharashtra', city: 'Mumbai' },
            { name: 'Surveyor Patil', badge: 'OFF019', dept: 'Town Planning Department', designation: 'Surveyor', contact: '9876500019', email: 'patil@mh.gov.in', state: 'Maharashtra', city: 'Mumbai' }
        ];

        console.log('👮 Inserting Officers...');
        for (const officer of officers) {
            const deptId = deptMap[officer.dept];
            if (deptId) {
                await db.query(
                    `INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email, state, city, date_of_joining)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
                     ON DUPLICATE KEY UPDATE
                     officer_name = VALUES(officer_name),
                     department_id = VALUES(department_id),
                     designation = VALUES(designation),
                     contact_number = VALUES(contact_number),
                     email = VALUES(email),
                     state = VALUES(state),
                     city = VALUES(city)`,
                    [officer.name, officer.badge, deptId, officer.designation, officer.contact, officer.email, officer.state, officer.city]
                );
            }
        }

        // 5. Insert Sample Citizens with state and city
        const citizens = [
            // Chennai, Tamil Nadu
            { name: 'Rahul Sharma', aadhaar: '123456789012', email: 'rahul@email.com', phone: '9876543210', address: '123 MG Road', ward: 'Ward 01', pincode: '600001', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Priya Patel', aadhaar: '234567890123', email: 'priya@email.com', phone: '9876543211', address: '456 Park Street', ward: 'Ward 02', pincode: '600002', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Ravi Desai', aadhaar: '789012345678', email: 'ravi@email.com', phone: '9876543216', address: '987 Apartment', ward: 'Ward 07', pincode: '600003', state: 'Tamil Nadu', city: 'Chennai' },
            { name: 'Sanjay Mehta', aadhaar: '012345678901', email: 'sanjay@email.com', phone: '9876543219', address: '432 Society', ward: 'Ward 10', pincode: '600004', state: 'Tamil Nadu', city: 'Chennai' },
            // Coimbatore, Tamil Nadu
            { name: 'Karthik Rajan', aadhaar: '111222333444', email: 'karthik@cbe.email.com', phone: '9876543220', address: '100 Gandhipuram', ward: 'Ward 11', pincode: '641001', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Anitha Sundaram', aadhaar: '222333444555', email: 'anitha@cbe.email.com', phone: '9876543221', address: '200 RS Puram', ward: 'Ward 12', pincode: '641002', state: 'Tamil Nadu', city: 'Coimbatore' },
            { name: 'Mohan Kumar', aadhaar: '333444555666', email: 'mohan@cbe.email.com', phone: '9876543222', address: '300 Peelamedu', ward: 'Ward 13', pincode: '641003', state: 'Tamil Nadu', city: 'Coimbatore' },
            // Madurai, Tamil Nadu
            { name: 'Suresh Pandian', aadhaar: '444555666777', email: 'suresh@mdu.email.com', phone: '9876543223', address: '400 Anna Nagar', ward: 'Ward 14', pincode: '625001', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Lakshmi Narayanan', aadhaar: '555666777888', email: 'lakshmi@mdu.email.com', phone: '9876543224', address: '500 K K Nagar', ward: 'Ward 15', pincode: '625002', state: 'Tamil Nadu', city: 'Madurai' },
            { name: 'Ramesh Kannan', aadhaar: '666777888999', email: 'ramesh@mdu.email.com', phone: '9876543225', address: '600 Thirupparankundram', ward: 'Ward 16', pincode: '625003', state: 'Tamil Nadu', city: 'Madurai' },
            // Bangalore, Karnataka
            { name: 'Amit Singh', aadhaar: '345678901234', email: 'amit@email.com', phone: '9876543212', address: '789 Lake View', ward: 'Ward 03', pincode: '560001', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Sunita Verma', aadhaar: '456789012345', email: 'sunita@email.com', phone: '9876543213', address: '321 Garden Area', ward: 'Ward 04', pincode: '560002', state: 'Karnataka', city: 'Bangalore' },
            { name: 'Meena Shah', aadhaar: '890123456789', email: 'meena@email.com', phone: '9876543217', address: '543 Tower', ward: 'Ward 08', pincode: '560003', state: 'Karnataka', city: 'Bangalore' },
            // Mumbai, Maharashtra
            { name: 'Vikram Singh', aadhaar: '567890123456', email: 'vikram@email.com', phone: '9876543214', address: '654 Market Street', ward: 'Ward 05', pincode: '400001', state: 'Maharashtra', city: 'Mumbai' },
            { name: 'Neha Gupta', aadhaar: '678901234567', email: 'neha@email.com', phone: '9876543215', address: '876 Colony', ward: 'Ward 06', pincode: '400002', state: 'Maharashtra', city: 'Mumbai' },
            { name: 'Kavita Joshi', aadhaar: '901234567890', email: 'kavita@email.com', phone: '9876543218', address: '210 Complex', ward: 'Ward 09', pincode: '400003', state: 'Maharashtra', city: 'Mumbai' }
        ];

        console.log('👤 Inserting Citizens...');
        for (const citizen of citizens) {
            await db.query(
                `INSERT INTO citizens (citizen_name, aadhaar_number, email, phone_number, address, ward_number, pincode, state, city)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 citizen_name = VALUES(citizen_name),
                 email = VALUES(email),
                 phone_number = VALUES(phone_number),
                 state = VALUES(state),
                 city = VALUES(city)`,
                [citizen.name, citizen.aadhaar, citizen.email, citizen.phone, citizen.address, citizen.ward, citizen.pincode, citizen.state, citizen.city]
            );
        }

        // 6. Create User Accounts for Officers and Citizens (DeptAdmins already created above)

        console.log('\n🔐 Creating user accounts for Officers and Citizens...');

        // --- Officer Users ---
        for (const officer of officers) {
            const officerRow = await db.queryRow(
                'SELECT officer_id FROM officers WHERE badge_number = ?',
                [officer.badge]
            );
            if (officerRow) {
                const password = 'Officer@123';
                const passwordHash = await bcrypt.hash(password, 10);
                await db.query(
                    `INSERT INTO users (username, password_hash, user_type, reference_id, is_active)
                     VALUES (?, ?, 'Officer', ?, 1)
                     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                    [officer.badge.toLowerCase(), passwordHash, officerRow.officer_id]
                );
                console.log(`   ✅ Officer: ${officer.city} - username=${officer.badge.toLowerCase()}, password=${password}`);
            }
        }

        // --- Citizen Users (use email as username) ---
        for (const citizen of citizens) {
            const citizenRow = await db.queryRow(
                'SELECT citizen_id FROM citizens WHERE aadhaar_number = ?',
                [citizen.aadhaar]
            );
            if (citizenRow) {
                const password = 'Citizen@123';
                const passwordHash = await bcrypt.hash(password, 10);
                await db.query(
                    `INSERT INTO users (username, password_hash, user_type, reference_id, is_active)
                     VALUES (?, ?, 'Citizen', ?, 1)
                     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                    [citizen.email, passwordHash, citizenRow.citizen_id]
                );
                console.log(`   ✅ Citizen: ${citizen.city} - username=${citizen.email}, password=${password}`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   - ${superAdmins.length} SuperAdmins (Tamil Nadu, Karnataka, Maharashtra)`);
        console.log(`   - ${departments.length} departments`);
        console.log(`   - ${categories.length} complaint categories`);
        console.log(`   - ${deptAdmins.length} Department Admins (Chennai, Bangalore, Mumbai)`);
        console.log(`   - ${officers.length} officers`);
        console.log(`   - ${citizens.length} citizens`);
        console.log('\n🔐 Credentials:');
        console.log('   SuperAdmins: tn_superadmin, ka_superadmin, mh_superadmin / SuperAdmin@123');
        console.log('   Dept Admins: roads_admin, water_admin, etc. / DeptAdmin@123');
        console.log('   Officers: off001-off021 / Officer@123');
        console.log('   Citizens: rahul@email.com, priya@email.com, etc. / Citizen@123');
        console.log('\n✅ Database seed completed successfully!');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

// Run if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };