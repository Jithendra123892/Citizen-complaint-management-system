# Smart Citizen Complaint Management System

A complete full-stack application for managing citizen complaints with automatic department allocation.

## Features

- **JWT Authentication**: Secure login/register for citizens
- **Auto-Allocation**: Complaints automatically assigned to correct department based on category
- **Complaint Tracking**: Search by complaint number to check status
- **Real-time Dashboard**: View stats and recent complaints
- **Clean UI**: Sky/Blue theme (no purple)

## Tech Stack

- **Backend**: Node.js, Express, MySQL
- **Frontend**: React, React Router, Axios, Tailwind CSS
- **Authentication**: JWT tokens

## Setup Instructions

### 1. Database Setup

Create a MySQL database and run the initialization script:

```sql
CREATE DATABASE citizen_complaint_db;
USE citizen_complaint_db;
```

The tables will be created automatically when you start the server.

### 2. Backend Setup

```bash
cd web-suite/backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env with your database credentials
# DB_PASSWORD=your_mysql_password

# Start the server
npm run dev
```

The server will start on `http://localhost:5000`

### 3. Seed Database (Optional - for sample data)

```bash
# In backend directory
node seed.js
```

This creates:
- 6 departments
- 12 complaint categories with proper department mappings
- 5 sample officers

### 4. Frontend Setup

```bash
cd web-suite/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new citizen
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Complaints
- `POST /api/complaints` - Create new complaint (protected, auto-assigns department)
- `GET /api/complaints` - List complaints (protected)
- `GET /api/complaints/track/:number` - Track by complaint number (public)
- `GET /api/complaints/stats/summary` - Get statistics (protected)

### Departments & Categories
- `GET /api/departments` - List all departments (public)
- `GET /api/categories` - List all categories with department mappings (public)

## Auto-Allocation Logic

When a citizen files a complaint:

1. They select a category (e.g., "Pothole Repair")
2. System looks up which department handles that category
3. Complaint is automatically assigned to that department
4. A unique complaint number is generated (format: `YYYY-CAT-NNNNNN`)

Example:
- Category: "Pothole Repair" → Department: "Roads & Infrastructure"
- Category: "Water Leakage" → Department: "Water Supply Department"
- Category: "Power Outage" → Department: "Electricity Department"

## User Flows

### Registration → Login → Dashboard
1. Visit `/register` and create account
2. Login with credentials
3. View dashboard with stats

### New Complaint → Auto-allocation → Track
1. Click "New Complaint"
2. Select category (shows auto-assigned department)
3. Fill details and submit
4. Get complaint number
5. Track using complaint number

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=citizen_complaint_db
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

**Database connection failed:**
- Check MySQL is running
- Verify credentials in .env file
- Ensure database `citizen_complaint_db` exists

**CORS errors:**
- Check FRONTEND_URL in backend .env matches your frontend URL

**Login issues:**
- For citizens: username format is `citizen_{citizen_id}`
- Use the phone number as reference when logging in

## File Structure

```
web-suite/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── complaints.js
│   │   ├── departments.js
│   │   └── categories.js
│   ├── utils/
│   │   └── helpers.js
│   ├── server.js
│   ├── seed.js
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── NewComplaint.jsx
    │   │   └── TrackComplaint.jsx
    │   ├── styles/
    │   │   └── aligned.css
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## License

MIT
