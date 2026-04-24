import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell, LogOut, Shield, LayoutDashboard, FileText, PlusCircle,
  Search, Building2, Users, BarChart3, X, Menu as MenuIcon,
  CheckCircle, Clock, AlertTriangle, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

/* ──────────────────────────────────────────────────── */
/*  LAYOUT                                              */
/* ──────────────────────────────────────────────────── */
const Layout = () => {
  const { user, logout, token, isCitizen, isOfficer, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0 });
  const location = useLocation();

  /* Collapse sidebar on small screens automatically */
  useEffect(() => {
    const check = () => { if (window.innerWidth < 1024) setSidebarOpen(false); };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (token) fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/complaints/stats/summary`, config);
      if (res.data.data?.summary) setStats(res.data.data.summary);
    } catch (e) { /* silent */ }
  };

  /* ─── Menu definitions ──────── */
  const citizenMenu = [
    { path: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/complaints',    icon: FileText,         label: 'My Complaints' },
    { path: '/new-complaint', icon: PlusCircle,       label: 'New Complaint' },
    { path: '/track',         icon: Search,           label: 'Track Complaint' },
    { path: '/departments',   icon: Building2,        label: 'Departments' },
    { path: '/profile',       icon: User,             label: 'My Profile' },
  ];
  const officerMenu = [
    { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/complaints',  icon: FileText,         label: 'Assigned Complaints' },
    { path: '/analytics',   icon: BarChart3,        label: 'Analytics' },
    { path: '/departments', icon: Building2,        label: 'Departments' },
    { path: '/officers',    icon: Users,            label: 'Officers' },
    { path: '/profile',     icon: User,             label: 'My Profile' },
  ];
  const adminMenu = [
    { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/complaints',  icon: FileText,         label: 'All Complaints' },
    { path: '/analytics',   icon: BarChart3,        label: 'Analytics & Reports' },
    { path: '/departments', icon: Building2,        label: 'Departments' },
    { path: '/officers',    icon: Users,            label: 'Officers Management' },
    { path: '/profile',     icon: User,             label: 'Admin Profile' },
  ];

  const menuItems = isAdmin ? adminMenu : isOfficer ? officerMenu : citizenMenu;

  const getRoleLabel = () => isAdmin ? 'Administrator' : isOfficer ? 'Officer' : 'Citizen';
  const getRoleColor = () => isAdmin ? '#dc2626' : isOfficer ? '#138808' : '#FF9933';

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  return (
    <div className="app-layout">
      {/* ─── SIDEBAR ─── */}
      <motion.aside
        className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          {sidebarOpen ? (
            <>
              <Link to="/dashboard" className="brand" style={{ textDecoration: 'none' }}>
                <div className="brand-icon">
                  <Shield size={22} color="white" />
                </div>
                <div className="brand-text">
                  <h2>CitizenConnect</h2>
                  <span>Government of India</span>
                </div>
              </Link>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                <X size={17} />
              </button>
            </>
          ) : (
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} style={{ margin: '0 auto' }}>
              <Shield size={20} color="rgba(255,255,255,0.8)" />
            </button>
          )}
        </div>

        {/* Quick Stats */}
        {sidebarOpen && (
          <div className="sidebar-stats">
            <p className="stats-label">Quick Stats</p>
            <div className="stats-grid">
              <div className="stat-pill">
                <Clock size={16} style={{ color: '#FF9933', marginBottom: 4 }} />
                <div className="s-val">{stats.pending || 0}</div>
                <div className="s-lbl">Pending</div>
              </div>
              <div className="stat-pill">
                <AlertTriangle size={16} style={{ color: '#60a5fa', marginBottom: 4 }} />
                <div className="s-val">{stats.in_progress || 0}</div>
                <div className="s-lbl">Active</div>
              </div>
              <div className="stat-pill">
                <CheckCircle size={16} style={{ color: '#4ade80', marginBottom: 4 }} />
                <div className="s-val">{stats.resolved || 0}</div>
                <div className="s-lbl">Done</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link${isActive ? ' active' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <item.icon size={19} className="nav-icon" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={!sidebarOpen ? { justifyContent: 'center', margin: '0 auto', width: 'fit-content' } : {}}
          >
            <LogOut size={19} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* ─── MAIN AREA ─── */}
      <div className={`main-wrapper${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <MenuIcon size={21} />
            </button>
            <div className="topbar-title">
              <h2>Welcome, {user?.name || user?.username || 'User'}</h2>
              <p>Ministry of Citizens Affairs &nbsp;|&nbsp; CitizenConnect Portal</p>
            </div>
          </div>

          <div className="topbar-right">
            <button className="notif-btn">
              <Bell size={19} />
              <span className="notif-dot" />
            </button>

            <div className="user-chip">
              <div className="u-info">
                <div className="u-name">{user?.name || user?.username || 'User'}</div>
                <div className="u-role" style={{ color: getRoleColor() }}>{getRoleLabel()}</div>
              </div>
              <div
                className="user-avatar"
                style={{ background: `linear-gradient(135deg, ${getRoleColor()} 0%, ${getRoleColor()}cc 100%)` }}
              >
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Tricolor bar under header */}
        <div className="tricolor-bar" />

        {/* Content */}
        <main className="page-content">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          © 2024 CitizenConnect, Government of India &nbsp;|&nbsp;
          <a href="#">Help</a> &nbsp;|&nbsp;
          <a href="#">Terms</a> &nbsp;|&nbsp;
          <a href="#">Privacy Policy</a>
        </footer>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────── */
/*  PROTECTED ROUTE                                     */
/* ──────────────────────────────────────────────────── */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="logo-badge">
          <Shield size={30} color="white" />
        </div>
        <p style={{ color: '#1a1a72', fontWeight: 600, fontSize: 15 }}>CitizenConnect</p>
        <div className="spinner" />
      </div>
    );
  }

  return isAuthenticated ? <Layout /> : <Navigate to="/login" replace />;
};

export { Layout, ProtectedRoute };
