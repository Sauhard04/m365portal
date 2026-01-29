const MEMORY_CACHE = new Map();

/**
 * multi-layered caching strategy:
 * L1: Memory (Instant)
 * L2: LocalStorage (Survives refresh)
 * L3: JSON Files (Long-term persistent storage)
 */
export const DataPersistenceService = {
    /**
     * Save data across all layers (synchronous version - only L1 and L2)
     */
    save(filename, data) {
        const cacheKey = `cache_${filename}`;
        const payload = {
            timestamp: Date.now(),
            data: data
        };

        // L1: Memory update
        MEMORY_CACHE.set(filename, payload);

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
        const cacheKey = `cache_${filename}`;

        // Try L1: Memory
        if (MEMORY_CACHE.has(filename)) {
            const payload = MEMORY_CACHE.get(filename);
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
                MEMORY_CACHE.set(filename, parsed); // Hydrate L1
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
        const payload = MEMORY_CACHE.get(filename);
        if (!payload || !payload.timestamp) return true;

        const ageInMs = Date.now() - payload.timestamp;
        const expiryInMs = minutes * 60 * 1000;
        return ageInMs > expiryInMs;
    },

    /**
     * Clear specific cache entry
     */
    clear(filename) {
        const cacheKey = `cache_${filename}`;
        MEMORY_CACHE.delete(filename);
        try {
            localStorage.removeItem(cacheKey);
        } catch (e) {
            console.warn('LocalStorage clear failed', e);
        }
    }
};

