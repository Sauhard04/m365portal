// In-memory cache for quick access
let memoryCache = null;
let initPromise = null;

/**
 * Initialize or load the data store
 */
export async function ensureInitialized() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (!memoryCache) {
            initStore();
        }
        await syncWithServer();
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
async function syncWithServer() {
    try {
        const response = await fetch('/api/sitedata/load');
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

const persistToServer = async () => {
    if (!memoryCache) return;

    try {
        const response = await fetch('/api/sitedata/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memoryCache)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server rejected storage: ${errorText}`);
        }
        console.log('[SiteDataStore] Successfully persisted to server');
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
export function store(sectionKey, data, metadata = {}) {
    const store = initStore();

    store.sections[sectionKey] = {
        data,
        timestamp: Date.now(),
        ...metadata
    };

    store.lastUpdated = Date.now();
    saveLocally();

    // Asynchronously persist to server
    persistToServer();
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
 * Generate a concise text summary for AI consumption
 */
export function getAISummary() {
    const { sections } = initStore();
    const summary = [];

    summary.push(`=== M365 ENVIRONMENT REAL-TIME DATA ===`);
    summary.push(`Last Knowledge Update: ${new Date().toLocaleString()}`);
    summary.push('');

    // Overview Stats
    if (sections.overview?.data?.quickStats) {
        const stats = sections.overview.data.quickStats;
        summary.push(`## GENERAL OVERVIEW`);
        summary.push(`- Total Users: ${stats.totalUsers}`);
        summary.push(`- Total Devices: ${stats.totalDevices}`);
        summary.push(`- Total Licenses: ${stats.totalLicenses}`);
        summary.push(`- MFA Setup: ${stats.mfaRegistered}/${stats.mfaTotal} users`);
        summary.push('');
    }

    // Bird's Eye Snapshot
    if (sections.birdsEye?.data) {
        const be = sections.birdsEye.data;
        summary.push(`## RESOURCE SNAPSHOT (Bird's Eye)`);

        if (be.entra) {
            summary.push(`### Identity (Entra ID)`);
            summary.push(`- Total Users: ${be.entra.users}`);
            summary.push(`- Guest Users: ${be.entra.guest}`);
            summary.push(`- Total Groups: ${be.entra.groups}`);
            summary.push(`- Global Admins: ${be.entra.admins?.find(a => a.name === 'Global')?.count || 0}`);
            summary.push(`- Apps: ${be.entra.apps}`);
        }

        if (be.intune) {
            summary.push(`### Endpoints (Intune)`);
            summary.push(`- Managed Devices: ${be.intune.total}`);
            summary.push(`- Compliant: ${be.intune.compliant}`);
            summary.push(`- Windows: ${be.intune.osSummary?.windowsCount || 0}, macOS: ${be.intune.osSummary?.macOSCount || 0}`);
        }

        if (be.collaboration) {
            summary.push(`### Collaboration`);
            summary.push(`- Teams: ${be.collaboration.teams}`);
            summary.push(`- SharePoint Sites: ${be.collaboration.sharepoint}`);
            summary.push(`- Private Teams: ${be.collaboration.privateTeams}`);
        }
        summary.push('');
    }

    // Entra Users (Detailed)
    if (sections.entraUsers?.data) {
        const eu = sections.entraUsers.data;
        summary.push(`## ENTRA DIRECTORY USERS`);
        summary.push(`- Directory Snapshot Users: ${eu.total || 0}`);
        summary.push(`- Guest Accounts: ${eu.guests || 0}`);
        summary.push(`- Disabled Accounts: ${eu.disabled || 0}`);
        summary.push('');
    }

    // Mailboxes (Operational)
    if (sections.mailboxes?.data) {
        const mail = sections.mailboxes.data;
        summary.push(`## EXCHANGE MAILBOXES`);
        summary.push(`- Total Mailboxes: ${mail.totalMailboxes || 0}`);
        if (mail.reports?.length > 0) {
            const avgSize = mail.reports.reduce((acc, mb) => acc + parseFloat(mb.mailboxSize || 0), 0) / mail.reports.length;
            summary.push(`- Average Mailbox Size: ${avgSize.toFixed(2)} GB`);
        }
        summary.push('');
    }

    // Email Activity (Specific flow trends)
    if (sections.emailActivity?.data) {
        const flow = sections.emailActivity.data;
        summary.push(`## EMAIL FLOW ACTIVITY`);
        summary.push(`- Last Period Sent: ${flow.lastSent || 0}`);
        summary.push(`- Last Period Received: ${flow.lastReceived || 0}`);
        summary.push('');
    }

    // Licenses (Inventory)
    if (sections.licenses?.data) {
        const lic = sections.licenses.data;
        summary.push(`## LICENSING & INVENTORY`);
        summary.push(`- Total Consumed Seats: ${lic.totalConsumed || 0}`);
        if (lic.summary?.length > 0) {
            lic.summary.slice(0, 5).forEach(s => {
                summary.push(`  * ${s.skuPartNumber}: ${s.consumedUnits}/${s.prepaidUnits?.enabled || 0} assigned`);
            });
        }
        summary.push('');
    }

    // Service Health (Operational Status)
    if (sections.serviceHealth?.data) {
        const health = sections.serviceHealth.data;
        summary.push(`## M365 SERVICE HEALTH`);
        summary.push(`- Unhealthy Services: ${health.unhealthyCount || 0}`);
        if (health.issues?.length > 0) {
            summary.push(`- Active Issues/Incidents: ${health.issues.length}`);
            health.issues.slice(0, 3).forEach(issue => {
                summary.push(`  * [${issue.service}] ${issue.title} (${issue.classification})`);
            });
        }
        summary.push('');
    }

    // Secure Score
    if (sections.secureScore?.data) {
        const score = sections.secureScore.data;
        summary.push(`## SECURE SCORE`);
        summary.push(`- Current Score: ${score.currentScore || 0}`);
        summary.push(`- Max Score: ${score.maxScore || 100}`);
        summary.push(`- Percentage: ${Math.round(((score.currentScore || 0) / (score.maxScore || 100)) * 100)}%`);
        if (score.controlScores?.length > 0) {
            summary.push(`- Active Security Controls: ${score.controlScores.length}`);
        }
        summary.push('');
    }

    // Usage Reports (Generic & D180)
    const usageSections = ['usageReports', 'usageReports_D180'];
    usageSections.forEach(sectionKey => {
        if (sections[sectionKey]?.data) {
            const usage = sections[sectionKey].data;
            const period = usage.period || sections[sectionKey].period || (sectionKey.includes('D180') ? 'D180' : 'Unknown');
            summary.push(`## USAGE REPORTS (Period: ${period})`);

            if (usage.teams) {
                const teamsDetail = usage.teams.detail || [];
                const totalMsgs = teamsDetail.reduce((acc, u) => acc + (u.teamChatMessages || 0) + (u.privateChatMessages || 0), 0);
                summary.push(`### Teams Usage`);
                summary.push(`- Active Users Tracked: ${teamsDetail.length || 0}`);
                summary.push(`- Communications Volume: ${totalMsgs.toLocaleString()}`);
            }

            if (usage.exchange) {
                const exchDetail = usage.exchange.detail || [];
                const totalSent = exchDetail.reduce((acc, u) => acc + (u.sendCount || 0), 0);
                summary.push(`### Exchange Usage`);
                summary.push(`- Active Mailboxes Tracked: ${exchDetail.length || 0}`);
                summary.push(`- Traffic Volume (Sent): ${totalSent.toLocaleString()}`);
            }

            if (usage.sharepoint) {
                const spDetail = usage.sharepoint.detail || [];
                const totalFiles = spDetail.reduce((acc, u) => acc + (u.viewedOrEditedFileCount || 0), 0);
                summary.push(`### SharePoint Usage`);
                summary.push(`- Active Sites Tracked: ${spDetail.length || 0}`);
                summary.push(`- File Operations: ${totalFiles.toLocaleString()}`);
            }
            summary.push('');
        }
    });

    summary.push(`=== END OF REAL-TIME DATA ===`);

    return summary.join('\n');
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
    getStructuredData
};

export default SiteDataStore;
