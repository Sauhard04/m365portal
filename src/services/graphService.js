import { Client } from "@microsoft/microsoft-graph-client";

export class GraphService {
    static isIntuneOperational = true;
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });
    }

    async getUserDetails() {
        return await this.client.api("/me").get();
    }

    /**
     * Helper to fetch reports via proxy to avoid CORS
     * @param {string} endpoint - Graph API endpoint (e.g., /reports/...)
     */
    async _fetchReport(endpoint) {
        try {
            const url = `https://graph.microsoft.com/beta${endpoint}`;
            const resp = await fetch(url, {
                headers: { "Authorization": `Bearer ${this.accessToken}` },
                redirect: "manual"
            });

            if (resp.ok) {
                // If it didn't redirect (unlikely for reports), return json
                const json = await resp.json();
                return json.value || [];
            } else if (resp.status === 302 || resp.status === 301) {
                const location = resp.headers.get("Location");
                if (location) {
                    // Use our server proxy to fetch the content
                    const proxyUrl = `/api/proxy/download?url=${encodeURIComponent(location)}`;
                    const dr = await fetch(proxyUrl);
                    if (dr.ok) {
                        const json = await dr.json();
                        return json.value || [];
                    }
                }
            }
            return [];
        } catch (e) {
            console.warn(`Report fetch failed for ${endpoint}:`, e);
            return [];
        }
    }

    /**
     * Mailbox Usage Detail Report
     */
    async getExchangeMailboxReport() {
        try {
            const usersResponse = await this.client.api("/users")
                .version("beta")
                .select("id,displayName,userPrincipalName,mail,archiveStatus,assignedPlans,onPremisesSyncEnabled,userType,jobTitle,department,officeLocation,city,country,createdDateTime,accountEnabled,mobilePhone")
                .top(999)
                .get();

            const users = usersResponse.value;

            // Fetch usage report via proxy
            const usageReport = await this._fetchReport("/reports/getMailboxUsageDetail(period='D7')?$format=application/json");

            let isConcealed = false;
            const detailedReports = users.map((user) => {
                const upn = user.userPrincipalName.toLowerCase();
                const reportInfo = usageReport.find(r => r.userPrincipalName?.toLowerCase() === upn);

                if (usageReport.length > 0 && !isConcealed) {
                    const firstUPN = usageReport[0].userPrincipalName;
                    if (firstUPN && /^[A-F0-9]+$/.test(firstUPN)) isConcealed = true;
                }

                let isArchiveEnabled = false;
                if (reportInfo && reportInfo.hasArchive !== undefined && reportInfo.hasArchive !== null) {
                    isArchiveEnabled = reportInfo.hasArchive === true || reportInfo.hasArchive === 'True';
                } else if (user.archiveStatus) {
                    isArchiveEnabled = user.archiveStatus.toLowerCase() === 'active';
                }

                const formatGB = (bytes) => (bytes ? (bytes / 1073741824).toFixed(2) : "0.00");
                const quotaBytes = reportInfo?.prohibitSendReceiveQuotaInBytes || reportInfo?.archiveQuotaInBytes;

                return {
                    displayName: user.displayName,
                    userPrincipalName: user.userPrincipalName,
                    emailAddress: user.mail || user.userPrincipalName,
                    jobTitle: user.jobTitle || '',
                    department: user.department || '',
                    officeLocation: user.officeLocation || '',
                    city: user.city || '',
                    country: user.country || '',
                    accountEnabled: user.accountEnabled ? 'Yes' : 'No',
                    createdDateTime: user.createdDateTime,
                    lastActivityDate: reportInfo?.lastActivityDate || 'N/A',
                    itemCount: reportInfo?.itemCount || 0,
                    archivePolicy: isArchiveEnabled,
                    mailboxSize: reportInfo ? `${formatGB(reportInfo.storageUsedInBytes)} GB` : "0.00 GB",
                    migrationStatus: user.onPremisesSyncEnabled ? "Migrated" : "Cloud Native",
                    dataMigrated: reportInfo ? `${formatGB(reportInfo.storageUsedInBytes)} GB` : "N/A"
                };
            });

            return { reports: detailedReports, isConcealed: isConcealed };
        } catch (error) {
            console.error("Exchange Report Fetch Failure:", error);
            throw error;
        }
    }

    async getEmailActivityUserDetail(period = 'D7') {
        // Use proxy helper
        return await this._fetchReport(`/reports/getEmailActivityUserDetail(period='${period}')?$format=application/json`);
    }

    async getLicensingData() {
        const skus = await this.client.api("/subscribedSkus").get().then(r => r.value).catch(() => []);
        const users = await this.client.api("/users").select("id,displayName,userPrincipalName,assignedLicenses").top(50).get().then(r => r.value).catch(() => []);
        return { skus, users };
    }

    async getDomains() {
        return this.client.api("/domains").get().then(r => r.value || []).catch(() => []);
    }

    async getGroups() {
        return this.client.api("/groups").get().then(r => r.value || []).catch(() => []);
    }

    async getApplications() {
        return this.client.api("/applications").select("id,appId,displayName,createdDateTime,signInAudience").top(100)
            .get().then(r => r.value || []).catch(() => []);
    }

    async getServicePrincipals() {
        return this.client.api("/servicePrincipals")
            .select("id,appId,displayName,createdDateTime,homepage,keyCredentials,passwordCredentials,tags,appOwnerOrganizationId,servicePrincipalType")
            .top(999)
            .get()
            .then(r => r.value || [])
            .catch(() => []);
    }

    async getDirectoryAudits() {
        return this.client.api("/auditLogs/directoryAudits").top(5).orderby("activityDateTime desc").get().catch(() => null);
    }

    async getConditionalAccessPolicies() {
        return this.client.api("/identity/conditionalAccess/policies").select("id,displayName,state,createdDateTime").top(100)
            .get().then(r => r.value || []).catch(() => []);
    }

    async getGlobalAdmins() {
        const res = await this.client.api("/directoryRoles").filter("roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'").expand("members").get().catch(() => ({ value: [] }));
        return res.value?.[0]?.members || [];
    }

    // Updated to return full list of roles to filter client-side if needed, or we can fetch specific roles
    async getDirectoryRoles() {
        return this.client.api("/directoryRoles").expand("members").get().then(r => r.value || []).catch(() => []);
    }

    async getSecureScore() {
        const res = await this.client.api("/security/secureScores").top(1).select("currentScore,maxScore,createdDateTime,controlScores").orderby("createdDateTime desc").get().catch(() => ({ value: [] }));
        return res.value?.[0] || null;
    }

    /**
     * Get Secure Score control profiles (detailed recommendations with descriptions)
     */
    async getSecureScoreControlProfiles() {
        try {
            const res = await this.client
                .api("/security/secureScoreControlProfiles")
                .top(200)
                .select("id,title,maxScore,actionType,service,tier,implementationCost,userImpact,threats,remediation,actionUrl,controlCategory,deprecated")
                .get();
            return res.value || [];
        } catch (error) {
            console.warn('Secure Score Control Profiles fetch failed:', error);
            return [];
        }
    }

    async getServiceHealth() {
        return this.client.api("/admin/serviceAnnouncement/healthOverviews").select("service,status").get().then(r => r.value || []).catch(() => []);
    }

    async getServiceIssues() {
        return this.client.api("/admin/serviceAnnouncement/issues").filter("isResolved eq false").orderby("lastModifiedDateTime desc").top(20).get().then(r => r.value || []).catch(() => []);
    }

    async getFailedSignIns() {
        return this.client.api("/auditLogs/signIns").filter("status/errorCode ne 0").top(5).orderby("createdDateTime desc").get().then(r => r.value || []).catch(() => []);
    }

    async getDeletedUsers() {
        return this.client.api("/directory/deletedItems/microsoft.graph.user").select("id,displayName,userPrincipalName,mail,deletedDateTime").top(100).get().then(r => r.value || []).catch(() => []);
    }

    async getTotalDevicesCount() {
        try {
            // Fetch total count of directory devices (Entra ID)
            const count = await this.client.api('/devices/$count')
                .header('ConsistencyLevel', 'eventual')
                .get();
            return count || 0;
        } catch (e) {
            console.warn("Failed to fetch Entra devices count, falling back to basic list length check (max 999).", e);
            try {
                const res = await this.client.api('/devices').select('id').top(999).get();
                return res.value?.length || 0;
            } catch (err) {
                return 0;
            }
        }
    }

    async getDeviceComplianceStats() {
        if (!GraphService.isIntuneOperational) {
            return { total: 0, compliant: 0, osSummary: null };
        }

        try {
            // Using managedDeviceOverview is more efficient and stable than querying the collection with filters
            const overview = await this.client.api('/deviceManagement/managedDeviceOverview')
                .version("beta")
                .get()
                .catch(err => {
                    if (err.statusCode === 500 || err.statusCode === 503 || err.statusCode === 403) {
                        GraphService.isIntuneOperational = false;
                        console.warn("Intune Overview unavailable. Disabling Intune-related counters.");
                    }
                    throw err;
                });

            return {
                total: overview.deviceCount || 0,
                compliant: overview.compliantDeviceCount || 0,
                osSummary: overview.deviceOperatingSystemSummary || null
            };
        } catch (e) {
            return { total: 0, compliant: 0, osSummary: null };
        }
    }

    /**
     * Get active user trends over a period
     * @param {string} period - D7, D30, D90, D180
     */
    async getActiveUserTrends(period = 'D30') {
        // Use proxy helper
        const data = await this._fetchReport(`/reports/getOffice365ActiveUserCounts(period='${period}')?$format=application/json`);
        return data || [];
    }

    /**
     * Get security alerts with severity breakdown
     */
    async getSecurityAlerts() {
        try {
            const response = await this.client
                .api('/security/alerts')
                .top(100)
                .orderby('createdDateTime desc')
                .get();

            return response.value || [];
        } catch (error) {
            console.warn('Security alerts fetch failed:', error);
            return [];
        }
    }

    /**
     * Run a KQL hunting query
     * @param {string} query - The KQL query string
     */
    async runHuntingQuery(query) {
        try {
            const response = await this.client
                .api('/security/runHuntingQuery')
                .post({ query });
            return response.value || [];
        } catch (error) {
            console.error('Hunting query failed:', error);
            throw error;
        }
    }

    /**
     * Get mailbox activity trends
     * @param {string} period - D7, D30
     */
    async getMailboxActivityTrend(period = 'D30') {
        // Use proxy helper
        const data = await this._fetchReport(`/reports/getEmailActivityCounts(period='${period}')?$format=application/json`);
        return data || [];
    }

    /**
     * Get user type distribution (Member vs Guest)
     */
    async getUserTypeDistribution() {
        try {
            const [members, guests] = await Promise.all([
                this.client.api('/users/$count')
                    .header('ConsistencyLevel', 'eventual')
                    .filter('userType eq \'Member\'')
                    .get()
                    .catch(() => 0),
                this.client.api('/users/$count')
                    .header('ConsistencyLevel', 'eventual')
                    .filter('userType eq \'Guest\'')
                    .get()
                    .catch(() => 0)
            ]);

            return { members, guests };
        } catch (error) {
            console.warn('User type distribution fetch failed:', error);
            return { members: 0, guests: 0 };
        }
    }

    /**
     * Get MFA status for users
     */
    async getMFAStatus() {
        try {
            const response = await this.client
                .api('/reports/authenticationMethods/userRegistrationDetails')
                .version('beta')
                .top(999)
                .get();

            const details = response.value || [];

            // Categorize users
            const mfaEnabled = details.filter(u => u.isMfaRegistered).length;
            const mfaDisabled = details.filter(u => !u.isMfaRegistered).length;
            const risky = details.filter(u => u.isAdmin && !u.isMfaRegistered).length;

            return { mfaEnabled, mfaDisabled, risky, total: details.length };
        } catch (error) {
            console.warn('MFA status fetch failed:', error);
            return { mfaEnabled: 0, mfaDisabled: 0, risky: 0, total: 0 };
        }
    }

    /**
     * Get sign-in trends (success vs failure)
     * @param {number} days - Number of days to look back
     */
    async getSignInTrends(days = 14) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const isoDate = startDate.toISOString();

            const response = await this.client
                .api('/auditLogs/signIns')
                .filter(`createdDateTime ge ${isoDate}`)
                .top(999)
                .orderby('createdDateTime desc')
                .get();

            const signIns = response.value || [];

            // Group by date and success/failure
            const trendMap = new Map();
            signIns.forEach(signIn => {
                const date = new Date(signIn.createdDateTime).toLocaleDateString();
                if (!trendMap.has(date)) {
                    trendMap.set(date, { date, success: 0, failure: 0 });
                }
                const entry = trendMap.get(date);
                if (signIn.status.errorCode === 0) {
                    entry.success++;
                } else {
                    entry.failure++;
                }
            });

            return Array.from(trendMap.values()).reverse();
        } catch (error) {
            console.warn('Sign-in trends fetch failed:', error);
            return [];
        }
    }

    async getPurviewStats() {
        try {
            const [labels, retention, cases] = await Promise.all([
                this.client.api("/security/informationProtection/sensitivityLabels").version("beta").get().catch(() => ({ value: [] })),
                this.client.api("/security/labels/retentionLabels").version("beta").get().catch(() => ({ value: [] })),
                this.client.api("/compliance/ediscovery/cases").version("beta").get().catch(() => ({ value: [] }))
            ]);

            // Attempt to fetch searches for the first case if any exist
            let searchCount = 0;
            if (cases.value && cases.value.length > 0) {
                const caseId = cases.value[0].id;
                const searches = await this.client.api(`/compliance/ediscovery/cases/${caseId}/searches`).version("beta").get().catch(() => ({ value: [] }));
                searchCount = searches.value?.length || 0;
            }

            return {
                labels: labels.value?.length || 0,
                retentionPolicies: retention.value?.length || 0,
                dlpPolicies: searchCount,
                dlpAlerts: cases.value?.length || 0
            };
        } catch (error) {
            console.error("Purview Graph Fetch Failure:", error);
            return { labels: 0, retentionPolicies: 0, dlpPolicies: 0, dlpAlerts: 0 };
        }
    }

    async getSharePointSiteCount() {
        try {
            // Fetching root site collections with count
            const countResponse = await this.client.api("/sites")
                .filter("siteCollection/root ne null")
                .select("id")
                .top(1)
                .count(true)
                .header('ConsistencyLevel', 'eventual')
                .get();

            return countResponse['@odata.count'] || 0;
        } catch (error) {
            console.warn("SharePoint site count fetch failed:", error);
            return 0;
        }
    }

    async getSecurityIncidents() {
        try {
            const response = await this.client
                .api('/security/incidents')
                .top(50)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Security incidents fetch failed:', error);
            return [];
        }
    }

    async getConfigurationProfiles() {
        try {
            const response = await this.client
                .api('/deviceManagement/deviceConfigurations')
                .select('id,displayName,lastModifiedDateTime')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Configuration profiles fetch failed:', error);
            return [];
        }
    }

    async getIntuneApplications() {
        try {
            const response = await this.client
                .api('/deviceAppManagement/mobileApps')
                .select('id,displayName,publisher')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Intune applications fetch failed:', error);
            return [];
        }
    }

    async getOneDriveUsage() {
        // Use proxy helper
        const data = await this._fetchReport(`/reports/getOneDriveUsageAccountDetail(period='D7')?$format=application/json`);
        return data || [];
    }

    async getActiveUsersCount(period = 'D7') {
        const data = await this._fetchReport(`/reports/getOffice365ActiveUserDetail(period='${period}')?$format=application/json`);
        return data || [];
    }

    async getRiskyUsersCount() {
        try {
            const response = await this.client
                .api('/identityProtection/riskyUsers')
                .filter('riskState eq \'atRisk\'')
                .top(100)
                .get();
            return response.value?.length || 0;
        } catch (error) {
            console.warn('Risky users count fetch failed:', error);
            return 0;
        }
    }

    /**
     * Get all users with basic properties for bulk operations
     * @param {number} top - Maximum number of users to fetch
     */
    async getAllUsers(top = 999) {
        try {
            const response = await this.client
                .api('/users')
                .select('id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,userType')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('All users fetch failed:', error);
            return [];
        }
    }
}
