import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowLeft, Clock, MapPin, Building2, User,
  CheckCircle2, AlertCircle, FileText, Loader2
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const TrackComplaint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialNumber = searchParams.get('number') || '';
  
  const [complaintNumber, setComplaintNumber] = useState(initialNumber);
  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialNumber) {
      handleSearch();
    }
  }, [initialNumber]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!complaintNumber.trim()) {
      setError('Please enter a complaint number');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const response = await axios.get(`${API_URL}/complaints/track/${complaintNumber.trim()}`);
      if (response.data.data) {
        setComplaint(response.data.data.complaint);
        setHistory(response.data.data.history || []);
      }
    } catch (err) {
      setComplaint(null);
      setHistory([]);
      setError(err.response?.data?.message || 'Complaint not found');
    } finally {
      setLoading(false);
    }
  };

  const getTimelineSteps = () => {
    const steps = [
      { status: 'Pending', label: 'Complaint Filed' },
      { status: 'In Progress', label: 'Under Review' },
      { status: 'Resolved', label: 'Issue Resolved' },
      { status: 'Closed', label: 'Case Closed' }
    ];

    const currentStatus = complaint?.status;
    const currentIndex = steps.findIndex(s => s.status === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      done: index <= currentIndex,
      active: step.status === currentStatus
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: '900px', margin: '0 auto' }}
    >
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/dashboard')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'none', 
          border: 'none', 
          color: '#0ea5e9', 
          fontSize: '14px', 
          cursor: 'pointer', 
          marginBottom: '20px',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </motion.button>

      <div style={{ 
        background: 'white', 
        borderRadius: '24px', 
        padding: '40px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 30px rgba(14, 165, 233, 0.3)'
          }}>
            <Search size={36} style={{ color: 'white' }} />
          </div>
          <h1 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '8px'
          }}>
            Track Your Complaint
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Enter your complaint number to check the current status
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ 
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0 16px',
              transition: 'all 0.3s ease'
            }}>
              <Search size={20} style={{ color: '#94a3b8' }} />
              3b8'<input
                type="text"
                value={complaintNumber}
                onChange={(e) => setComplaintNumber(e.target.value)}
                style={{
                  flex: '1',
                  padding: '14px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '15px',
                  outline: 'none'
                }}
                placeholder="Enter Complaint Number (e.g., 2024-POT-000001)"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 32px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Searching...
                </span>
              ) : 'Track'}
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {complaint && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Status Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderRadius: '16px', 
              padding: '24px', 
              marginBottom: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '20px' 
              }}>
                <div>
                  <p style={{ 
                    fontFamily: "'Space Grotesk', monospace", 
                    color: '#0ea5e9', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '8px' 
                  }}>
                    {complaint.complaint_number}
                  </p>
                  <h2 style={{ 
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '22px', 
                    fontWeight: '700', 
                    color: '#1e293b' 
                  }}>
                    {complaint.complaint_title}
                  </h2>
                </div>
                <span style={{ 
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: complaint.status === 'Resolved' ? '#d1fae5' : 
                             complaint.status === 'In Progress' ? '#dbeafe' :
                             complaint.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                  color: complaint.status === 'Resolved' ? '#059669' : 
                         complaint.status === 'In Progress' ? '#2563eb' :
                         complaint.status === 'Rejected' ? '#dc2626' : '#d97706'
                }}>
                  {complaint.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { icon: FileText, label: 'Category', value: complaint.category_name },
                  { icon: Building2, label: 'Department', value: complaint.department_name },
                  { icon: Clock, label: 'Priority', value: complaint.priority, color: complaint.priority === 'Critical' || complaint.priority === 'High' ? '#dc2626' : complaint.priority === 'Medium' ? '#2563eb' : '#059669' },
                  { icon: User, label: 'Assigned To', value: complaint.officer_name || 'Not Assigned' }
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    padding: '14px', 
                    background: 'white', 
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {item.label}
                    </p>
                    <p style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: item.color || '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <item.icon size={14} style={{ color: '#0ea5e9' }} />
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {complaint.location && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '14px', 
                  background: 'white', 
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Location
                  </p>
                  <p style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} style={{ color: '#0ea5e9' }} />
                    {complaint.location}
                  </p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '20px'
              }}>
                Progress Timeline
              </h3>
              
              <div style={{ position: 'relative', paddingLeft: '30px' }}>
                {/* Line */}
                <div style={{
                  position: 'absolute',
                  left: '15px',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: '#e2e8f0'
                }} />
                
                {getTimelineSteps().map((step, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      position: 'relative',
                      paddingBottom: index < 3 ? '24px' : '0'
                    }}
                  >
                    {/* Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-30px',
                      top: '0',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: step.done 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                        : '#f1f5f9',
                      border: '3px solid ' + (step.done ? '#10b981' : '#e2e8f0'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      {step.done && <CheckCircle2 size={16} style={{ color: 'white' }} />}
                    </div>
                    
                    <div>
                      <p style={{ 
                        fontSize: '15px', 
                        fontWeight: step.active ? '700' : '500', 
                        color: step.done ? '#1e293b' : '#94a3b8'
                      }}>
                        {step.label}
                      </p>
                      {step.active && (
                        <p style={{ fontSize: '12px', color: '#0ea5e9', marginTop: '4px' }}>
                          Current Status
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setComplaint(null);
                  setComplaintNumber('');
                  setSearched(false);
                }}
                style={{
                  flex: '1',
                  padding: '14px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#475569',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Track Another
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/new-complaint')}
                style={{
                  flex: '1',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
                }}
              >
                File New Complaint
              </motion.button>
            </div>
          </motion.div>
        )}

        {!complaint && !loading && !error && searched && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px' }}
          >
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
              <Search size={32} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
              No complaint found
            </p>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Please check the complaint number and try again
            </p>
          </motion.div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default TrackComplaint;
