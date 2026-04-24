import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, Clock, BarChart3, Loader2, AlertTriangle, Activity } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const MetricCard = ({ icon: Icon, label, value, color, delay }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        }}
    >
        <div style={{ 
            width: '56px',
            height: '56px',
            padding: '12px', 
            borderRadius: '14px', 
            background: color.bg 
        }}>
            <Icon size={28} style={{ color: color.text }} />
        </div>
        <div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{label}</p>
            <p style={{ 
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '28px', 
                fontWeight: '700', 
                color: color.text 
            }}>{value}</p>
        </div>
    </motion.div>
);

const Analytics = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [monthly, setMonthly] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/complaints/stats/summary`, config);
            if (response.data.data) {
                setStats(response.data.data.summary);
                setMonthly(response.data.data.monthly || []);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
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

    const resolutionRate = stats?.total > 0 
        ? Math.round((stats.resolved / stats.total) * 100) 
        : 0;

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
                    Analytics
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                    View complaint statistics and trends
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <MetricCard 
                    icon={TrendingUp} 
                    label="Total Complaints" 
                    value={stats?.total || 0}
                    color={{ bg: '#dbeafe', text: '#2563eb' }}
                    delay={0}
                />
                <MetricCard 
                    icon={Clock} 
                    label="Pending" 
                    value={stats?.pending || 0}
                    color={{ bg: '#fef3c7', text: '#d97706' }}
                    delay={0.1}
                />
                <MetricCard 
                    icon={Activity} 
                    label="In Progress" 
                    value={stats?.in_progress || 0}
                    color={{ bg: '#ede9fe', text: '#7c3aed' }}
                    delay={0.2}
                />
                <MetricCard 
                    icon={CheckCircle} 
                    label="Resolution Rate" 
                    value={`${resolutionRate}%`}
                    color={{ bg: '#d1fae5', text: '#059669' }}
                    delay={0.3}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Monthly Trend */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <h3 style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: '#1e293b', 
                        marginBottom: '20px' 
                    }}>
                        Monthly Trend
                    </h3>
                    {monthly.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {monthly.slice(0, 6).map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#64748b' }}>{item.month}</span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{item.count}</span>
                                    </div>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((item.count / Math.max(...monthly.map(m => m.count), 1)) * 100, 100)}%` }}
                                            transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                                            style={{ height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #8b5cf6)', borderRadius: '4px' }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No data available yet
                        </div>
                    )}
                </motion.div>

                {/* Status Distribution */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <h3 style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: '#1e293b', 
                        marginBottom: '20px' 
                    }}>
                        Status Distribution
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { label: 'Resolved', value: stats?.resolved || 0, color: '#059669', bg: '#d1fae5' },
                            { label: 'In Progress', value: stats?.in_progress || 0, color: '#2563eb', bg: '#dbeafe' },
                            { label: 'Pending', value: stats?.pending || 0, color: '#d97706', bg: '#fef3c7' },
                            { label: 'Closed', value: stats?.closed || 0, color: '#64748b', bg: '#f1f5f9' },
                            { label: 'Rejected', value: stats?.rejected || 0, color: '#dc2626', bg: '#fee2e2' }
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: item.bg }} />
                                <div style={{ flex: '1', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '14px', color: '#64748b' }}>{item.label}</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: item.color }}>{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Analytics;
