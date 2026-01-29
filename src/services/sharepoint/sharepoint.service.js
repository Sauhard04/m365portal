// SharePoint & OneDrive Service - Microsoft Graph API calls

export const SharePointService = {
    /**
     * Get all SharePoint sites
     * @param {Client} client - Microsoft Graph client
     */
    async getSites(client, top = 100) {
        try {
            const response = await client.api('/sites')
                .query({ search: '*' })
                .select('id,displayName,name,webUrl,createdDateTime,lastModifiedDateTime')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Sites fetch failed:', error);
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
            console.warn('Root site fetch failed:', error);
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
            console.warn('Site fetch failed:', error);
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
            console.warn('Site lists fetch failed:', error);
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
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Drives fetch failed:', error);
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
            console.warn('My drive fetch failed:', error);
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
            console.warn('Drive items fetch failed:', error);
            return [];
        }
    },

    /**
     * Get SharePoint usage report
     * @param {Client} client - Microsoft Graph client
     */
    async getSharePointUsage(client) {
        try {
            const response = await client.api('/reports/getSharePointSiteUsageDetail(period=\'D7\')')
                .get();
            return response;
        } catch (error) {
            console.warn('SharePoint usage report failed:', error);
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
                .get();
            return response;
        } catch (error) {
            console.warn('OneDrive usage report failed:', error);
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
            console.warn('External sharing analysis failed:', error);
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
                this.getSites(client, 200),
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
    }
};

export default SharePointService;
