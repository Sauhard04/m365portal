import RuntimeConfig from '../config';

const MEMORY_CACHE = new Map();

/**
 * multi-layered caching strategy:
 * L1: Memory (Instant)
 * L2: LocalStorage (Survives refresh)
 * L3: JSON Files (Long-term persistent storage)
 */
export const DataPersistenceService = {
    /**
     * Helper to get tenant-aware cache key
     */
    getCacheKey(filename) {
        const tenantId = RuntimeConfig.getActiveTenantId() || 'global';
        return `${tenantId}_cache_${filename}`;
    },

    /**
     * Save data across all layers (synchronous version - only L1 and L2)
     */
    save(filename, data) {
        const cacheKey = this.getCacheKey(filename);
        const memKey = `${RuntimeConfig.getActiveTenantId() || 'global'}_${filename}`;

        const payload = {
            timestamp: Date.now(),
            data: data
        };

        // L1: Memory update
        MEMORY_CACHE.set(memKey, payload);

        // L2: LocalStorage update
        try {
            localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('LocalStorage save failed', e);
        }

        return data;
    },

    /**
     * Load data synchronously from L1/L2 with optional expiry check
     * @param {string} filename - Cache key
     * @param {number} maxAgeMs - Optional max age in milliseconds
     */
    load(filename, maxAgeMs = null) {
        const cacheKey = this.getCacheKey(filename);
        const memKey = `${RuntimeConfig.getActiveTenantId() || 'global'}_${filename}`;

        // Try L1: Memory
        if (MEMORY_CACHE.has(memKey)) {
            const payload = MEMORY_CACHE.get(memKey);
            if (maxAgeMs && payload.timestamp) {
                if (Date.now() - payload.timestamp > maxAgeMs) {
                    return null; // Expired
                }
            }
            return payload.data;
        }

        // Try L2: LocalStorage
        try {
            const local = localStorage.getItem(cacheKey);
            if (local) {
                const parsed = JSON.parse(local);
                if (maxAgeMs && parsed.timestamp) {
                    if (Date.now() - parsed.timestamp > maxAgeMs) {
                        return null; // Expired
                    }
                }
                MEMORY_CACHE.set(memKey, parsed); // Hydrate L1
                return parsed.data;
            }
        } catch (e) {
            console.warn('LocalStorage load failed', e);
        }

        return null;
    },

    /**
     * Check if the cache is older than specified minutes
     */
    isExpired(filename, minutes = 30) {
        const memKey = `${RuntimeConfig.getActiveTenantId() || 'global'}_${filename}`;
        const payload = MEMORY_CACHE.get(memKey);
        if (!payload || !payload.timestamp) return true;

        const ageInMs = Date.now() - payload.timestamp;
        const expiryInMs = minutes * 60 * 1000;
        return ageInMs > expiryInMs;
    },

    /**
     * Clear specific cache entry
     */
    clear(filename) {
        const cacheKey = this.getCacheKey(filename);
        const memKey = `${RuntimeConfig.getActiveTenantId() || 'global'}_${filename}`;
        MEMORY_CACHE.delete(memKey);
        try {
            localStorage.removeItem(cacheKey);
        } catch (e) {
            console.warn('LocalStorage clear failed', e);
        }
    }
};

