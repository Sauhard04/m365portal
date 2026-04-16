import { useState, useEffect, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { useToken } from './useToken';
import { useActiveTenant } from './useActiveTenant';
import { DataPersistenceService } from '../services/dataPersistence';
import { loginRequest } from '../authConfig';

/**
 * SKU part-number keyword sets for licence detection.
 * A tenant is considered to have a capability if ANY of its active SKUs
 * contain one of these keywords (case-insensitive substring match).
 */
const SKU_MAP = {
    hasP2: ['AAD_PREMIUM_P2', 'EMSPREMIUM', 'M365_E5', 'SPE_E5', 'IDENTITY_PROTECTION'],
    hasIntune: ['INTUNE_A', 'EMS', 'EMSPREMIUM', 'M365_E3', 'M365_E5', 'SPE_E3', 'SPE_E5', 'MDMCOSTPERROW'],
    hasDefender: ['DEFENDER_ENDPOINT_P1', 'DEFENDER_ENDPOINT_P2', 'DEFENDER_FOR_ENDPOINT', 'M365_E5', 'SPE_E5', 'MDATP'],
    hasPurview: ['INFORMATION_PROTECTION_COMPLIANCE', 'M365_E5', 'SPE_E5', 'AIP_PREMIUM', 'PURVIEW'],
};

const CACHE_KEY = 'tenant_capabilities_v1';
const CACHE_MAX_AGE_MINUTES = 60;

/**
 * Returns an object describing which premium features are available in the active tenant.
 *
 * {
 *   hasP2: boolean,       // Azure AD P2 — required for Identity Protection (riskyUsers, riskDetections)
 *   hasIntune: boolean,   // Microsoft Intune — required for managed device data
 *   hasDefender: boolean, // Microsoft Defender for Endpoint
 *   hasPurview: boolean,  // Microsoft Purview / Compliance
 *   loading: boolean,
 *   error: string | null
 * }
 *
 * Returns all-true during loading so guarded UI shows data optimistically.
 */
export const useTenantCapabilities = () => {
    const { accounts } = useMsal();
    const { getAccessToken } = useToken();
    const activeTenantId = useActiveTenant();
    const fetchedRef = useRef(false);

    const [capabilities, setCapabilities] = useState({
        hasP2: true,
        hasIntune: true,
        hasDefender: true,
        hasPurview: true,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (accounts.length === 0 || !activeTenantId) return;

        // Check cache first
        const cacheKey = `${activeTenantId}_${CACHE_KEY}`;
        const cached = DataPersistenceService.load(cacheKey);
        if (cached && !DataPersistenceService.isExpired(cacheKey, CACHE_MAX_AGE_MINUTES)) {
            setCapabilities({ ...cached, loading: false, error: null });
            return;
        }

        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const detect = async () => {
            try {
                const token = await getAccessToken(loginRequest);
                const res = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuPartNumber,capabilityStatus', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    console.warn(`[useTenantCapabilities] Failed to fetch SKUs: HTTP ${res.status}`);
                    // Default to all-available on failure — don't block the UI
                    setCapabilities({ hasP2: true, hasIntune: true, hasDefender: true, hasPurview: true, loading: false, error: null });
                    return;
                }

                const json = await res.json();
                const skus = (json.value || [])
                    .filter(s => s.capabilityStatus === 'Enabled')
                    .map(s => (s.skuPartNumber || '').toUpperCase());

                const result = {};
                for (const [cap, keywords] of Object.entries(SKU_MAP)) {
                    result[cap] = skus.some(sku => keywords.some(kw => sku.includes(kw)));
                }

                console.info('[useTenantCapabilities] Detected:', result);
                DataPersistenceService.save(cacheKey, result);
                setCapabilities({ ...result, loading: false, error: null });

            } catch (err) {
                console.warn('[useTenantCapabilities] SKU fetch failed, defaulting all-available:', err.message);
                setCapabilities({ hasP2: true, hasIntune: true, hasDefender: true, hasPurview: true, loading: false, error: null });
            }
        };

        detect();
    }, [activeTenantId, accounts.length]);

    return capabilities;
};
