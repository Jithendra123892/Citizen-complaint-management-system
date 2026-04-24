import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  FileText, Clock, CheckCircle, PlusCircle, 
  ChevronRight, TrendingUp, MapPin, Search, 
  Loader2, AlertCircle, Activity
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0
  });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const statsRes = await axios.get(`${API_URL}/complaints/stats/summary`, config);
      if (statsRes.data.data?.summary) {
        setStats(statsRes.data.data.summary);
      }

      const complaintsRes = await axios.get(`${API_URL}/complaints?limit=5`, config);
      if (complaintsRes.data.data?.items) {
        setRecentComplaints(complaintsRes.data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': { bg: '#fef3c7', color: '#d97706' },
      'In Progress': { bg: '#dbeafe', color: '#2563eb' },
      'Resolved': { bg: '#d1fae5', color: '#059669' },
      'Closed': { bg: '#f1f5f9', color: '#64748b' },
      'Rejected': { bg: '#fee2e2', color: '#dc2626' },
    };
    const style = styles[status] || styles['Pending'];
    return (
      <span style={{ 
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.color
      }}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      'High': { bg: '#fee2e2', color: '#dc2626' },
      'Critical': { bg: '#fee2e2', color: '#dc2626' },
      'Medium': { bg: '#dbeafe', color: '#2563eb' },
      'Low': { bg: '#d1fae5', color: '#059669' },
    };
    const style = styles[priority] || styles['Medium'];
    return (
      <span style={{ 
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        background: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {priority}
      </span>
    );
  };

  const StatCard = ({ icon: Icon, label, value, color, delay }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: color
      }} />
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '16px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={28} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>{label}</p>
        <p style={{ 
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1e293b',
          lineHeight: 1
        }}>{value}</p>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <Loader2 size={40} style={{ color: '#0ea5e9', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '4px'
          }}>
            Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Welcome back, {user?.name || 'Citizen'}!
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/new-complaint')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
          }}
        >
          <PlusCircle size={18} />
          New Complaint
        </motion.button>
      </motion.div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <StatCard 
          icon={FileText} 
          label="Total Complaints" 
          value={stats.total} 
          color="#0ea5e9"
          delay={0}
        />
        <StatCard 
          icon={Clock} 
          label="Pending" 
          value={stats.pending} 
          color="#f59e0b"
          delay={0.1}
        />
        <StatCard 
          icon={TrendingUp} 
          label="In Progress" 
          value={stats.in_progress} 
          color="#8b5cf6"
          delay={0.2}
        />
        <StatCard 
          icon={CheckCircle} 
          label="Resolved" 
          value={stats.resolved} 
          color="#10b981"
          delay={0.3}
        />
      </div>

      {/* Recent Complaints */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Recent Complaints</h3>
          <button 
            onClick={() => navigate('/complaints')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: 'none', 
              border: 'none', 
              color: '#0ea5e9', 
              fontSize: '14px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            View All <ChevronRight size={16} />
          </button>
        </div>

        {recentComplaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#f1f5f9',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <FileText size={32} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>No complaints yet</p>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>File your first complaint to get started</p>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/new-complaint')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              File Complaint
            </motion.button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Priority</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.map((complaint, index) => (
                  <motion.tr 
                    key={complaint.complaint_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/track?number=${complaint.complaint_number}`)}
                  >
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontFamily: "'Space Grotesk', monospace", color: '#0ea5e9', fontSize: '13px', fontWeight: '600' }}>
                        {complaint.complaint_number}
                      </span>
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: '500', color: '#1e293b' }}>
                      {complaint.complaint_title}
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                      {complaint.category_name}
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                      {getStatusBadge(complaint.status)}
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                      {getPriorityBadge(complaint.priority)}
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '13px' }}>
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}
      >
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => navigate('/track')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              background: '#dbeafe', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Search size={28} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <h4 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Track Complaint</h4>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Check status using complaint number</p>
            </div>
          </div>
          <button style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#eff6ff', 
            border: '1px solid #dbeafe', 
            borderRadius: '10px', 
            color: '#2563eb', 
            fontWeight: '600', 
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            Track Now
          </button>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => navigate('/new-complaint')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '14px', 
              background: '#d1fae5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <PlusCircle size={28} style={{ color: '#059669' }} />
            </div>
            <div>
              <h4 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>New Complaint</h4>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Submit a new complaint</p>
            </div>
          </div>
          <button style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#ecfdf5', 
            border: '1px solid #d1fae5', 
            borderRadius: '10px', 
            color: '#059669', 
            fontWeight: '600', 
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            File Complaint
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
