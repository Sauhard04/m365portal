import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ShieldCheck, Smartphone, Lock,
    LogOut, LayoutDashboard
} from 'lucide-react';
import Header from './Header';

const ServiceLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const username = localStorage.getItem('m365_user') || 'Admin';

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        localStorage.removeItem('m365_user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header
                toggleSidebar={toggleSidebar}
                isSidebarOpen={isSidebarOpen}
                username={username}
                isAuthenticated={true}
                showSidebarToggle={true}
            />

            <div className="flex pt-20 min-h-screen">
                {/* Sidebar */}
                <motion.aside
                    initial={{ width: 280 }}
                    animate={{ width: isSidebarOpen ? 280 : 80 }}
                    className="fixed left-0 top-20 bottom-0 bg-black/50 backdrop-blur-2xl border-r border-white/10 flex flex-col z-40 transition-all duration-300 shadow-2xl"
                >
                    <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Admin"
                            active={isActive('/service/admin')}
                            isOpen={isSidebarOpen}
                            onClick={() => navigate('/service/admin')}
                        />
                        <SidebarItem
                            icon={ShieldCheck}
                            label="Entra ID"
                            active={isActive('/service/entra')}
                            isOpen={isSidebarOpen}
                            onClick={() => navigate('/service/entra')}
                        />
                        <SidebarItem
                            icon={Smartphone}
                            label="Intune"
                            active={isActive('/service/intune')}
                            isOpen={isSidebarOpen}
                            onClick={() => navigate('/service/intune')}
                        />
                        <SidebarItem
                            icon={Lock}
                            label="Purview"
                            active={isActive('/service/purview')}
                            isOpen={isSidebarOpen}
                            onClick={() => navigate('/service/purview')}
                        />
                    </div>

                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-gray-400 w-full transition-colors ${!isSidebarOpen && 'justify-center'}`}
                        >
                            <LogOut className="w-5 h-5" />
                            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
                        </button>
                    </div>
                </motion.aside>

                {/* Main Content */}
                <div
                    className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'}`}
                >
                    <main className="p-8 md:p-12 max-w-7xl mx-auto w-full">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, isOpen, onClick }) => (
    <motion.div
        onClick={onClick}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className={`
            flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200 group relative
            ${active ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500' : 'text-gray-400 hover:bg-white/8 hover:text-white'}
            ${!isOpen && 'justify-center'}
        `}
    >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-400' : 'group-hover:text-white transition-colors'}`} />
        {isOpen && <span className="font-semibold text-sm">{label}</span>}

        {active && (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-blue-500 to-blue-400 rounded-l-full ${!isOpen && 'hidden'}`}
            />
        )}
    </motion.div>
);

export default ServiceLayout;
