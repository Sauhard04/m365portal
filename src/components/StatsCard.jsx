import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ label, value, trend, color, icon: Icon, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            className="glass p-7 relative overflow-hidden group cursor-default"
        >
            <div className="relative z-10">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">{label}</p>
                <div className="flex items-baseline gap-3">
                    <h3 className="text-4xl font-bold font-display text-white tracking-tight">{value}</h3>
                    {trend && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            trend.includes('+') || trend === 'Healthy' || trend === 'Active' || trend === 'Real-time'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-white/10 text-gray-400 border border-white/10'
                        }`}>
                            {trend}
                        </span>
                    )}
                </div>
            </div>
            
            {Icon && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/4 group-hover:text-white/8 transition-all duration-500 group-hover:scale-110">
                    <Icon className="w-28 h-28 stroke-[0.5]" />
                </div>
            )}
            
            {color && (
                <motion.div 
                    className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-15 group-hover:opacity-25 transition-opacity duration-500"
                    style={{ background: color }}
                    animate={{
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}
        </motion.div>
    );
};

export default StatsCard;
