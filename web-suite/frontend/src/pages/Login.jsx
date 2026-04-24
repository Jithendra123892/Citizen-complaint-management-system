import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Building2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Citizen');

  const { login } = useAuth();
  const navigate = useNavigate();

  const roles = [
    { id: 'Citizen', label: 'Citizen',   icon: User,      desc: 'Register & track complaints' },
    { id: 'Officer', label: 'Officer',   icon: Building2, desc: 'Handle & resolve complaints' },
    { id: 'Admin',   label: 'Admin',     icon: Shield,    desc: 'Manage departments & reports' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await login(formData.username.trim(), formData.password);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      {/* Tricolor bar at top */}
      <div className="tricolor-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      <div className="glow-1" />
      <div className="glow-2" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <Link to="/">
            <div className="logo-box">
              <Shield size={30} color="white" />
            </div>
            <div>
              <h1>CitizenConnect</h1>
              <p>Government of India</p>
            </div>
          </Link>
        </div>

        <div className="auth-card-inner">
          {/* Role tabs */}
          <div className="auth-tabs">
            {roles.map((role) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  className={`auth-tab${isActive ? ' active' : ''}`}
                  type="button"
                  onClick={() => { setSelectedRole(role.id); setError(''); }}
                >
                  <Icon size={18} style={{ color: isActive ? '#FF9933' : '#9ca3af' }} />
                  <span className="tab-label">{role.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form body */}
          <div className="auth-body">
            <h2 className="auth-title">{selectedRole} Login</h2>
            <p className="auth-subtitle">
              {roles.find(r => r.id === selectedRole)?.desc}
            </p>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  className="alert alert-error"
                  key="err"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">
                  {selectedRole === 'Citizen' ? 'Mobile / Username' : 'Official Username'}
                </label>
                <div className="input-icon-wrap">
                  <Mail size={17} className="i-icon" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder={selectedRole === 'Citizen' ? 'Mobile number or username' : 'Enter official username'}
                    className="form-input"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Password</label>
                <div className="input-icon-wrap" style={{ position: 'relative' }}>
                  <Lock size={17} className="i-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="form-input"
                    style={{ paddingLeft: 46, paddingRight: 46 }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg btn-full"
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
              >
                {loading
                  ? <Loader2 size={19} style={{ animation: 'spin 1s linear infinite' }} />
                  : <><span>Sign In</span><ArrowRight size={17} /></>
                }
              </motion.button>
            </form>

            {selectedRole === 'Citizen' && (
              <div style={{ textAlign: 'center', marginTop: 22, paddingTop: 22, borderTop: '1px solid #e5e7eb' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                  New user?{' '}
                  <Link to="/register" style={{ color: '#FF9933', fontWeight: 700, textDecoration: 'none' }}>
                    Register here
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer links */}
        <div className="auth-footer-links" style={{ marginTop: 22 }}>
          <Link to="/">Home</Link> {' | '}
          <span>Help</span> {' | '}
          <span>Terms</span> {' | '}
          <span>Privacy Policy</span>
          <div className="auth-copyright">© 2024 CitizenConnect | Government of India</div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
