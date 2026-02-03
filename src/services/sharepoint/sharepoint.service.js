// SharePoint & OneDrive Service - Microsoft Graph API calls

export const SharePointService = {
    /**
     * Get all SharePoint sites
     * @param {Client} client - Microsoft Graph client
     */
    async getSites(client, top = 999) {
        try {
            // Try broad search first
            const response = await client.api('/sites')
                .query({ search: '*' })
                .select('id,displayName,name,webUrl,createdDateTime,lastModifiedDateTime')
                .top(top)
                .get();

            let sites = response.value || [];

            // If no sites found via search, try getting the root site as a last resort
            if (sites.length === 0) {
                try {
                    const root = await client.api('/sites/root').get();
                    if (root) sites = [root];
                } catch (e) {
                    console.warn('Root site fallback failed');
                }
            }

            return sites;
        } catch (error) {
            console.error('Sites fetch failed:', error);
            return [];
        }
    },

    /**
     * Get root SharePoint site
     * @param {Client} client - Microsoft Graph client
     */
    async getRootSite(client) {
        try {
            const response = await client.api('/sites/root')
                .select('id,displayName,name,webUrl,description')
                .get();
            return response;
        } catch (error) {
            console.error('Root site fetch failed:', error);
            return null;
        }
    },

    /**
     * Get SharePoint site by ID
     * @param {Client} client - Microsoft Graph client
     * @param {string} siteId - Site ID
     */
    async getSiteById(client, siteId) {
        try {
            const response = await client.api(`/sites/${siteId}`)
                .select('id,displayName,name,webUrl,description,createdDateTime')
                .get();
            return response;
        } catch (error) {
            console.error('Site fetch failed:', error);
            return null;
        }
    },

    /**
     * Get SharePoint lists for a site
     * @param {Client} client - Microsoft Graph client
     * @param {string} siteId - Site ID
     */
    async getSiteLists(client, siteId) {
        try {
            const response = await client.api(`/sites/${siteId}/lists`)
                .select('id,displayName,name,createdDateTime,lastModifiedDateTime,webUrl')
                .top(50)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Site lists fetch failed:', error);
            return [];
        }
    },

    /**
     * Get drives (OneDrive/SharePoint document libraries)
     * @param {Client} client - Microsoft Graph client
     */
    async getDrives(client) {
        try {
            const response = await client.api('/drives')
                .select('id,name,driveType,owner,quota,webUrl,createdDateTime')
                .top(999)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Drives fetch failed:', error);
            return [];
        }
    },

    /**
     * Get current user's OneDrive
     * @param {Client} client - Microsoft Graph client
     */
    async getMyDrive(client) {
        try {
            const response = await client.api('/me/drive')
                .select('id,name,driveType,quota,webUrl')
                .get();
            return response;
        } catch (error) {
            console.error('My drive fetch failed:', error);
            return null;
        }
    },

    /**
     * Get drive usage (files and storage)
     * @param {Client} client - Microsoft Graph client
     * @param {string} driveId - Drive ID
     */
    async getDriveItems(client, driveId, top = 50) {
        try {
            const response = await client.api(`/drives/${driveId}/root/children`)
                .select('id,name,size,createdDateTime,lastModifiedDateTime,folder,file')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Drive items fetch failed:', error);
            return [];
        }
    },

    /**
     * Get SharePoint usage report
     * @param {Client} client - Microsoft Graph client
     */
    async getSharePointUsage(client) {
        try {
            // Reports return CSV, ensure we get it as text
            const response = await client.api('/reports/getSharePointSiteUsageDetail(period=\'D7\')')
                .responseType('text')
                .get();

            if (typeof response === 'string' && response.trim()) {
                const data = this.parseCSV(response);
                if (data.length === 0) return null;

                return data.reduce((acc, site) => {
                    acc.totalSites++;
                    // Header names can sometimes vary slightly, check common variations
                    const used = parseInt(site['Storage Used (Byte)'] || site['Storage Used (Bytes)']) || 0;
                    const quota = parseInt(site['Storage Quota (Byte)'] || site['Storage Quota (Bytes)']) || 0;
                    acc.used += used;
                    acc.quota += quota;
                    return acc;
                }, { totalSites: 0, used: 0, quota: 0 });
            }
            return null;
        } catch (error) {
            // Suppress CORS errors (expected in localhost development)
            if (!window._spReportsCORSWarned && (error.message?.includes('CORS') || error.message?.includes('Failed to fetch'))) {
                console.warn('SharePoint Reports API blocked by CORS (expected in localhost). Using fallback data.');
                window._spReportsCORSWarned = true;
            }
            return null;
        }
    },

    /**
     * Get OneDrive usage report
     * @param {Client} client - Microsoft Graph client
     */
    async getOneDriveUsage(client) {
        try {
            const response = await client.api('/reports/getOneDriveUsageAccountDetail(period=\'D7\')')
                .responseType('text')
                .get();

            if (typeof response === 'string' && response.trim()) {
                const data = this.parseCSV(response);
                if (data.length === 0) return null;

                return data.reduce((acc, user) => {
                    const hasOD = user['Has OneDrive'] || user['Has OneDrive Enabled'];
                    if (hasOD === 'Yes' || hasOD === 'True' || hasOD === true) {
                        acc.totalAccounts++;
                        acc.totalFiles += parseInt(user['File Count']) || 0;
                        const used = parseInt(user['Storage Used (Byte)'] || user['Storage Used (Bytes)']) || 0;
                        const quota = parseInt(user['Storage Quota (Byte)'] || user['Storage Quota (Bytes)']) || 0;
                        acc.used += used;
                        acc.quota += quota;
                    }
                    return acc;
                }, { totalAccounts: 0, totalFiles: 0, used: 0, quota: 0 });
            }
            return null;
        } catch (error) {
            // Suppress CORS errors (expected in localhost development)
            if (!window._odReportsCORSWarned && (error.message?.includes('CORS') || error.message?.includes('Failed to fetch'))) {
                window._odReportsCORSWarned = true;
            }
            return null;
        }
    },

    /**
     * Get sharing links for external access analysis
     * @param {Client} client - Microsoft Graph client
     * @param {string} siteId - Site ID
     */
    async getExternalSharing(client, siteId) {
        try {
            // This is a simplified approach - real implementation would need more complex logic
            const lists = await this.getSiteLists(client, siteId);
            return lists.filter(list => list.permissions?.some(p => p.link?.scope === 'anonymous'));
        } catch (error) {
            console.error('External sharing analysis failed:', error);
            return [];
        }
    },

    /**
     * Get dashboard summary for SharePoint & OneDrive
     * @param {Client} client - Microsoft Graph client
     */
    async getDashboardSummary(client) {
        try {
            const [sites, rootSite, drives, myDrive] = await Promise.all([
                this.getSites(client, 999),
                this.getRootSite(client),
                this.getDrives(client),
                this.getMyDrive(client)
            ]);

            // Merge root site if not present in search results
            const allSites = [...sites];
            if (rootSite && !allSites.find(s => s.id === rootSite.id)) {
                allSites.push(rootSite);
            }

            // Calculate storage usage from drives
            const totalQuota = drives.reduce((acc, drive) => {
                if (drive.quota?.total) acc.total += drive.quota.total;
                if (drive.quota?.used) acc.used += drive.quota.used;
                return acc;
            }, { total: 0, used: 0 });

            // Group sites by type
            const sitesByType = allSites.reduce((acc, site) => {
                const type = site.webUrl?.includes('/teams/') ? 'Team Sites' :
                    site.webUrl?.includes('/sites/') ? 'Communication Sites' : 'Other';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            return {
                sites: {
                    total: allSites.length,
                    byType: sitesByType,
                    recentSites: allSites.slice(0, 5)
                },
                drives: {
                    total: drives.length,
                    documentLibraries: drives.filter(d => d.driveType === 'documentLibrary').length,
                    personal: drives.filter(d => d.driveType === 'personal').length
                },
                storage: {
                    totalGB: Math.round((totalQuota.total || 0) / (1024 * 1024 * 1024)),
                    usedGB: Math.round((totalQuota.used || 0) / (1024 * 1024 * 1024)),
                    percentUsed: totalQuota.total ? Math.round((totalQuota.used / totalQuota.total) * 100) : 0
                },
                myDrive: myDrive ? {
                    usedGB: Math.round((myDrive.quota?.used || 0) / (1024 * 1024 * 1024)),
                    totalGB: Math.round((myDrive.quota?.total || 0) / (1024 * 1024 * 1024))
                } : null
            };
        } catch (error) {
            console.error('SharePoint dashboard summary fetch failed:', error);
            return {
                sites: { total: 0, byType: {}, recentSites: [] },
                drives: { total: 0, documentLibraries: 0, personal: 0 },
                storage: { totalGB: 0, usedGB: 0, percentUsed: 0 },
                myDrive: null
            };
        }
    },

    /**
     * Get all OneDrive accounts in the organization
     * @param {Client} client - Microsoft Graph client
     */
    async getOneDriveAccounts(client) {
        try {
            const drives = await this.getDrives(client);
            const personalDrives = drives.filter(d => d.driveType === 'personal');

            return personalDrives.map(drive => ({
                id: drive.id,
                owner: drive.owner?.user?.displayName || 'Unknown',
                email: drive.owner?.user?.email || drive.owner?.user?.userPrincipalName || 'N/A',
                usedGB: Math.round((drive.quota?.used || 0) / (1024 * 1024 * 1024)),
                totalGB: Math.round((drive.quota?.total || 0) / (1024 * 1024 * 1024)),
                percentUsed: drive.quota?.total ? Math.round((drive.quota.used / drive.quota.total) * 100) : 0,
                webUrl: drive.webUrl,
                createdDateTime: drive.createdDateTime
            }));
        } catch (error) {
            console.error('OneDrive accounts fetch failed:', error);
            return [];
        }
    },

    /**
     * Get detailed site information
     * @param {Client} client - Microsoft Graph client
     * @param {string} siteId - Site ID
     */
    async getSiteDetails(client, siteId) {
        try {
            const [site, drives, lists] = await Promise.all([
                this.getSiteById(client, siteId),
                client.api(`/sites/${siteId}/drives`)
                    .select('id,name,driveType,quota,webUrl')
                    .get()
                    .then(res => res.value || [])
                    .catch(() => []),
                this.getSiteLists(client, siteId)
            ]);

            // Calculate total storage from drives
            const totalStorage = drives.reduce((acc, drive) => {
                if (drive.quota?.used) acc.used += drive.quota.used;
                if (drive.quota?.total) acc.total += drive.quota.total;
                return acc;
            }, { used: 0, total: 0 });

            return {
                site,
                drives: drives.map(d => ({
                    ...d,
                    usedGB: Math.round((d.quota?.used || 0) / (1024 * 1024 * 1024)),
                    totalGB: Math.round((d.quota?.total || 0) / (1024 * 1024 * 1024))
                })),
                lists: lists.slice(0, 10), // Limit to 10 lists
                storage: {
                    usedGB: Math.round(totalStorage.used / (1024 * 1024 * 1024)),
                    totalGB: Math.round(totalStorage.total / (1024 * 1024 * 1024)),
                    percentUsed: totalStorage.total ? Math.round((totalStorage.used / totalStorage.total) * 100) : 0
                }
            };
        } catch (error) {
            console.error('Site details fetch failed:', error);
            return {
                site: null,
                drives: [],
                lists: [],
                storage: { usedGB: 0, totalGB: 0, percentUsed: 0 }
            };
        }
    },

    /**
     * Helper to parse CSV from Graph reports
     */
    parseCSV(csv) {
        if (!csv || typeof csv !== 'string') return [];
        // Handle BOM if present
        const cleanCSV = csv.startsWith('\uFEFF') ? csv.substring(1) : csv;
        const lines = cleanCSV.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        return lines.slice(1).map(line => {
            // Improved split to handle values with commas inside quotes if needed
            // But for these reports, simple split is usually okay.
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || null;
            });
            return obj;
        });
    },

    /**
     * Get OneDrive active accounts usage report
     * @param {Client} client - Microsoft Graph client
     * @param {string} period - Report period (D7, D30, D90, D180)
     */
    async getOneDriveActivity(client, period = 'D30') {
        try {
            const response = await client.api(`/reports/getOneDriveUsageAccountCounts(period='${period}')`)
                .responseType('text')
                .get();

            if (typeof response === 'string' && response.trim()) {
                const data = this.parseCSV(response);
                return data.map(item => ({
                    date: item['Report Refresh Date'] || item['Refresh Date'],
                    active: parseInt(item['Active']) || 0,
                    total: parseInt(item['Total']) || 0
                })).filter(i => i.date).sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            return Array.isArray(response) ? response : null;
        } catch (error) {
            // Suppress CORS errors (expected in localhost development)
            if (!window._odActivityCORSWarned && (error.message?.includes('CORS') || error.message?.includes('Failed to fetch'))) {
                window._odActivityCORSWarned = true;
            }
            return null;
        }
    },

    /**
     * Get OneDrive file activity report
     * @param {Client} client - Microsoft Graph client
     * @param {string} period - Report period (D7, D30, D90, D180)
     */
    async getOneDriveFileActivity(client, period = 'D30') {
        try {
            const response = await client.api(`/reports/getOneDriveActivityFileCounts(period='${period}')`)
                .responseType('text')
                .get();

            if (typeof response === 'string' && response.trim()) {
                const data = this.parseCSV(response);
                return data.map(item => ({
                    date: item['Report Refresh Date'] || item['Refresh Date'],
                    viewed: parseInt(item['Viewed Or Edited'] || item['Viewed or Edited']) || 0,
                    synced: parseInt(item['Synced']) || 0,
                    sharedInternally: parseInt(item['Shared Internally']) || 0,
                    sharedExternally: parseInt(item['Shared Externally']) || 0
                })).filter(i => i.date).sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            return Array.isArray(response) ? response : null;
        } catch (error) {
            // Suppress CORS errors (expected in localhost development)
            if (!window._odFileActivityCORSWarned && (error.message?.includes('CORS') || error.message?.includes('Failed to fetch'))) {
                window._odFileActivityCORSWarned = true;
            }
            return null;
        }
    },

    /**
     * Get Service Health Messages (Message Center)
     * @param {Client} client - Microsoft Graph client
     */
    async getServiceMessages(client) {
        try {
            const response = await client.api('/admin/serviceAnnouncement/messages')
                .top(5)
                .select('id,title,startDateTime,lastModifiedDateTime,category,details')
                .orderby('lastModifiedDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            // Suppress 403 errors (requires ServiceMessage.Read.All permission)
            if (!window._serviceMessages403Warned && error.statusCode === 403) {
                console.warn('Service Announcement API requires additional admin permissions (ServiceMessage.Read.All). Using fallback.');
                window._serviceMessages403Warned = true;
            }
            return [];
        }
    }
};

export default SharePointService;
