import { useState, useEffect } from 'react';
import RuntimeConfig from '../config';

/**
 * Hook to provide the active tenant ID as reactive state.
 *
 * Listens for the 'm365_tenant_changed' custom event dispatched by
 * RuntimeConfig.setCurrentUser(). The initial value comes from
 * RuntimeConfig.getActiveTenantId() which, after initialize(), correctly
 * reflects the pending tenant (applied before MSAL boots).
 */
export const useActiveTenant = () => {
    const [activeTenantId, setActiveTenantId] = useState(RuntimeConfig.getActiveTenantId());

    useEffect(() => {
        const handleTenantChange = (e) => {
            const newId = e.detail?.tenantId || RuntimeConfig.getActiveTenantId();
            console.log(`[useActiveTenant] Tenant changed to: ${newId}`);
            setActiveTenantId(newId);
        };

        window.addEventListener('m365_tenant_changed', handleTenantChange);
        return () => window.removeEventListener('m365_tenant_changed', handleTenantChange);
    }, []);

    return activeTenantId;
};
