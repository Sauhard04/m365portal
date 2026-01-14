import React, { useState, useEffect } from 'react';
import { Menu, Search, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchModal from './SearchModal';
import Logo from './Logo';

const Header = ({
    toggleSidebar,
    isSidebarOpen,
    username,
    isAuthenticated = false,
    showSidebarToggle = false
}) => {
    const navigate = useNavigate();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <header className="header-top h-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-2xl fixed top-0 left-0 w-full z-[100] px-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    {showSidebarToggle && (
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors mr-2"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    {/* Logo Section */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="flex-shrink-0">
                            <Logo size={32} />
                        </div>
                        <div className="hidden md:flex flex-col">
                            <h1 className="text-white font-semibold text-lg leading-tight">AdminSphere</h1>
                            <span className="text-blue-200/80 text-[10px] font-medium uppercase tracking-widest">Unified Portal</span>
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                {isAuthenticated && (
                    <div className="flex-1 max-w-md mx-8 hidden lg:block">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all group"
                        >
                            <Search size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                            <span className="flex-1 text-left text-sm text-gray-400 group-hover:text-white transition-colors">
                                Search...
                            </span>
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400 font-medium">
                                <Command size={10} />
                                <span>K</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* Mobile Search Button */}
                {isAuthenticated && (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                    >
                        <Search size={20} />
                    </button>
                )}

                {/* Right Section */}
                {isAuthenticated ? (
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-medium leading-none" style={{ color: '#FFFFFF' }}>{username || 'Admin User'}</p>
                                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#e2e8f0' }}>Global Admin</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-lg border border-white/20 group-hover:border-blue-400/50 transition-colors">
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

            {/* Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
};

export default Header;
