// In-memory cache for quick access
let memoryCache = null;
let initPromise = null;

/**
 * Initialize or load the data store
 */
export async function ensureInitialized(tenantId = null) {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (!memoryCache) {
            initStore();
        }
        await syncWithServer(tenantId);
        return memoryCache;
    })();

    return initPromise;
}

function initStore() {
    if (memoryCache) return memoryCache;

    try {
        const stored = localStorage.getItem('m365_sitedata');
        if (stored) {
            memoryCache = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load SiteDataStore from localStorage', e);
    }

    if (!memoryCache) {
        memoryCache = {
            lastUpdated: null,
            sections: {}
        };
    }

    return memoryCache;
}

/**
 * Sync with server-side sitedata.json
 */
async function syncWithServer(tenantId = null) {
    try {
        const headers = {};
        if (tenantId) headers['X-Tenant-Id'] = tenantId;

        const response = await fetch('/api/data/sitedata', { headers });
        if (response.ok) {
            const serverData = await response.json();
            if (serverData && serverData.sections) {
                const local = initStore();

                // Merge strategy: Server wins for older data, but we keep newest timestamps
                Object.keys(serverData.sections).forEach(key => {
                    const serverSection = serverData.sections[key];
                    const localSection = local.sections[key];

                    if (!localSection || serverSection.timestamp > localSection.timestamp) {
                        local.sections[key] = serverSection;
                    }
                });

                local.lastUpdated = Math.max(local.lastUpdated || 0, serverData.lastUpdated || 0);
                saveLocally();
                console.log('[SiteDataStore] Synced with server successfully');
            }
        }
    } catch (error) {
        console.warn('[SiteDataStore] Background server sync failed:', error);
    }
}

function saveLocally() {
    if (!memoryCache) return;
    try {
        localStorage.setItem('m365_sitedata', JSON.stringify(memoryCache));
    } catch (e) {
        console.warn('Failed to save SiteDataStore to localStorage', e);
    }
}

const persistToServer = async (sectionKey = null, sectionData = null, tenantId = null) => {
    try {
        let payload;
        if (sectionKey && sectionData) {
            // Partial update: only send the changed section
            payload = {
                sectionKey,
                sectionData,
                tenantId // Also send in body as fallback
            };
        } else {
            // Fallback: send everything if no specific section is provided
            if (!memoryCache) return;
            payload = { ...memoryCache, tenantId };
        }

        const headers = { 'Content-Type': 'application/json' };
        if (tenantId) headers['X-Tenant-Id'] = tenantId;

        const response = await fetch('/api/data/sitedata', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server rejected storage: ${errorText}`);
        }
        console.log(`[SiteDataStore] Successfully persisted${sectionKey ? ` section '${sectionKey}'` : ''} to server`);
    } catch (error) {
        console.error('[SiteDataStore] Failed to persist to server:', error.message);
    }
};

/**
 * Store data for a specific section
 * @param {string} sectionKey - Unique key for the data (e.g., 'users', 'devices')
 * @param {any} data - The data to store
 * @param {object} metadata - Optional metadata (source, period, etc.)
 */
export function store(sectionKey, data, metadata = {}, tenantId = null) {
    const store = initStore();

    const section = {
        data,
        timestamp: Date.now(),
        ...metadata
    };

    store.sections[sectionKey] = section;
    store.lastUpdated = Date.now();
    saveLocally();

    // Asynchronously persist ONLY this section to server to avoid 413 (Payload Too Large)
    persistToServer(sectionKey, section, tenantId);
}

/**
 * Get data for a section
 * @param {string} sectionKey 
 * @returns {any|null}
 */
export function get(sectionKey) {
    const store = initStore();
    return store.sections[sectionKey]?.data || null;
}

/**
 * Get all stored data
 */
export function getAll() {
    return initStore();
}

/**
 * Check if a section's data is fresh (within a time limit)
 * @param {string} sectionKey 
 * @param {number} maxAgeMs - Default 1 hour
 */
export function isFresh(sectionKey, maxAgeMs = 3600000) {
    const store = initStore();
    const section = store.sections[sectionKey];
    if (!section) return false;

    return (Date.now() - section.timestamp) < maxAgeMs;
}

/**
 * Clear a specific section
 */
export function clear(sectionKey) {
    const store = initStore();
    delete store.sections[sectionKey];
    saveLocally();
    persistToServer();
}

/**
 * Clear all data
 */
export function clearAll() {
    memoryCache = {
        lastUpdated: Date.now(),
        sections: {}
    };
    saveLocally();
    persistToServer();
}

/**
 * Generate an exhaustive, elaborated text summary for AI consumption.
 * This function now dynamically processes EVERY section in the store to ensure complete "education" of the chatbot.
 */
export function getAISummary() {
    const { sections, lastUpdated } = initStore();
    const summary = [];

    summary.push(`=== [MASTER M365 INTELLIGENCE REPOSITORY] ===`);
    summary.push(`Global Synchronization Time: ${new Date(lastUpdated || Date.now()).toLocaleString()}`);
    summary.push(`Total Data Modules Loaded: ${Object.keys(sections).length}`);

    const store = initStore();
    if (store.navigationHistory?.length > 0) {
        summary.push(`- Navigation History: ${store.navigationHistory.map(n => n.title).join(' -> ')}`);
    }
    summary.push('');

    // Sort keys to provide consistent output
    const keys = Object.keys(sections).sort();

    keys.forEach(key => {
        const section = sections[key];
        const data = section.data;
        if (!data) return;

        summary.push(`## MODULE: ${key.toUpperCase()}`);
        summary.push(`- Source: ${section.source || 'Direct API'}`);
        summary.push(`- Last Verified: ${new Date(section.timestamp).toLocaleTimeString()}`);

        // Handle specific data structures with elaborated logic
        if (key === 'overview' || key === 'birdsEye') {
            processElaboratedObject(data, summary, 1);
        } else if (Array.isArray(data)) {
            // Elaborate on lists
            summary.push(`- Content Type: List/Collection`);
            summary.push(`- Total Entry Count: ${data.length}`);
            if (data.length > 0) {
                // Peek at the first few items
                const sampleSize = 5;
                summary.push(`- Primary Records (First ${sampleSize}):`);
                data.slice(0, sampleSize).forEach((item, idx) => {
                    const identifier = item.displayName || item.name || item.id || item.title || `Record ${idx + 1}`;
                    const details = [];
                    if (item.userPrincipalName) details.push(`UPN: ${item.userPrincipalName}`);
                    if (item.status) details.push(`Status: ${item.status}`);
                    if (item.severity) details.push(`Severity: ${item.severity}`);
                    if (item.category) details.push(`Category: ${item.category}`);

                    summary.push(`  * ${identifier} ${details.length > 0 ? `(${details.join(', ')})` : ''}`);
                });
            }
        } else if (typeof data === 'object') {
            // Elaborate on complex objects
            processElaboratedObject(data, summary, 1);
        } else {
            // Primitive values
            summary.push(`- Value: ${data}`);
        }

        summary.push(''); // Spacer between modules
    });

    summary.push(`=== [END OF INTELLIGENCE FEED] ===`);
    summary.push(`Instruction to AI: Use the data above to provide highly detailed, context-aware, and elaborated responses. If a user asks for a summary, don't just give numbers—explain what they mean in terms of M365 health, security, and utilization.`);

    return summary.join('\n');
}

/**
 * Recursively processes an object to create an elaborated, nested summary
 */
function processElaboratedObject(obj, summary, depth) {
    const indent = '  '.repeat(depth);

    // Safety check to avoid infinite recursion or giant objects
    if (depth > 4) return;

    Object.entries(obj).forEach(([key, value]) => {
        // Skip large raw data arrays within objects to keep summary manageable but informative
        if (Array.isArray(value)) {
            summary.push(`${indent}- ${formatKey(key)}: ${value.length} items total`);
            if (value.length > 0 && typeof value[0] === 'object' && depth < 2) {
                const sample = value.slice(0, 3).map(v => v.displayName || v.name || v.id || JSON.stringify(v).substring(0, 30)).join(', ');
                summary.push(`${indent}  (Include samples: ${sample}...)`);
            }
        } else if (value !== null && typeof value === 'object') {
            summary.push(`${indent}- ${formatKey(key)}:`);
            processElaboratedObject(value, summary, depth + 1);
        } else {
            // Format units if possible
            let formattedValue = value;
            if (key.toLowerCase().includes('bytes')) formattedValue = formatBytes(value);
            if (key.toLowerCase().includes('percentage')) formattedValue = `${value}%`;

            summary.push(`${indent}- ${formatKey(key)}: ${formattedValue}`);
        }
    });
}

/**
 * Humanize keys (e.g., activeUsers7d -> Active Users 7d)
 */
function formatKey(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Log a route change for AI context
 */
export function logRoute(path, title) {
    const store = initStore();
    if (!store.navigationHistory) store.navigationHistory = [];

    const entry = {
        path,
        title,
        timestamp: Date.now()
    };

    // Keep last 10 routes
    store.navigationHistory.unshift(entry);
    store.navigationHistory = store.navigationHistory.slice(0, 10);

    saveLocally();
}

/**
 * Get a structured data object for AI (alternative to text summary)
 * @returns {object} Structured data object
 */
export function getStructuredData() {
    const store = initStore();
    return {
        lastUpdated: store.lastUpdated,
        sections: Object.keys(store.sections).reduce((acc, key) => {
            acc[key] = {
                data: store.sections[key].data,
                timestamp: store.sections[key].timestamp
            };
            return acc;
        }, {})
    };
}

const SiteDataStore = {
    ensureInitialized,
    store,
    get,
    getAll,
    isFresh,
    clear,
    clearAll,
    getAISummary,
    getStructuredData,
    logRoute
};

export default SiteDataStore;
