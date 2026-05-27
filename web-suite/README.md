# CitizenConnect — Jansunwai Portal

> Citizen Grievance & Complaint Management System for the Government of India

A full-stack citizen grievance redressal platform enabling citizens to file complaints, track resolution status, and receive automated department routing. Built for Indian government standards with aakraman/bhog-bandi Hindi UI elements.

## Tech Stack

- **Backend**: Node.js + Express + MySQL
- **Frontend**: Vanilla HTML/CSS/JS (no build step) — 4 role-based dashboards
- **Auth**: JWT with role-based access (Citizen, Officer, DeptAdmin, SuperAdmin)
- **File uploads**: Multer with MySQL metadata
- **Security**: Helmet, rate-limiting, bcrypt, input sanitization

## Architecture

```
web-suite/
├── backend/
│   ├── public/              ← Frontend served by Express (built copy)
│   │   ├── citizen/         ← Citizen dashboard
│   │   ├── officer/         ← Officer dashboard
│   │   ├── dept-admin/      ← Department admin dashboard
│   │   ├── admin/           ← Super admin dashboard
│   │   ├── js/              ← Shared config.js + role JS
│   │   ├── css/
│   │   ├── index.html       ← Landing / home
│   │   ├── auth.html        ← Login / register
│   │   ├── track.html       ← Public complaint tracker
│   │   └── help.html
│   ├── uploads/             ← User-uploaded files (gitignored)
│   ├── config/database.js   ← MySQL pool (supports DATABASE_URL)
│   ├── routes/              ← All API endpoints
│   ├── middleware/          ← Auth, security, error handling
│   └── server.js           ← express.static + API routes
├── railway.json             ← Railway deployment config
├── .gitignore
└── package.json
```

## Deployment: Railway (Recommended)

Railway hosts both the Node.js API and static frontend from a single service.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "CitizenConnect v1.0"
git remote add origin https://github.com/YOUR_USERNAME/citizen-connect.git
git push -u origin master
```

### 2. Connect to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo
4. Railway auto-detects Node.js from `backend/package.json`
5. Railway sets `PORT` automatically; **do NOT hardcode a port**

### 3. Add MySQL Database

1. In Railway project → **Add a Database** → **MySQL**
2. Wait for MySQL to provision
3. Railway automatically sets `MYSQL_URL` environment variable
4. The app reads `MYSQL_URL` automatically (supports both `DATABASE_URL` and `MYSQL_URL`)

### 4. Set Environment Variables

In Railway project settings, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Any random 32+ char string |
| `NODE_ENV` | `production` (optional — auto-set by Railway) |

### 5. Configure Domain (Optional)

1. Railway → Project → **Settings** → **Networking** → **Public Networking** → Enable
2. Your app will be available at `https://your-service.up.railway.app`
3. For custom domain: Railway Settings → **Custom Domains**

### 6. First Deploy

Railway auto-builds via `npm install` in `backend/` (set by `rootDirectory: "backend"` in `railway.json`). Database tables are **auto-created on first start**.

### Seed Sample Data (Optional)

After deploy, seed via Railway shell:

```bash
railway run node seed.js
```

Creates departments (6), categories (12), and sample officers.

---

## Local Development

### Prerequisites

- Node.js 18+
- MySQL 8+

### Setup

```bash
cd web-suite/backend

# Copy env file
cp .env.example .env
# Edit .env with DB_HOST, DB_USER, DB_PASSWORD for your local MySQL

# Install deps
npm install

# Start dev server (auto-creates tables on first run)
npm run dev
```

Frontend served at `http://localhost:5000` — all `config.js` auto-detects port.

### Seed Data (Local)

```bash
node seed.js
```

---

## Environment Variables

### Backend (.env)

```env
# Local development
PORT=5000
JWT_SECRET=change-me-to-random-32-char-string
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=citizen_complaint_db
DB_PORT=3306

# Railway (auto-set by Railway MySQL add-on, not needed manually)
# DATABASE_URL=mysql://user:password@host:3306/dbname
# MYSQL_URL=mysql://user:password@host:3306/dbname
```

### Frontend Configuration

**No env vars needed.** `config.js` auto-detects the API origin from `window.location`. Works identically on localhost, Railway, or any custom domain.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Citizen/officer login |
| POST | `/api/auth/register` | No | Citizen self-registration |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/complaints` | JWT | List complaints (role-filtered) |
| POST | `/api/complaints` | JWT | File new complaint |
| GET | `/api/complaints/:id` | JWT | Complaint detail + history |
| GET | `/api/complaints/track/:number` | No | Public: track by complaint number |
| PUT | `/api/complaints/:id/status` | JWT | Update status (Officer) |
| POST | `/api/upload/:complaintId` | JWT | Upload attachments |
| GET | `/api/departments` | No | List departments |
| GET | `/api/categories` | No | List categories with dept mapping |
| GET | `/api/officers` | No | List officers |
| POST | `/api/complaints/:id/proof` | JWT | Officer submits resolution proof |
| PUT | `/api/complaints/:id/approve` | JWT | DeptAdmin approves officer proof |
| GET | `/api/analytics/summary` | JWT | Dashboard stats |
| GET | `/api/reports/*` | JWT | Report generation |
| GET | `/api/dept-admin/reports` | JWT | DeptAdmin reports |

---

## Default Credentials

After running `seed.js` — super admin created:

| Role | Username | Password |
|---|---|---|
| SuperAdmin | `superadmin` | `Admin@123` |

Officer logins (after seed):
- Username format: `officer_{badge_number}`
- Check `backend/seed.js` for actual credentials

---

## File Size & Uploads

- Max upload per file: **10MB**
- Supported formats: JPEG, PNG, GIF, PDF, MP4, WebM
- Railway uploads are ephemeral (lost on redeploy) — use Railway Persistent Disks or S3-compatible storage for production file persistence
- Uploads served at `/uploads/filename.ext`

---

## Vercel (Static Frontend + Railway Backend)

If you prefer Vercel for the frontend only:

### Railway
1. Deploy `backend/` to Railway as described above
2. Note your Railway deployment URL

### Vercel
1. Create `vercel.json` in `web-suite/` root:
   ```json
   {
     "redirects": [
       { "source": "/(.*)", "destination": "https://your-railway-app.railway.app/$1" }
     ]
   }
   ```
2. Or set `API_BASE_URL` via Vercel env var:
   - Set `API_BASE_URL` to your Railway URL in Vercel dashboard
   - Set `data-api-url` attribute on the config script tag in all HTML pages

Alternatively, serve the frontend from Railway directly (no Vercel needed) — every HTML page works from the single Railway deployment.

---

## Troubleshooting

**CORS errors in browser console:**
- Ensure `FRONTEND_URL` in Railway env vars matches your Railway deployment URL (no trailing slash)

**Database connection fails:**
- Verify Railway MySQL is active (green status in Railway dashboard)
- Check `MYSQL_URL` is set in Railway environment variables

**Login doesn't work on first deploy:**
- Run `railway run node seed.js` to create default SuperAdmin
- Check that `users` table has entries

**Uploads lost after redeploy:**
- Railway filesystem is ephemeral — uploads are lost on each deploy
- For production: attach a Railway Persistent Disk to `backend/uploads/`, or migrate to S3