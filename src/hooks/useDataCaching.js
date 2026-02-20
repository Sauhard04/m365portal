import { useState, useEffect, useCallback, useRef } from 'react';
import { DataPersistenceService } from '../services/dataPersistence';
import SiteDataStore from '../services/siteDataStore';
import RuntimeConfig from '../config';
import { useActiveTenant } from './useActiveTenant';

/**
 * Standardized hook for data caching and background revalidation.
 * 
 * @param {string} baseCacheKey - Unique key for the cache (e.g. 'overview_data')
 * @param {Function} fetchFn - Async function to fetch fresh data
 * @param {Object} options - Configuration options
 * @param {number} options.maxAge - Max age in minutes before data is considered stale (default 30)
 * @param {string} options.storeSection - If provided, also saves to SiteDataStore with this section key
 * @param {Object} options.storeMetadata - Metadata to pass to SiteDataStore
 * @param {Array} options.dependencies - Dependency array for the effect (default [])
 * @param {boolean} options.enabled - Whether to enable fetching (default true)
 */
export const useDataCaching = (baseCacheKey, fetchFn, options = {}) => {
    const {
        maxAge = 30,
        storeSection = null,
        storeMetadata = {},
        dependencies = [],
        enabled = true
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRequestRef = useRef(0);
    const activeTenantId = useActiveTenant();
    const cacheKey = `${activeTenantId}_${baseCacheKey}`;

    const performFetch = useCallback(async (isManual = false) => {
        const requestId = ++fetchRequestRef.current;

        if (isManual) setRefreshing(true);
        else if (!data) setLoading(true);

        setError(null);

        try {
            const freshData = await fetchFn();

            // Avoid race conditions: only update if this is still the latest request
            if (requestId !== fetchRequestRef.current) return;

            setData(freshData);
            setLastUpdated(Date.now());

            // Update Caches
            DataPersistenceService.save(cacheKey, freshData);

            if (storeSection) {
                SiteDataStore.store(storeSection, freshData, {
                    ...storeMetadata,
                    timestamp: Date.now()
                });
            }

            return freshData;
        } catch (err) {
            console.error(`[useDataCaching] Error fetching for ${cacheKey}:`, err);
            if (requestId === fetchRequestRef.current) {
                setError(err.message || 'Failed to fetch fresh data');
                // If we have stale data, we keep it but log the error
            }
        } finally {
            if (requestId === fetchRequestRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [cacheKey, fetchFn, storeSection, storeMetadata, data]);

    const loadFromCache = useCallback(() => {
        const cached = DataPersistenceService.load(cacheKey);
        if (cached) {
            setData(cached);
            setLoading(false);

            // Check if expired
            if (DataPersistenceService.isExpired(cacheKey, maxAge)) {
                performFetch(false);
            }
        } else if (enabled) {
            performFetch(false);
        }
    }, [cacheKey, maxAge, performFetch, enabled]);

    useEffect(() => {
        if (enabled) {
            loadFromCache();
        }
    }, [enabled, ...dependencies, activeTenantId]);

    return {
        data,
        loading,
        refreshing,
        error,
        lastUpdated,
        refetch: () => performFetch(true),
        setData // Allow manual overrides if needed
    };
};
