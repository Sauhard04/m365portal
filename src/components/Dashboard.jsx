import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Smartphone, Lock, CreditCard, ChevronRight, Bell, Settings, LogOut } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();

    const services = [
        {
            id: 'exchange',
            title: 'Exchange',
            description: 'Manage mailboxes, transport rules, and hybrid configuration.',
            icon: Mail,
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
        },
        {
            id: 'licensing',
            title: 'Licensing',
            description: 'Subscription tracking, license assignment, and usage analytics.',
            icon: CreditCard,
            color: '#107c10',
            shadowColor: 'rgba(16, 124, 16, 0.3)'
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
            <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
                <div className="flex items-center space-x-3">
                    <div className="grid grid-cols-2 gap-1" style={{ transform: 'scale(0.75)' }}>
                        <div className="w-3 h-3 bg-[#f25022]"></div>
                        <div className="w-3 h-3 bg-[#7fba00]"></div>
                        <div className="w-3 h-3 bg-[#00a4ef]"></div>
                        <div className="w-3 h-3 bg-[#ffb900]"></div>
                    </div>
                    <span className="text-xl font-bold font-['Outfit'] tracking-tight">M365 Portal</span>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex relative items-center">
                        <input
                            type="text"
                            placeholder="Search services..."
                            className="rounded-full py-2.5 px-6 text-sm focus:outline-none bg-white/5 border border-white/10 w-64 focus:w-80 transition-all"
                        />
                    </div>
                    <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
                    <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
                    <div className="flex items-center space-x-3 border-l border-white/10 pl-6 ml-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm uppercase">
                            {username.substring(0, 2)}
                        </div>
                        <LogOut
                            className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-400 transition-colors"
                            onClick={handleLogout}
                        />
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-8 md:p-12">
                <div className="mb-12">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold mb-4"
                    >
                        Welcome back, <span className="primary-gradient capitalize">{username}</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg"
                    >
                        Here is your unified overview across all Microsoft 365 core services.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(`/service/${service.id}`)}
                            className="glass service-card p-8 cursor-pointer group"
                            style={{ boxShadow: `0 10px 30px - 10px ${service.shadowColor} ` }}
                        >
                            <service.icon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />

                            <div className="relative z-10">
                                <div className="icon-box group-hover:scale-110 transition-transform" style={{ background: service.color }}>
                                    <service.icon className="w-8 h-8 text-white" />
                                </div>

                                <h3 className="text-2xl font-bold mb-3 flex items-center justify-between">
                                    {service.title}
                                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </h3>

                                <p className="text-gray-400 leading-relaxed mb-6">
                                    {service.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
