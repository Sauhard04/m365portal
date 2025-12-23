import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, Mail, ShieldCheck, Smartphone, Lock, CreditCard, 
    LogOut, Menu, Search, Settings, HelpCircle, Bell
} from 'lucide-react';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const username = localStorage.getItem('m365_user') || 'Admin';

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        localStorage.removeItem('m365_user');
        navigate('/');
    };

    const isActive = (path) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Sidebar */}
            <motion.aside 
                initial={{ width: 280 }}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="h-screen bg-black/50 backdrop-blur-2xl border-r border-white/10 flex flex-col fixed z-20 left-0 top-0 transition-all duration-300 shadow-2xl"
            >
                <div className="p-6 flex items-center justify-between h-20">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
                         <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                            <div className="w-2.5 h-2.5 bg-[#f25022] rounded-[1px]"></div>
                            <div className="w-2.5 h-2.5 bg-[#7fba00] rounded-[1px]"></div>
                            <div className="w-2.5 h-2.5 bg-[#00a4ef] rounded-[1px]"></div>
                            <div className="w-2.5 h-2.5 bg-[#ffb900] rounded-[1px]"></div>
                        </div>
                        {isSidebarOpen && (
                            <span className="font-bold text-lg font-['Outfit'] tracking-tight whitespace-nowrap">M365 Portal</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 py-6 px-3 space-y-2">
                    <SidebarItem 
                        icon={LayoutDashboard} 
                        label="Dashboard" 
                        active={isActive('/dashboard')} 
                        isOpen={isSidebarOpen} 
                        onClick={() => navigate('/dashboard')} 
                    />
                    <SidebarItem 
                        icon={Mail} 
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
                        icon={CreditCard} 
                        label="Licensing" 
                        active={isActive('/service/licensing')} 
                        isOpen={isSidebarOpen} 
                        onClick={() => navigate('/service/licensing')} 
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
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'}`}
            >
                {/* Top Header */}
                <header 
                    className="h-20 border-b border-white/10 bg-black/50 backdrop-blur-2xl fixed top-0 z-30 px-8 flex items-center justify-between shadow-lg transition-all duration-300" 
                    style={{ 
                        left: isSidebarOpen ? '280px' : '80px',
                        right: '0'
                    }}
                >
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                        <h2 className="text-sm font-medium text-gray-400">
                           {location.pathname === '/dashboard' ? 'Overview' : location.pathname.split('/')[2]?.charAt(0).toUpperCase() + location.pathname.split('/')[2]?.slice(1) || 'Service'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative hidden md:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search resources..." 
                                className="bg-white/5 border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        
                        <button className="p-2 hover:bg-white/5 rounded-full text-gray-400 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#050505]"></span>
                        </button>

                        <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center font-bold text-xs">
                                {username.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 md:p-12 max-w-7xl mx-auto w-full pt-28">
                    {children}
                </main>
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

export default Layout;
