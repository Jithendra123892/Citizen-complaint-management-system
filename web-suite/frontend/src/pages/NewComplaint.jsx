import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, MapPin, AlertCircle, CheckCircle, ArrowLeft,
  Building2, Upload, Loader2, X, File
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const NewComplaint = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    complaintTitle: '',
    complaintDescription: '',
    location: '',
    priority: 'Medium',
    latitude: null,
    longitude: null
  });

  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      if (response.data.data?.categories) {
        setCategories(response.data.data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setFetchingCategories(false);
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    const category = categories.find(c => c.category_id.toString() === categoryId);
    
    setSelectedCategory(category);
    setFormData({ ...formData, categoryId });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      const validFiles = selectedFiles.filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Only images and PDFs allowed.`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError(`File too large: ${file.name}. Maximum 10MB allowed.`);
          return false;
        }
        return true;
      });
      setFiles([...files, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async (complaintId) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      files.forEach(file => {
        formDataUpload.append('files', file);
      });
      
      await axios.post(`${API_URL}/upload/${complaintId}`, formDataUpload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (err) {
      console.error('Failed to upload files:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.categoryId) {
      setError('Please select a category');
      setLoading(false);
      return;
    }

    if (formData.complaintTitle.length < 5) {
      setError('Title must be at least 5 characters');
      setLoading(false);
      return;
    }

    if (formData.complaintDescription.length < 10) {
      setError('Description must be at least 10 characters');
      setLoading(false);
      return;
    }

    if (!formData.location.trim()) {
      setError('Please enter the location');
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_URL}/complaints`, formData, config);
      
      if (response.data.data?.complaint) {
        const complaint = response.data.data.complaint;
        await uploadFiles(complaint.complaint_id);
        setSuccess(complaint);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: '600px', margin: '0 auto' }}
      >
        <div style={{ 
          background: 'white', 
          borderRadius: '24px', 
          padding: '40px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            style={{ 
              width: '80px', 
              height: '80px', 
              margin: '0 auto 24px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)'
            }}
          >
            <CheckCircle size={40} style={{ color: 'white' }} />
          </motion.div>
          
          <h2 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b', 
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Complaint Submitted!
          </h2>
          <p style={{ color: '#64748b', marginBottom: '24px', textAlign: 'center' }}>
            Your complaint has been filed successfully.
          </p>
          
          <div style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
            borderRadius: '16px', 
            padding: '24px', 
            marginBottom: '24px', 
            textAlign: 'left',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Complaint Number</p>
                <p style={{ fontFamily: "'Space Grotesk', monospace", color: '#0ea5e9', fontSize: '16px', fontWeight: '700' }}>{success.complaint_number}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</p>
                <span style={{ 
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#fef3c7',
                  color: '#d97706'
                }}>{success.status}</span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</p>
                <p style={{ color: '#1e293b', fontWeight: '600' }}>{success.category_name}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned To</p>
                <p style={{ color: '#1e293b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} style={{ color: '#0ea5e9' }} />
                  {success.department_name}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/track')}
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
              Track Complaint
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard')}
              style={{
                flex: '1',
                padding: '14px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
              }}
            >
              Go to Dashboard
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: '700px', margin: '0 auto' }}
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
        padding: '32px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '8px'
          }}>
            File New Complaint
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Report civic issues. Complaints are auto-assigned to the relevant department.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Complaint Category *
            </label>
            {fetchingCategories ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', padding: '12px 0' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Loading categories...
              </div>
            ) : (
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleCategoryChange}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            )}
            
            {selectedCategory && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  marginTop: '12px', 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                  borderRadius: '12px', 
                  border: '1px solid #bae6fd' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Building2 size={20} style={{ color: '#0ea5e9', marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>Will be auto-assigned to:</p>
                    <p style={{ color: '#1e293b', fontWeight: '600' }}>{selectedCategory.department_name}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter exact location"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Complaint Title *
            </label>
            <input
              type="text"
              name="complaintTitle"
              value={formData.complaintTitle}
              onChange={handleChange}
              placeholder="Brief title describing the issue"
              minLength={5}
              maxLength={200}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Description *
            </label>
            <textarea
              name="complaintDescription"
              value={formData.complaintDescription}
              onChange={handleChange}
              rows={5}
              placeholder="Provide detailed information about the issue..."
              minLength={10}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '120px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Attachments (Optional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf"
              style={{ display: 'none' }}
            />
            <div style={{
              border: '2px dashed #e2e8f0',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: '#fafafa'
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.background = '#f0f9ff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#fafafa';
            }}
            >
              <Upload size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px' }}>
                Click to upload or drag and drop
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                PNG, JPG, PDF up to 10MB each (max 5 files)
              </p>
            </div>
            
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {files.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <File size={20} style={{ color: '#0ea5e9' }} />
                      <div>
                        <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{file.name}</p>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={18} style={{ color: '#94a3b8' }} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => navigate('/dashboard')}
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
              Cancel
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || uploading || fetchingCategories}
              style={{
                flex: '2',
                padding: '14px',
                background: (loading || uploading) ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '600',
                fontSize: '15px',
                cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)'
              }}
            >
              {loading || uploading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {uploading ? 'Uploading files...' : 'Submitting...'}
                </span>
              ) : 'Submit Complaint'}
            </motion.button>
          </div>
        </form>
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

export default NewComplaint;
