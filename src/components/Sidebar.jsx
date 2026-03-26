import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ShieldCheck, Smartphone, Lock,
    LayoutDashboard, Radar, Activity, LifeBuoy,
    Building2
} from 'lucide-react';
import TenantSelector from './TenantSelector';

const Sidebar = ({ isSidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <motion.aside
            initial={{ width: 260 }}
            animate={{ width: isSidebarOpen ? 260 : 80 }}
            className="fixed left-0 top-16 bottom-0 bg-enterprise-gradient border-r border-white/5 flex flex-col z-[80] transition-all duration-300 select-none shadow-xl"
        >
            {/* Navigation Content */}
            <div className="flex-1 py-6 px-4 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Tenant Selector */}
                {isSidebarOpen && (
                    <div className="px-3 mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                            Environment
                        </p>
                        <TenantSelector />
                    </div>
                )}

                {/* Section: Management */}
                <div className="space-y-1">
                    {isSidebarOpen && (
                        <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                            Management
                        </h3>
                    )}
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Admin Center"
                        active={isActive('/service/admin')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin')}
                    />
                    <SidebarItem
                        icon={Activity}
                        label="User Activity"
                        active={isActive('/service/admin/user-activity')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin/user-activity')}
                    />
                </div>


                {/* Section: Governance */}
                <div className="space-y-1">
                    {isSidebarOpen && (
                        <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                            Governance & Identity
                        </h3>
                    )}
                    <SidebarItem
                        icon={ShieldCheck}
                        label="Entra ID"
                        active={isActive('/service/entra')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/entra')}
                    />
                    <SidebarItem
                        icon={Lock}
                        label="Purview"
                        active={isActive('/service/purview')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/purview')}
                    />
                </div>

                {/* Section: Security */}
                <div className="space-y-1">
                    {isSidebarOpen && (
                        <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                            Security
                        </h3>
                    )}
                    <SidebarItem
                        icon={Radar}
                        label="Explorer"
                        active={isActive('/service/security/explorer')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/security/explorer')}
                    />
                </div>

                {/* Section: Devices */}
                <div className="space-y-1">
                    {isSidebarOpen && (
                        <h3 className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-4">
                            Devices
                        </h3>
                    )}
                    <SidebarItem
                        icon={Smartphone}
                        label="Intune"
                        active={isActive('/service/intune')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/intune')}
                    />
                </div>
            </div>

            {/* Support Section - Separator and Button */}
            <div className="mt-auto p-4 border-t border-white/10 space-y-1">
                <SidebarItem
                    icon={Building2}
                    label="Manage Tenants"
                    active={isActive('/service/tenants')}
                    isOpen={isSidebarOpen}
                    onClick={() => navigate('/service/tenants')}
                />
                <SidebarItem
                    icon={LifeBuoy}
                    label="Get Support"
                    active={isActive('/service/support')}
                    isOpen={isSidebarOpen}
                    onClick={() => navigate('/service/support')}
                />
            </div>

            {/* Bottom Accent */}
            <div className="p-4 opacity-20 pointer-events-none">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
        </motion.aside >
    );
};

const SidebarItem = ({ icon: Icon, label, active, isOpen, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3.5 py-2 px-3 relative group transition-all duration-200 rounded-lg
                ${!isOpen && 'justify-center'}
                ${active ? 'bg-[#0078D4]/10' : 'hover:bg-white/[0.03]'}
            `}
        >
            {/* Active Indication Bar (Microsoft Style) */}
            {active && (
                <div className="absolute left-[-4px] top-2 bottom-2 w-1.5 bg-[#0078D4] rounded-full shadow-[0_0_12px_rgba(0,120,212,0.4)]" />
            )}

            <Icon
                strokeWidth={active ? 2 : 1.5}
                className={`
                    w-5 h-5 transition-all duration-200 
                    ${active ? 'text-[#0078D4] scale-110' : 'text-gray-400 group-hover:text-gray-200'}
                `}
            />

            {isOpen && (
                <span className={`
                    text-[13px] font-medium transition-colors duration-200 whitespace-nowrap
                    ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}
                `}>
                    {label}
                </span>
            )}

            {/* Tooltip for collapsed state */}
            {!isOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-[#1c222d] border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[100] whitespace-nowrap shadow-xl">
                    {label}
                </div>
            )}
        </button>
    );
};

export default Sidebar;
