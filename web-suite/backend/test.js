/**
 * Quick Test Script for API Endpoints
 * Run: node test.js
 */

const axios = require('axios');

const API_URL = '/api';

const testAPI = async () => {
    console.log('🧪 Testing Smart Citizen Complaint Management System API\n');
    
    let token = null;
    let complaintNumber = null;

    // Test 1: Health Check
    try {
        console.log('1️⃣ Testing Health Check...');
        const res = await axios.get(`${API_URL}/health`);
        console.log('   ✅ Server is running:', res.data.message);
    } catch (error) {
        console.error('   ❌ Server not reachable. Is it running on port 5000?');
        return;
    }

    // Test 2: Get Departments (Public)
    try {
        console.log('\n2️⃣ Testing Get Departments...');
        const res = await axios.get(`${API_URL}/departments`);
        console.log('   ✅ Departments loaded:', res.data.data?.departments?.length || 0, 'departments');
    } catch (error) {
        console.error('   ❌ Failed to load departments:', error.message);
    }

    // Test 3: Get Categories (Public)
    try {
        console.log('\n3️⃣ Testing Get Categories...');
        const res = await axios.get(`${API_URL}/categories`);
        const categories = res.data.data?.categories || [];
        console.log('   ✅ Categories loaded:', categories.length, 'categories');
        
        // Check auto-allocation mapping
        const mapped = categories.filter(c => c.department_id && c.department_name).length;
        console.log('   ✅ Categories with department mapping:', mapped);
        
        if (mapped === 0) {
            console.log('   ⚠️  No department mappings found. Run: node seed.js');
        }
    } catch (error) {
        console.error('   ❌ Failed to load categories:', error.message);
    }

    // Test 4: Register Citizen
    try {
        console.log('\n4️⃣ Testing Citizen Registration...');
        const testUser = {
            citizenName: 'Test User',
            aadhaarNumber: String(Math.floor(Math.random() * 900000000000) + 100000000000),
            phoneNumber: String(Math.floor(Math.random() * 9000000000) + 6000000000),
            email: `test${Date.now()}@example.com`,
            password: 'password123',
            address: '123 Test Street',
            wardNumber: 'Ward 01',
            pincode: '600001'
        };
        
        const res = await axios.post(`${API_URL}/auth/register`, testUser);
        token = res.data.data?.token;
        console.log('   ✅ Registration successful');
        console.log('   📝 Username:', res.data.data?.user?.username);
        console.log('   🔑 Token received:', token ? 'Yes' : 'No');
    } catch (error) {
        console.error('   ❌ Registration failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Login
    if (!token) {
        try {
            console.log('\n5️⃣ Testing Login...');
            // Try to login with a known user (requires seed data)
            const res = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'admin123'
            });
            token = res.data.data?.token;
            console.log('   ✅ Login successful');
        } catch (error) {
            console.error('   ❌ Login failed:', error.response?.data?.message || error.message);
            console.log('   ℹ️  This is expected if no test users exist');
        }
    } else {
        console.log('\n5️⃣ Skipping Login (already have token from registration)');
    }

    // Test 6: Create Complaint with Auto-Allocation
    if (token) {
        try {
            console.log('\n6️⃣ Testing Create Complaint (Auto-Allocation)...');
            
            // First get a category
            const catRes = await axios.get(`${API_URL}/categories`);
            const category = catRes.data.data?.categories?.[0];
            
            if (!category) {
                console.log('   ⚠️  No categories available. Run: node seed.js');
            } else {
                const complaint = {
                    categoryId: category.category_id,
                    complaintTitle: 'Test Pothole Complaint',
                    complaintDescription: 'There is a large pothole on the main road causing accidents.',
                    location: 'Main Road, Near City Center',
                    priority: 'High'
                };
                
                const res = await axios.post(`${API_URL}/complaints`, complaint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                complaintNumber = res.data.data?.complaint?.complaint_number;
                console.log('   ✅ Complaint created successfully!');
                console.log('   📝 Complaint Number:', complaintNumber);
                console.log('   🏢 Auto-Assigned to:', res.data.data?.complaint?.department_name);
                console.log('   📊 Auto-Allocation Details:', res.data.data?.autoAllocation);
            }
        } catch (error) {
            console.error('   ❌ Failed to create complaint:', error.response?.data?.message || error.message);
        }
    } else {
        console.log('\n6️⃣ Skipping Create Complaint (no token)');
    }

    // Test 7: Track Complaint (Public)
    if (complaintNumber) {
        try {
            console.log('\n7️⃣ Testing Track Complaint (Public)...');
            const res = await axios.get(`${API_URL}/complaints/track/${complaintNumber}`);
            console.log('   ✅ Complaint tracked successfully');
            console.log('   📋 Status:', res.data.data?.complaint?.status);
            console.log('   🏢 Department:', res.data.data?.complaint?.department_name);
        } catch (error) {
            console.error('   ❌ Failed to track complaint:', error.response?.data?.message || error.message);
        }
    } else {
        console.log('\n7️⃣ Skipping Track Complaint (no complaint number)');
    }

    // Test 8: Get Stats
    if (token) {
        try {
            console.log('\n8️⃣ Testing Get Stats...');
            const res = await axios.get(`${API_URL}/complaints/stats/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('   ✅ Stats retrieved successfully');
            console.log('   📊 Total:', res.data.data?.summary?.total || 0);
            console.log('   📊 Pending:', res.data.data?.summary?.pending || 0);
            console.log('   📊 Resolved:', res.data.data?.summary?.resolved || 0);
        } catch (error) {
            console.error('   ❌ Failed to get stats:', error.response?.data?.message || error.message);
        }
    } else {
        console.log('\n8️⃣ Skipping Get Stats (no token)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Testing Complete!');
    console.log('='.repeat(60));
    
    if (!token) {
        console.log('\n⚠️  To fully test the system:');
        console.log('   1. Ensure MySQL is running');
        console.log('   2. Run: node seed.js (to create sample data)');
        console.log('   3. Register a new citizen account');
        console.log('   4. Run this test again');
    }
};

testAPI().catch(console.error);
