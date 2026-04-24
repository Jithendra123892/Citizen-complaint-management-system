import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Building2, Users, CheckCircle, Clock, Loader2, Phone, Mail, Award, MapPin } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Officers = () => {
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOfficers();
    }, []);

    const fetchOfficers = async () => {
        try {
            const response = await axios.get(`${API_URL}/officers`);
            if (response.data.data?.officers) {
                setOfficers(response.data.data.officers);
            }
        } catch (error) {
            console.error('Failed to fetch officers:', error);
        } finally {
            setLoading(false);
        }
    };

    const officerColors = [
        'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    ];

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
                    Officers
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    Meet our dedicated team handling citizen complaints
                </p>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '20px' 
            }}>
                {officers.length > 0 ? officers.map((officer, index) => (
                    <motion.div
                        key={officer.officer_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '28px',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ 
                            width: '88px', 
                            height: '88px', 
                            borderRadius: '50%', 
                            background: officerColors[index % officerColors.length],
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 20px', 
                            color: 'white', 
                            fontSize: '32px', 
                            fontWeight: '600',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
                        }}>
                            {officer.officer_name?.charAt(0) || 'O'}
                        </div>
                        
                        <h3 style={{ 
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '20px', 
                            fontWeight: '700', 
                            color: '#1e293b', 
                            marginBottom: '4px' 
                        }}>
                            {officer.officer_name}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                            {officer.designation || 'Officer'}
                        </p>
                        
                        <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '6px 14px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            background: '#d1fae5', 
                            color: '#059669',
                            marginBottom: '20px'
                        }}>
                            <CheckCircle size={14} />
                            Active
                        </div>

                        {officer.department_name && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px', 
                                paddingTop: '16px', 
                                borderTop: '1px solid #f1f5f9',
                                marginTop: '8px'
                            }}>
                                <Building2 size={16} style={{ color: '#0ea5e9' }} />
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                                    {officer.department_name}
                                </span>
                            </div>
                        )}

                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '10px',
                            marginTop: '16px'
                        }}>
                            {officer.contact_number && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '6px',
                                    padding: '8px',
                                    background: '#f8fafc',
                                    borderRadius: '8px'
                                }}>
                                    <Phone size={14} style={{ color: '#0ea5e9' }} />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {officer.contact_number}
                                    </span>
                                </div>
                            )}
                            {officer.email && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '6px',
                                    padding: '8px',
                                    background: '#f8fafc',
                                    borderRadius: '8px'
                                }}>
                                    <Mail size={14} style={{ color: '#0ea5e9' }} />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {officer.email?.split('@')[0]}
                                    </span>
                                </div>
                            )}
                        </div>

                                {officer.badge_number && (
                            <div style={{ 
                                marginTop: '12px',
                                padding: '6px 10px',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                display: 'inline-block'
                            }}>
                                <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '600' }}>
                                    Badge: {officer.badge_number}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )) : (
                    <div style={{ 
                        gridColumn: '1 / -1',
                        textAlign: 'center', 
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <Users size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                        <p style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                            No officers found
                        </p>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>
                            There are no officers registered yet.
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Officers;
