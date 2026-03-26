import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from "@azure/msal-browser";
import Loader3D from './Loader3D';
import RuntimeConfig from '../config';

const ProtectedRoute = () => {
    const { accounts, inProgress } = useMsal();
    console.log('[ProtectedRoute] Auth Status:', { accountCount: accounts.length, inProgress });

    // Check if authentication interaction is in progress
    // HandleRedirect is critical: it means MSAL is processing the response from Microsoft
    const isAuthenticating = inProgress !== InteractionStatus.None;
    const isProcessingRedirect = inProgress === InteractionStatus.HandleRedirect;

    if (isAuthenticating && accounts.length === 0) {
        return (
            <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-darker)' }}>
                <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '20px', padding: '40px' }}>
                    <Loader3D text={isProcessingRedirect ? "Verifying Microsoft session..." : "Restoring secure session..."} />
                </div>
            </div>
        );
    }

    const activeTenantId = RuntimeConfig.getActiveTenantId();
    const hasMatchingAccount = accounts.some(acc => acc.tenantId === activeTenantId);

    if (!hasMatchingAccount) {
        // If we are still "processing" something but have no accounts, don't redirect yet
        if (isAuthenticating) {
            return (
                <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-darker)' }}>
                    <Loader3D text="Finalizing security context..." />
                </div>
            );
        }

        console.warn(`[ProtectedRoute] No account found for active tenant: ${activeTenantId}. Redirecting to login.`);
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
