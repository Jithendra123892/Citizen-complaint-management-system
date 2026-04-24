import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Edit2, Loader2, Shield, Calendar } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '28px', 
          fontWeight: '700', 
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          Profile
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          View and manage your account
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px', 
            color: 'white', 
            fontSize: '48px', 
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(14, 165, 233, 0.4)'
          }}>
            {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          
          <h2 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e293b', 
            marginBottom: '8px' 
          }}>
            {user?.name || user?.username || 'User'}
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            {user?.email || 'citizen@example.com'}
          </p>
          
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 16px', 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)', 
            borderRadius: '20px',
            marginBottom: '24px'
          }}>
            <Shield size={16} style={{ color: 'white' }} />
            <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
              {user?.type || 'Citizen'}
            </span>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '14px',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              color: '#475569',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Edit2 size={16} />
            Change Photo
          </motion.button>

          <div style={{ 
            marginTop: '24px', 
            paddingTop: '24px', 
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
              <Calendar size={16} />
              Member since Jan 2024
            </div>
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}
        >
          <h3 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#1e293b', 
            marginBottom: '24px' 
          }}>
            Personal Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              { icon: User, label: 'Full Name', value: user?.name || 'John Doe', type: 'text' },
              { icon: Phone, label: 'Phone Number', value: '9876543210', type: 'tel' },
              { icon: Mail, label: 'Email', value: user?.email || 'john@example.com', type: 'email' },
              { icon: MapPin, label: 'Aadhaar Number', value: '1234 5678 9012', type: 'text', disabled: true },
              { icon: MapPin, label: 'Address', value: '123 Main Street, Ward 5', type: 'text', full: true },
              { icon: MapPin, label: 'Ward Number', value: '5', type: 'text' },
              { icon: MapPin, label: 'Pincode', value: '600001', type: 'text' },
            ].map((field, index) => (
              <div key={index} style={field.full ? { gridColumn: 'span 2' } : {}}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#64748b', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {field.label}
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0 16px',
                  transition: 'all 0.3s ease'
                }}>
                  <field.icon size={18} style={{ color: '#94a3b8', marginRight: '12px' }} />
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    disabled={field.disabled}
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      color: field.disabled ? '#94a3b8' : '#1e293b',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
              }}
            >
              Save Changes
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '14px 32px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Profile;
