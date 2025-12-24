import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ label, value, trend, color, icon: Icon, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            className="glass stat-card glass-hover"
        >
            <div style={{ position: 'relative', zIndex: 10 }}>
                <p className="stat-label">{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <h3 className="stat-value">{value}</h3>
                    {trend && (
                        <span className={`badge ${trend.includes('+') || trend === 'Healthy' || trend === 'Active' || trend === 'Real-time'
                                ? 'badge-success'
                                : ''
                            }`} style={{ background: !(trend.includes('+') || trend === 'Healthy' || trend === 'Active' || trend === 'Real-time') ? 'rgba(255,255,255,0.05)' : '', color: !(trend.includes('+') || trend === 'Healthy' || trend === 'Active' || trend === 'Real-time') ? 'var(--text-muted)' : '' }}>
                            {trend}
                        </span>
                    )}
                </div>
            </div>

            {Icon && (
                <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.05 }}>
                    <Icon size={112} strokeWidth={0.5} />
                </div>
            )}

            {color && (
                <motion.div
                    style={{ position: 'absolute', right: '-24px', top: '-24px', width: '128px', height: '128px', borderRadius: '50%', filter: 'blur(48px)', opacity: 0.15, background: color }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </motion.div>
    );
};

export default StatsCard;
