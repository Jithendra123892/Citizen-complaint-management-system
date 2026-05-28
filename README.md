# CitizenConnect - Smart Complaint Management System
<!-- Force-redeploy trigger: $(date -u) -->

## Project Overview

A comprehensive web-based complaint management system for municipal authorities to systematically store, track, and manage citizen complaints. Built with Node.js, Express, MySQL, and vanilla JavaScript, this system provides role-based access control, real-time status tracking, and complete audit trails.

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Relational database
- **JWT** - Authentication
- **Multer** - File uploads
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **bcrypt** - Password hashing

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with government theme
- **Vanilla JavaScript** - Client-side logic
- **Fetch API** - HTTP requests

## Features

### For Citizens
- Register complaints with attachments
- Track complaint status in real-time
- View complaint history
- Upload supporting documents (images, PDFs)
- Auto-department allocation based on category

### For Officers
- View assigned complaints
- Submit proof of resolution
- Update complaint status
- Upload proof attachments
- Track SLA compliance

### For Department Admins
- View all department complaints
- Assign complaints to officers
- Approve/reject officer proof
- View department statistics
- Monitor officer performance

### For Super Admins
- Manage departments and categories
- Manage officers and citizens
- View system-wide analytics
- Generate reports
- Audit trail access

## Project Structure

```
project_dbms/
├── web-suite/
│   ├── index.html                          # Landing page
│   ├── auth.html                           # Login/Registration
│   ├── dashboard.html                      # Citizen dashboard
│   ├── complaints.html                     # Citizen complaints list
│   ├── new-complaint.html                  # New complaint form
│   ├── officer-dashboard.html              # Officer dashboard
│   ├── officer-complaints.html             # Officer complaints
│   ├── admin-dashboard.html                # Admin dashboard
│   ├── admin-complaints.html               # Admin complaints
│   ├── dept-admin-dashboard.html           # Department Admin dashboard
│   ├── dept-admin-complaints.html          # Department Admin complaints
│   ├── dept-admin-complaint-details.html   # Complaint details & approval
│   ├── super-admin-dashboard.html          # Super Admin dashboard
│   ├── css/
│   │   ├── style.css                       # Main stylesheet
│   │   └── responsive.css                  # Responsive design
│   └── js/
│       ├── auth.js                         # Authentication logic
│       ├── complaints.js                   # Citizen complaint management
│       ├── officer-complaints.js           # Officer complaint management
│       ├── admin-complaints.js             # Admin complaint management
│       ├── dept-admin-complaints.js        # Department Admin complaint list
│       ├── dept-admin-complaint-details.js # Complaint details & approval
│       └── new-complaint.js                # New complaint form
├── backend/
│   ├── server.js                           # Main server entry point
│   ├── config/
│   │   └── database.js                     # Database configuration
│   ├── routes/
│   │   ├── auth.js                         # Authentication routes
│   │   ├── citizens.js                     # Citizen routes
│   │   ├── officers.js                     # Officer routes
│   │   ├── departments.js                  # Department routes
│   │   ├── categories.js                   # Category routes
│   │   ├── complaints.js                   # Complaint routes
│   │   ├── dept-admin.js                   # Department Admin routes
│   │   └── reports.js                      # Report routes
│   ├── middleware/
│   │   ├── auth.js                         # JWT authentication
│   │   ├── errorHandler.js                 # Error handling
│   │   └── security.js                     # Security middleware
│   ├── uploads/                            # File upload directory
│   ├── seed.js                             # Database seeding
│   ├── setup-db.js                         # Database setup
│   └── package.json                        # Dependencies
├── PROJECT_DOCUMENTATION_GUIDE.md          # Documentation guide
└── README.md                               # This file
```

## Installation Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Backend Setup

```bash
# 1. Navigate to backend directory
cd web-suite/backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Configure .env file
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=citizen_complaint_db
DB_PORT=3306
JWT_SECRET=your-secret-key-change-this
PORT=5000

# 5. Create database
mysql -u root -p -e "CREATE DATABASE citizen_complaint_db"

# 6. Initialize database schema
node setup-db.js

# 7. Seed sample data (optional)
node seed.js

# 8. Start backend server
npm start
```

### Frontend Setup

```bash
# 1. Navigate to web-suite directory
cd web-suite

# 2. Open index.html in browser
# Or use a local server:
python -m http.server 8080
# or
npx serve
```

### Default Credentials (After Seeding)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | SuperAdmin@123 |
| Department Admin | roads_admin | DeptAdmin@123 |
| Officer | badge123 | Officer@123 |
| Citizen | citizen@email.com | Citizen@123 |

**⚠️ SECURITY WARNING: Change these passwords immediately after first login!**

## Database Schema

### Main Tables

1. **users** - System user accounts
2. **citizens** - Citizen profiles
3. **officers** - Officer profiles
4. **department_admins** - Department Admin profiles
5. **departments** - Department information
6. **complaint_categories** - Complaint categories with SLA
7. **complaints** - Main complaint records
8. **complaint_attachments** - File attachments
9. **complaint_status_history** - Status change audit trail

### Key Relationships

- complaints → citizens (many-to-one)
- complaints → categories (many-to-one)
- complaints → departments (many-to-one)
- complaints → officers (many-to-one, optional)
- categories → departments (many-to-one)
- officers → departments (many-to-one)
- department_admins → departments (one-to-one)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### Complaints
- `GET /api/complaints` - List complaints (role-based)
- `GET /api/complaints/:id` - Get complaint details
- `POST /api/complaints` - Create new complaint
- `PUT /api/complaints/:id` - Update complaint
- `PUT /api/complaints/:id/assign` - Assign officer
- `PUT /api/complaints/:id/status` - Update status
- `PUT /api/complaints/:id/approve` - Approve/reject proof
- `POST /api/complaints/:id/proof` - Submit proof

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

### Officers
- `GET /api/officers` - List officers
- `GET /api/officers/:id` - Get officer details

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/departments` - Department reports

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Citizen** | Register complaints, view own complaints, upload attachments |
| **Officer** | View assigned complaints, submit proof, update status |
| **Department Admin** | View department complaints, assign officers, approve/reject proof |
| **Admin** | Full access to all complaints, manage departments, categories, officers |
| **Super Admin** | Full system access, manage all users, system settings |

## Workflow

```
1. Citizen registers complaint
   ↓
2. System auto-allocates department based on category
   ↓
3. Complaint status: Pending
   ↓
4. Department Admin assigns to officer
   ↓
5. Complaint status: In Progress
   ↓
6. Officer submits proof of resolution
   ↓
7. Complaint status: Pending Approval
   ↓
8. Department Admin reviews proof
   ↓
9a. If approved → Status: Resolved
9b. If rejected → Status: In Progress (resubmit)
   ↓
10. Complaint closed
```

## Security Features

### Implemented Security Measures

✅ **Authentication**
- JWT token-based authentication
- Password hashing with bcrypt (10 rounds)
- Token expiration (24 hours)
- Secure password storage

✅ **Authorization**
- Role-based access control (RBAC)
- Middleware for route protection
- User type validation
- SuperAdmin bypass for full access

✅ **Input Validation**
- Express-validator for request validation
- SQL injection prevention (prepared statements)
- File type validation
- File size limits (10MB)

✅ **Security Headers**
- Helmet middleware for security headers
- Content Security Policy (CSP)
- XSS protection
- Clickjacking protection

✅ **File Upload Security**
- File size limits
- MIME type detection
- Date-based folder structure
- Unique filename generation

✅ **Database Security**
- Connection pooling
- Prepared statements
- Foreign key constraints
- Audit trail for status changes

### Security Recommendations

The following security issues have been identified and addressed:

1. **Hardcoded Passwords in Seed Files** ✅ FIXED
   - Location: `backend/seed.js`, `backend/setup-db.js`
   - Action: Replaced hardcoded passwords with randomly generated passwords that are displayed during seed execution
   - Status: Resolved - Passwords are now randomly generated and logged to console for secure storage

2. **XSS Vulnerabilities** ✅ FIXED
   - Location: Frontend JavaScript files using `innerHTML` with user data
   - Action: Added `escapeHtml()` function to sanitize user input before rendering
   - Files Fixed:
     - `js/complaints.js`
     - `js/dashboard.js`
     - `js/admin-complaints.js`
     - `js/admin-dashboard.js`
     - `js/dept-admin-complaint-details.js`
     - `js/dept-admin-dashboard.js`
     - `js/officer-complaints.js`
     - `js/officer-dashboard.js`
   - Status: Resolved - All user-facing data is now escaped before rendering

3. **Loose CORS Configuration** ✅ FIXED
   - Location: `backend/server.js`
   - Action: Changed from array-based origin list to function-based validation
   - Status: Resolved - CORS now validates origins against an allowed list

4. **File Upload Validation** ✅ FIXED
   - Location: `backend/routes/complaints.js`
   - Action: Added MIME type and file extension validation
   - Allowed Types: JPG, JPEG, PNG, GIF, WebP, PDF
   - Status: Resolved - File uploads are now restricted to safe file types

5. **Inline Event Handlers** ✅ FIXED
   - Location: JavaScript files (app.js, dept-admin-approvals.js, admin-categories.js, complaint-details.js, officer-complaints.js, dept-admin-complaint-details.js)
   - Action: Replaced inline `onclick` handlers with event listeners using `addEventListener()`
   - Files Fixed:
     - `js/app.js` - View buttons and complaint cards
     - `js/dept-admin-approvals.js` - Review, approve, and reject buttons
     - `js/admin-categories.js` - Edit and delete buttons
     - `js/complaint-details.js` - Attachment image clicks
     - `js/officer-complaints.js` - Attachment image clicks
     - `js/dept-admin-complaint-details.js` - Attachment image clicks
   - Status: Resolved - All inline event handlers replaced with event listeners for CSP compliance

## Environment Variables

Create `.env` file in `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=citizen_complaint_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

## Development

### Running the Application

```bash
# Terminal 1: Backend
cd web-suite/backend
npm start

# Terminal 2: Frontend
cd web-suite
python -m http.server 8080
```

### Testing

```bash
# Run tests (if configured)
npm test

# Manual testing
# 1. Register as citizen
# 2. File a complaint
# 3. Login as department admin
# 4. Assign complaint to officer
# 5. Login as officer
# 6. Submit proof
# 7. Login as department admin
# 8. Approve/reject proof
```

## Troubleshooting

### Database Connection Failed
- Check MySQL is running
- Verify credentials in `.env`
- Ensure database exists

### File Upload Issues
- Check `uploads/` directory permissions
- Verify file size limits
- Check MIME type configuration

### Authentication Errors
- Verify JWT_SECRET in `.env`
- Check token expiration
- Ensure user is active in database

### CORS Errors
- Verify FRONTEND_URL in `.env`
- Check CORS configuration in `server.js`

## License

This project is created for educational purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions, please open an issue in the repository.

## Acknowledgments

- Government of India for design inspiration
- Express.js, Node.js, MySQL communities
- Open source contributors
