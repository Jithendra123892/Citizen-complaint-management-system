import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Building2, Phone, Mail, Users, Loader2, ChevronRight, Award } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const DepartmentCard = ({ dept, index }) => {
    const colors = [
        { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', icon: '🏗️' },
        { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: '💧' },
        { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '⚡' },
        { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', icon: '🗑️' },
        { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: '🚗' },
    ];
    const color = colors[index % colors.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: color.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}>
                    {color.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '18px', 
                        fontWeight: '700', 
                        color: '#1e293b',
                        marginBottom: '4px'
                    }}>
                        {dept.department_name}
                    </h3>
                    {dept.department_head && (
                        <p style={{ fontSize: '13px', color: '#64748b' }}>
                            Head: {dept.department_head}
                        </p>
                    )}
                </div>
                <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    background: '#d1fae5', 
                    color: '#059669' 
                }}>
                    Active
                </span>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
            }}>
                {dept.contact_number ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={16} style={{ color: '#0ea5e9' }} />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{dept.contact_number}</span>
                    </div>
                ) : (
                    <div />
                )}
                {dept.email ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={16} style={{ color: '#0ea5e9' }} />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{dept.email?.split('@')[0]}</span>
                    </div>
                ) : (
                    <div />
                )}
            </div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
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
                View Officers <ChevronRight size={16} />
            </motion.button>
        </motion.div>
    );
};

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${API_URL}/departments`);
            if (response.data.data?.departments) {
                setDepartments(response.data.data.departments);
            }
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    Departments
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    View all municipal departments and their contact information
                </p>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                gap: '20px' 
            }}>
                {departments.map((dept, index) => (
                    <DepartmentCard key={dept.department_id} dept={dept} index={index} />
                ))}
            </div>
        </motion.div>
    );
};

export default Departments;
