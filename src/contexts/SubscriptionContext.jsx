import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';

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
    const [tenantId, setTenantId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Safety timeout to prevent permanent blank screen if MSAL is slow or fails to return accounts
        const timeout = setTimeout(() => {
            if (isLoading) {
                console.warn('[Subscription] Safety timeout reached, forcing isLoading to false.');
                setIsLoading(false);
            }
        }, 3000);

        if (accounts && accounts.length > 0) {
            setTenantId(accounts[0].tenantId || accounts[0].homeAccountId?.split('.')[1]);
            setIsLoading(false);
        } else if (accounts) {
            // Even if no accounts, we're not "loading" anymore
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
            'X-Tenant-Id': tenantId
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
    }, [tenantId]);

    const value = {
        tenantId,
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
