import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { useActiveTenant } from '../hooks/useActiveTenant';

const SubscriptionContext = createContext();

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const { accounts = [] } = useMsal() || {};
    const [isExpired, setIsExpired] = useState(false);
    const activeTenantId = useActiveTenant();
    const [isLoading, setIsLoading] = useState(true);

    // Reset expired state when tenant changes to allow re-evaluation
    useEffect(() => {
        setIsExpired(false);
    }, [activeTenantId]);

    useEffect(() => {
        // Safety timeout to prevent permanent blank screen if MSAL is slow or fails to return accounts
        const timeout = setTimeout(() => {
            if (isLoading) {
                console.warn('[Subscription] Safety timeout reached, forcing isLoading to false.');
                setIsLoading(false);
            }
        }, 3000);

        if (isLoading && accounts && accounts.length > 0) {
            setIsLoading(false);
        } else if (isLoading && accounts) {
            setIsLoading(false);
        }

        return () => clearTimeout(timeout);
    }, [accounts, isLoading]);

    /**
     * Enhanced fetch that adds Tenant ID and handles 402 errors
     */
    const secureFetch = useCallback(async (url, options = {}) => {
        const headers = {
            ...options.headers,
            'X-Tenant-Id': activeTenantId
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 402) {
                console.warn('[Subscription] Trial expired or payment required.');
                setIsExpired(true);
            }

            return response;
        } catch (error) {
            console.error('[Subscription] Fetch error:', error);
            throw error;
        }
    }, [activeTenantId]);

    const value = {
        tenantId: activeTenantId,
        isExpired,
        setIsExpired,
        isLoading,
        secureFetch
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};
