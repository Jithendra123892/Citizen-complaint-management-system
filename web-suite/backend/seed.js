/**
 * Database Seed Script
 * Run this to populate initial departments and categories
 */

const db = require('./config/database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seed...');

        // Insert Departments
        const departments = [
            { name: 'Roads & Infrastructure', head: 'Rajesh Kumar', contact: '9876543210', email: 'roads@municipal.gov' },
            { name: 'Water Supply Department', head: 'Priya Sharma', contact: '9876543211', email: 'water@municipal.gov' },
            { name: 'Electricity Department', head: 'Arun Nair', contact: '9876543212', email: 'electricity@municipal.gov' },
            { name: 'Sanitation Department', head: 'Lakshmi Devi', contact: '9876543213', email: 'sanitation@municipal.gov' },
            { name: 'Drainage Department', head: 'Suresh Menon', contact: '9876543214', email: 'drainage@municipal.gov' },
            { name: 'Street Lights Department', head: 'Karthik Rao', contact: '9876543215', email: 'streetlights@municipal.gov' }
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
        const deptMap = {};
        const deptRows = await db.queryRows('SELECT department_id, department_name FROM departments');
        deptRows.forEach(row => {
            deptMap[row.department_name] = row.department_id;
        });

        // Insert Categories with department mappings
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
            { name: 'Damaged Footpath', description: 'Broken or uneven sidewalks', sla: 72, dept: 'Roads & Infrastructure' }
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

        // Insert sample officers
        const officers = [
            { name: 'Arun Kumar', badge: 'OFF001', dept: 'Roads & Infrastructure', designation: 'Junior Engineer', contact: '9876500001', email: 'arun@municipal.gov' },
            { name: 'Lakshmi Devi', badge: 'OFF002', dept: 'Water Supply Department', designation: 'Junior Engineer', contact: '9876500002', email: 'lakshmi@municipal.gov' },
            { name: 'Muthu Kumar', badge: 'OFF003', dept: 'Electricity Department', designation: 'Junior Engineer', contact: '9876500003', email: 'muthu@municipal.gov' },
            { name: 'Janaki R', badge: 'OFF004', dept: 'Sanitation Department', designation: 'Sanitation Inspector', contact: '9876500004', email: 'janaki@municipal.gov' },
            { name: 'Venkatesh P', badge: 'OFF005', dept: 'Drainage Department', designation: 'Supervisor', contact: '9876500005', email: 'venkatesh@municipal.gov' }
        ];

        console.log('📋 Inserting officers...');
        for (const officer of officers) {
            const deptId = deptMap[officer.dept];
            if (deptId) {
                await db.query(
                    `INSERT INTO officers (officer_name, badge_number, department_id, designation, contact_number, email, date_of_joining) 
                     VALUES (?, ?, ?, ?, ?, ?, CURDATE())
                     ON DUPLICATE KEY UPDATE 
                     officer_name = VALUES(officer_name),
                     department_id = VALUES(department_id),
                     designation = VALUES(designation),
                     contact_number = VALUES(contact_number),
                     email = VALUES(email)`,
                    [officer.name, officer.badge, deptId, officer.designation, officer.contact, officer.email]
                );
            }
        }

        console.log('✅ Database seed completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - ${departments.length} departments created`);
        console.log(`   - ${categories.length} complaint categories created`);
        console.log(`   - ${officers.length} officers added`);
        
        // Create admin user account
        console.log('🔐 Creating admin user account...');
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        await db.query(
            `INSERT INTO users (username, password_hash, user_type, reference_id, is_active) 
             VALUES (?, ?, 'Admin', NULL, 1)
             ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            ['admin', adminPasswordHash]
        );
        console.log('   - Admin user: username=admin, password=admin123');
        
        // Create officer user accounts
        console.log('🔐 Creating officer user accounts...');
        const officerUsers = [
            { name: 'Arun Kumar', badge: 'OFF001' },
            { name: 'Lakshmi Devi', badge: 'OFF002' },
            { name: 'Muthu Kumar', badge: 'OFF003' },
            { name: 'Janaki R', badge: 'OFF004' },
            { name: 'Venkatesh P', badge: 'OFF005' }
        ];
        
        for (const officer of officerUsers) {
            const officerRow = await db.queryRow(
                'SELECT officer_id FROM officers WHERE badge_number = ?',
                [officer.badge]
            );
            if (officerRow) {
                const officerPasswordHash = await bcrypt.hash('officer123', 10);
                await db.query(
                    `INSERT INTO users (username, password_hash, user_type, reference_id, is_active) 
                     VALUES (?, ?, 'Officer', ?, 1)
                     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                    [officer.badge.toLowerCase(), officerPasswordHash, officerRow.officer_id]
                );
                console.log(`   - Officer user: username=${officer.badge.toLowerCase()}, password=officer123`);
            }
        }
        
        console.log('');
        console.log('🚀 You can now:');
        console.log('   1. Register as a citizen at /auth.html');
        console.log('   2. Login as admin: username=admin, password=admin123');
        console.log('   3. Login as officer: username=off001, password=officer123');
        console.log('   4. File complaints - they will be auto-assigned based on category');

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
