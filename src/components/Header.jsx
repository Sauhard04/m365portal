import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = ({
    toggleSidebar,
    isSidebarOpen,
    username,
    isAuthenticated = false,
    showSidebarToggle = false
}) => {
    const navigate = useNavigate();

    return (
        <header className="h-20 border-b border-white/10 bg-black/50 backdrop-blur-2xl fixed top-0 left-0 w-full z-[100] px-6 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
                {showSidebarToggle && (
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors mr-2"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}

                {/* Logo Section */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="grid grid-cols-2 gap-1 flex-shrink-0 p-1.5 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-2.5 h-2.5 bg-[#f25022] rounded-[1px]"></div>
                        <div className="w-2.5 h-2.5 bg-[#7fba00] rounded-[1px]"></div>
                        <div className="w-2.5 h-2.5 bg-[#00a4ef] rounded-[1px]"></div>
                        <div className="w-2.5 h-2.5 bg-[#ffb900] rounded-[1px]"></div>
                    </div>
                    <span className="font-bold text-xl font-['Outfit'] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        M365 Portal
                    </span>
                </div>
            </div>

            {/* Right Section */}
            {isAuthenticated ? (
                <div className="flex items-center gap-6">


                    <button className="p-2 hover:bg-white/5 rounded-full text-gray-400 relative transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#050505]"></span>
                    </button>

                    <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center font-bold text-xs text-white shadow-lg">
                            {username ? username.substring(0, 2).toUpperCase() : 'AD'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center">
                    {/* Placeholder for unauthenticated header content if needed */}
                </div>
            )}
        </header>
    );
};

export default Header;
