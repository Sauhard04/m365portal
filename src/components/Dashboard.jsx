import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Smartphone, Lock, CreditCard, ChevronRight, Bell, Settings, LogOut, Settings2 } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();

    const services = [
        {
            id: 'admin',
            title: 'Admin',
            description: 'Exchange mailboxes and licensing management in one place.',
            icon: Settings2,
            color: '#0078d4',
            shadowColor: 'rgba(0, 120, 212, 0.3)'
        },
        {
            id: 'entra',
            title: 'Entra',
            description: 'Identity management, conditional access, and group governance.',
            icon: ShieldCheck,
            color: '#00bcf2',
            shadowColor: 'rgba(0, 188, 242, 0.3)'
        },
        {
            id: 'intune',
            title: 'Intune',
            description: 'Device enrollment, compliance policies, and app distribution.',
            icon: Smartphone,
            color: '#5c2d91',
            shadowColor: 'rgba(92, 45, 145, 0.3)'
        },
        {
            id: 'purview',
            title: 'Purview',
            description: 'Data classification, retention policies, and eDiscovery.',
            icon: Lock,
            color: '#b4009e',
            shadowColor: 'rgba(180, 0, 158, 0.3)'
        }
    ];

    const username = localStorage.getItem('m365_user') || 'Admin';

    const handleLogout = () => {
        localStorage.removeItem('m365_user');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
            {/* Sidebar / Top Nav */}
            <nav className="glass fixed top-0 left-0 right-0 z-50 h-20 px-8 flex items-center justify-between backdrop-blur-2xl bg-black/50 border-b border-white/10 shadow-xl" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
                <div className="flex items-center space-x-4">
                    <div className="grid grid-cols-2 gap-1 p-1.5 bg-white/5 rounded-lg">
                        <div className="w-3 h-3 bg-[#f25022] rounded-sm"></div>
                        <div className="w-3 h-3 bg-[#7fba00] rounded-sm"></div>
                        <div className="w-3 h-3 bg-[#00a4ef] rounded-sm"></div>
                        <div className="w-3 h-3 bg-[#ffb900] rounded-sm"></div>
                    </div>
                    <span className="text-2xl font-bold font-['Outfit'] tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        M365 Portal
                    </span>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-4 border-l border-white/10 pl-6 ml-2">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-white">{username}</span>
                            <span className="text-xs text-gray-400">Administrator</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center font-bold text-sm uppercase shadow-lg border-2 border-blue-500/30">
                            {username.substring(0, 2)}
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <LogOut
                                className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-400 transition-colors"
                                onClick={handleLogout}
                            />
                        </motion.div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-8 md:p-12 pt-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-bold mb-3"
                    >
                        Welcome back, <span className="primary-gradient capitalize">{username}</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg leading-relaxed"
                    >
                        Here is your unified overview across all Microsoft 365 core services.
                    </motion.p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(`/service/${service.id}`)}
                            className="glass p-8 cursor-pointer group relative overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300"
                            style={{ 
                                boxShadow: `0 10px 40px -10px ${service.shadowColor}`,
                            }}
                        >
                            {/* Animated background gradient */}
                            <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ 
                                    background: `radial-gradient(circle at top right, ${service.color}15, transparent 70%)`
                                }}
                            />
                            
                            <service.icon className="absolute -right-6 -bottom-6 w-40 h-40 text-white/3 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700" />

                            <div className="relative z-10">
                                <motion.div
                                    whileHover={{ scale: 1.15, rotate: 5 }}
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${service.color}, ${service.color}dd)`,
                                    }}
                                >
                                    <service.icon className="w-7 h-7 text-white" />
                                </motion.div>

                                <h3 className="text-2xl font-bold mb-3 flex items-center justify-between group-hover:text-white transition-colors">
                                    {service.title}
                                    <motion.div
                                        initial={{ x: -10, opacity: 0 }}
                                        whileHover={{ x: 0, opacity: 1 }}
                                        transition={{ type: "spring" }}
                                    >
                                        <ChevronRight className="w-6 h-6 text-gray-400" />
                                    </motion.div>
                                </h3>

                                <p className="text-gray-400 leading-relaxed mb-6 group-hover:text-gray-300 transition-colors">
                                    {service.description}
                                </p>
                                
                                <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                                    <span>Explore</span>
                                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
