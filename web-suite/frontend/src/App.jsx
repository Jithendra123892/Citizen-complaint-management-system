import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewComplaint from './pages/NewComplaint';
import TrackComplaint from './pages/TrackComplaint';
import Analytics from './pages/Analytics';
import Departments from './pages/Departments';
import Officers from './pages/Officers';
import Profile from './pages/Profile';
import { FileText } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const ComplaintsList = () => {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/complaints`, config);
      if (response.data.data?.items) {
        setComplaints(response.data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Pending': 'status-badge status-pending',
      'In Progress': 'status-badge status-in-progress',
      'Resolved': 'status-badge status-resolved',
      'Closed': 'status-badge status-closed',
      'Rejected': 'status-badge status-rejected',
    };
    return styles[status] || 'status-badge status-pending';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">My Complaints</h1>
          <p className="page-subtitle">View and manage all your complaints</p>
        </div>
        <button 
          onClick={() => navigate('/new-complaint')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={18} />
          New Complaint
        </button>
      </div>

      {complaints.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={32} />
            </div>
            <p className="empty-title">No complaints yet</p>
            <p className="empty-text">File your first complaint to get started</p>
            <button 
              onClick={() => navigate('/new-complaint')}
              className="btn btn-primary"
            >
              File Complaint
            </button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr 
                  key={complaint.complaint_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/track?number=${complaint.complaint_number}`)}
                >
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#0ea5e9', fontSize: '13px' }}>{complaint.complaint_number}</span>
                  </td>
                  <td style={{ fontWeight: '500', color: '#1e293b' }}>{complaint.complaint_title}</td>
                  <td style={{ color: '#64748b' }}>{complaint.category_name}</td>
                  <td>
                    <span className={getStatusBadge(complaint.status)}>{complaint.status}</span>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '13px' }}>
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/track?number=${complaint.complaint_number}`);
                      }}
                      style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function App() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#FF9933',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complaints" element={<ComplaintsList />} />
        <Route path="/new-complaint" element={<NewComplaint />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/officers" element={<Officers />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
