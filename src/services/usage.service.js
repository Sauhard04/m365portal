import { Client } from '@microsoft/microsoft-graph-client';

export class UsageService {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });
    }

    /**
     * Fetch report data from Graph API with fallback to JSON format
     * @param {string} endpoint - The report endpoint
     * @param {string} period - D7, D30, D90, D180
     */
    async fetchReport(endpoint, period = 'D7') {
        try {
            // Using $format=application/json on beta typically avoids the 302 redirect CORS issue
            // and returns a cleaner JSON structure.
            const url = `https://graph.microsoft.com/beta/reports/${endpoint}(period='${period}')?$format=application/json`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                // If it's a 302 redirect, it might still fail in browser due to CORS
                // but we try to handle it.
                if (response.status === 302 || response.status === 301) {
                    const location = response.headers.get('Location');
                    if (location) {
                        const redirectRes = await fetch(location);
                        if (redirectRes.ok) {
                            return await redirectRes.json();
                        }
                    }
                }
                throw new Error(`Report fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.warn(`Failed to fetch report ${endpoint}:`, error.message);
            return null;
        }
    }

    /**
     * Fetch real Exchange activity data
     */
    async getExchangeUsage(period = 'D7') {
        try {
            const data = await this.fetchReport('getEmailActivityUserDetail', period);

            if (!data) {
                return {
                    detail: [],
                    counts: []
                };
            }

            // Map Graph API fields to UI fields
            const detail = data.map(item => ({
                userPrincipalName: item.userPrincipalName,
                displayName: item.displayName || item.userPrincipalName.split('@')[0],
                lastActivityDate: item.lastActivityDate,
                sendCount: parseInt(item.sendCount) || 0,
                receiveCount: parseInt(item.receiveCount) || 0,
                readCount: parseInt(item.readCount) || 0
            }));

            // For counts, we might need a different endpoint or aggregate from detail
            // getEmailActivityCounts provides daily totals
            const countsData = await this.fetchReport('getEmailActivityCounts', period);
            const counts = countsData ? countsData.map((c, i) => {
                // Synthesize date if missing (Graph API sometimes omits reportDate in beta)
                let rDate = c.reportDate;
                if (!rDate && c.reportRefreshDate) {
                    const d = new Date(c.reportRefreshDate);
                    d.setDate(d.getDate() - (countsData.length - 1 - i));
                    rDate = d.toISOString().split('T')[0];
                }

                return {
                    reportDate: rDate || c.reportRefreshDate,
                    sendCount: parseInt(c.send || c.sendCount) || 0,
                    receiveCount: parseInt(c.receive || c.receiveCount) || 0,
                    readCount: parseInt(c.read || c.readCount) || 0
                };
            }) : [];

            return { detail, counts };
        } catch {
            return {
                detail: [],
                counts: []
            };
        }
    }

    /**
     * Fetch real Teams user activity data
     */
    async getTeamsUsage(period = 'D7') {
        try {
            const data = await this.fetchReport('getTeamsUserActivityUserDetail', period);

            if (!data) {
                return {
                    detail: [],
                    counts: []
                };
            }

            const detail = data.map(item => ({
                userPrincipalName: item.userPrincipalName,
                displayName: item.displayName || item.userPrincipalName.split('@')[0],
                lastActivityDate: item.lastActivityDate,
                teamChatMessages: parseInt(item.teamChatMessageCount) || 0,
                privateChatMessages: parseInt(item.privateChatMessageCount) || 0,
                calls: parseInt(item.callCount) || 0,
                meetings: parseInt(item.meetingCount) || 0
            }));

            const countsData = await this.fetchReport('getTeamsUserActivityCounts', period);
            const counts = countsData ? countsData.map((c, i) => {
                let rDate = c.reportDate;
                if (!rDate && c.reportRefreshDate) {
                    const d = new Date(c.reportRefreshDate);
                    d.setDate(d.getDate() - (countsData.length - 1 - i));
                    rDate = d.toISOString().split('T')[0];
                }

                return {
                    reportDate: rDate || c.reportRefreshDate,
                    teamChatMessages: parseInt(c.teamChatMessages || c.teamChatMessageCount) || 0,
                    privateChatMessages: parseInt(c.privateChatMessages || c.privateChatMessageCount) || 0,
                    calls: parseInt(c.calls || c.callCount) || 0,
                    meetings: parseInt(c.meetings || c.meetingCount) || 0
                };
            }) : [];

            return { detail, counts };
        } catch {
            return {
                detail: [],
                counts: []
            };
        }
    }

    /**
     * Fetch real SharePoint site usage data
     */
    async getSharePointUsage(period = 'D7') {
        try {
            const data = await this.fetchReport('getSharePointSiteUsageDetail', period);

            if (!data) {
                return {
                    detail: [],
                    counts: []
                };
            }

            const detail = data.map(item => ({
                siteUrl: item.siteUrl,
                displayName: item.siteTitle || 'Unnamed Site',
                lastActivityDate: item.lastActivityDate,
                viewedOrEditedFileCount: parseInt(item.viewedOrEditedFileCount) || 0,
                syncedFileCount: parseInt(item.syncedFileCount) || 0,
                sharedInternalFileCount: parseInt(item.sharedInternalFileCount) || 0,
                sharedExternalFileCount: parseInt(item.sharedExternalFileCount) || 0,
                storageUsedInBytes: parseInt(item.storageUsedInBytes) || 0
            }));

            const countsData = await this.fetchReport('getSharePointSiteUsageFileCounts', period);
            const counts = countsData ? countsData.map((c, i) => {
                let rDate = c.reportDate;
                if (!rDate && c.reportRefreshDate) {
                    const d = new Date(c.reportRefreshDate);
                    d.setDate(d.getDate() - (countsData.length - 1 - i));
                    rDate = d.toISOString().split('T')[0];
                }

                return {
                    reportDate: rDate || c.reportRefreshDate,
                    viewedOrEditedFileCount: parseInt(c.viewedOrEdited || c.viewedOrEditedFileCount) || 0,
                    syncedFileCount: parseInt(c.synced || c.syncedFileCount) || 0
                };
            }) : [];

            return { detail, counts };
        } catch {
            return {
                detail: [],
                counts: []
            };
        }
    }

    /**
     * Fetch OneDrive user activity data
     */
    async getOneDriveUsage(period = 'D7') {
        try {
            const data = await this.fetchReport('getOneDriveActivityUserDetail', period);
            return data || [];
        } catch {
            return [];
        }
    }

    /**
     * Fetch Active Users across all services
     */
    async getOffice365ActiveUserDetail(period = 'D7') {
        try {
            const data = await this.fetchReport('getOffice365ActiveUserDetail', period);
            return data || [];
        } catch {
            return [];
        }
    }

    // Data Generation methods removed.
}

export default UsageService;
