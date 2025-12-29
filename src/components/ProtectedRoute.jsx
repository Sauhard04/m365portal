import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from "@azure/msal-browser";
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
    const { accounts, inProgress } = useMsal();

    // Check if authentication interaction is in progress
    if (inProgress !== InteractionStatus.None && accounts.length === 0) {
        return (
            <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-darker)' }}>
                <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '20px', padding: '40px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Restoring secure session...</p>
                </div>
            </div>
        );
    }

    const isAuthenticated = accounts.length > 0;

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
