# CitizenConnect - Smart Complaint Management System

A comprehensive, full-stack Smart Citizen Complaint Management System with a beautiful, modern UI and powerful backend API.

## 🎯 Features

### Frontend (React-style HTML/CSS/JS)
- **Beautiful UI** - Modern glass-morphism design with smooth animations
- **Responsive Design** - Works on all devices (desktop, tablet, mobile)
- **Dark Mode** - Toggle between light and dark themes
- **Real-time Updates** - Live notifications and status tracking
- **Interactive Charts** - Visual analytics with Chart.js
- **Complaint Tracking** - Track complaints by number
- **File Upload** - Attach photos/documents to complaints
- **Geolocation** - Capture location automatically

### Backend (Node.js/Express)
- **RESTful API** - Clean, documented API endpoints
- **JWT Authentication** - Secure token-based auth
- **MySQL Database** - Robust relational database
- **Role-based Access** - Citizen, Officer, Admin roles
- **File Upload** - Multer-based file handling
- **SLA Tracking** - Automatic SLA compliance monitoring

### Database
- **9 Core Tables** - Departments, Officers, Categories, Citizens, Complaints, etc.
- **Views** - Pre-built reporting views
- **Stored Procedures** - Complex business logic
- **Triggers** - Automatic audit logging
- **DCL Commands** - User management and privileges

## 📁 Project Structure

```
project_dbms/
├── web-suite/
│   ├── backend/
│   │   ├── config/
│   │   │   └── database.js          # MySQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication
│   │   │   └── errorHandler.js      # Error handling
│   │   ├── routes/
│   │   │   ├── auth.js              # Login, register, logout
│   │   │   ├── citizens.js          # Citizen management
│   │   │   ├── complaints.js        # Complaints CRUD
│   │   │   ├── departments.js       # Department info
│   │   │   ├── officers.js          # Officer management
│   │   │   ├── categories.js        # Complaint categories
│   │   │   ├── reports.js          # Report generation
│   │   │   ├── analytics.js         # Analytics dashboard
│   │   │   └── upload.js            # File uploads
│   │   ├── utils/
│   │   │   └── helpers.js           # Utility functions
│   │   ├── server.js                # Express server
│   │   └── package.json             # Dependencies
│   │
│   ├── css/
│   │   ├── styles.css               # Main styles
│   │   └── animations.css           # Animations
│   │
│   ├── js/
│   │   └── app.js                    # Frontend JavaScript
│   │
│   └── index.html                   # Main HTML file
│
├── complaint_management_schema.sql   # DDL (Tables, Views, Procedures)
├── complaint_management_dcl.sql     # DCL (User Management)
├── complaint_management_sample_data.sql # Sample Data
├── complaint_management_queries.sql  # Reporting Queries
└── README.md                         # This file
```

## 🚀 Quick Start

### 1. Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE citizen_complaint_db;
EXIT;

# Run schema
mysql -u root -p citizen_complaint_db < complaint_management_schema.sql

# Run DCL
mysql -u root -p citizen_complaint_db < complaint_management_dcl.sql

# Insert sample data
mysql -u root -p citizen_complaint_db < complaint_management_sample_data.sql
```

### 2. Backend Setup

```bash
cd web-suite/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=citizen_complaint_db

# Start server
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Frontend

Simply open `index.html` in a browser, or serve it:

```bash
# Using Python
python -m http.server 3000

# Then open http://localhost:3000
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new citizen |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout user |
| PUT | /api/auth/password | Change password |

### Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/complaints | Get all complaints |
| GET | /api/complaints/:id | Get complaint by ID |
| GET | /api/complaints/track/:number | Track complaint |
| POST | /api/complaints | File new complaint |
| PUT | /api/complaints/:id | Update complaint |
| PUT | /api/complaints/:id/status | Update status |
| PUT | /api/complaints/:id/assign | Assign officer |
| GET | /api/complaints/stats/summary | Get statistics |

### Citizens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/citizens | Get all citizens |
| GET | /api/citizens/:id | Get citizen details |
| PUT | /api/citizens/:id | Update citizen |
| GET | /api/citizens/:id/complaints | Get citizen complaints |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/departments | Get all departments |
| GET | /api/departments/:id | Get department |
| GET | /api/departments/:id/complaints | Get complaints |
| GET | /api/departments/:id/officers | Get officers |

### Officers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/officers | Get all officers |
| GET | /api/officers/:id | Get officer |
| POST | /api/officers | Create officer |
| PUT | /api/officers/:id | Update officer |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/summary | Get summary report |
| GET | /api/reports/department/:id | Department report |
| GET | /api/reports/sla | SLA performance |
| GET | /api/reports/export | Export data |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/dashboard | Dashboard data |
| GET | /api/analytics/realtime | Real-time stats |
| GET | /api/analytics/comparison | Period comparison |

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **Citizen** | File complaints, view own complaints, track complaints |
| **Officer** | View assigned complaints, update status, add comments |
| **Admin** | Full access, manage users, export reports |

## 🗄️ Database Tables

1. **departments** - Municipal departments
2. **officers** - Municipal officers
3. **complaint_categories** - Categories with SLA hours
4. **citizens** - Citizen registration
5. **complaints** - Main complaint records
6. **complaint_status_history** - Status change audit
7. **complaint_attachments** - File attachments
8. **users** - System users
9. **audit_logs** - System audit trail

## 📊 Views

- `v_active_complaints` - Active complaints with SLA status
- `v_department_performance` - Department metrics
- `v_citizen_complaints` - Citizen history
- `v_officer_workload` - Officer statistics
- `v_complaint_trends` - Daily trends

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=citizen_complaint_db
DB_PORT=3306

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## 🛠️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- CSS Variables, Flexbox, Grid
- Chart.js for visualizations
- Custom animations

### Backend
- Node.js, Express.js
- MySQL (mysql2 driver)
- JWT authentication
- Multer for file uploads

### Database
- MySQL 8.0+
- Stored procedures
- Views and triggers
- Role-based access control

## 📱 Screenshots

The UI includes:
- **Login/Register** - Beautiful split-screen auth
- **Dashboard** - Stats cards, charts, recent complaints
- **Complaints List** - Filterable, searchable
- **New Complaint** - Multi-step form with map
- **Track Complaint** - Timeline view
- **Officers/Departments** - Directory views
- **Analytics** - KPI cards, charts
- **Settings** - Profile, notifications, security

## 🎨 Design Highlights

- **Glass-morphism** effects on sidebar
- **Gradient** buttons and cards
- **Smooth transitions** on all interactions
- **Responsive** mobile-first design
- **Dark mode** support
- **Toast notifications**
- **Modal dialogs**
- **Timeline views**

## 📄 License

This project is created for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📞 Support

For questions or issues, please open a GitHub issue.
