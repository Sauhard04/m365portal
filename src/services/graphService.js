import { Client } from "@microsoft/microsoft-graph-client";

export class GraphService {
    constructor(accessToken) {
        this.accessToken = accessToken; // Store for fetch-based report calls
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
     * Checks if a specific user's "Online Archive Mailbox" is enabled using the Reports API.
     * Handles the 302 redirect logic as required by the Reports endpoint.
     * @param {string} userPrincipalName - The email address of the user.
     * @returns {Promise<boolean>} - True if archive is enabled.
     */
    async getArchiveStatusReport(userPrincipalName) {
        try {
            // Switch to beta endpoint as v1.0 does not support JSON format query parameter ($format)
            const reportUrl = "https://graph.microsoft.com/beta/reports/getMailboxUsageDetail(period='D7')?$format=application/json";

            // Step 1: Request from Graph with the Authorization: Bearer <token> header.
            const response = await fetch(reportUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                },
                redirect: "manual"
            });

            let data;
            // Step 2: Handle the 302 Redirect (Location URL without Auth header)
            if (response.status === 302 || response.status === 301) {
                const redirectUrl = response.headers.get("Location");
                const dataResponse = await fetch(redirectUrl);
                if (!dataResponse.ok) throw new Error(`Report fetch failed: ${dataResponse.status}`);
                data = await dataResponse.json();
            } else if (response.ok) {
                data = await response.json();
            } else {
                if (response.status === 401) throw new Error("Unauthorized - Check Access Token");
                if (response.status === 403) throw new Error("Forbidden - Reports.Read.All required");
                throw new Error(`Graph API returned ${response.status}`);
            }

            // Step 3: Filter logic
            const userReport = data.value?.find(u =>
                u.userPrincipalName.toLowerCase() === userPrincipalName.toLowerCase()
            );

            if (!userReport) {
                throw new Error(`User ${userPrincipalName} not found in mailbox usage reports (Check if user has an active mailbox).`);
            }

            return userReport.isArchiveEnabled;
        } catch (error) {
            console.error("getArchiveStatusReport Error:", error);
            throw error;
        }
    }

    // Fetches users and their mailbox settings using the Beta endpoint
    async getExchangeMailboxReport() {
        try {
            // 1. Get List of Users with Beta properties
            // archiveStatus and userType (to filter guest settings) are available in Beta
            const usersResponse = await this.client.api("/users")
                .version("beta")
                .select("id,displayName,userPrincipalName,mail,archiveStatus,assignedPlans,onPremisesSyncEnabled,userType,jobTitle,department,officeLocation,city,country,createdDateTime,accountEnabled,mobilePhone")
                .top(999)
                .get();

            const users = usersResponse.value;

            // 2. Fetch Report Data once for Archive Status (as requested)
            let usageReport = [];
            try {
                // Switch to beta for JSON support
                const reportUrl = "https://graph.microsoft.com/beta/reports/getMailboxUsageDetail(period='D7')?$format=application/json";
                const resp = await fetch(reportUrl, {
                    headers: { "Authorization": `Bearer ${this.accessToken}` },
                    redirect: "follow" // Browser fetch automatically strips Auth header for different domains (S3/Blob)
                });

                if (resp.ok) {
                    const json = await resp.json();
                    usageReport = json.value || [];
                } else if (resp.status === 302 || resp.status === 301) {
                    // Fallback for manual redirect handling if 'follow' fails for some reason
                    const location = resp.headers.get("Location");
                    if (location) {
                        const dr = await fetch(location);
                        if (dr.ok) {
                            const json = await dr.json();
                            usageReport = json.value || [];
                        }
                    }
                }
            } catch (e) {
                console.warn("Usage report fetch failed:", e.message);
            }

            // 3. Map Report Data
            let isConcealed = false;
            const detailedReports = users.map((user) => {
                const upn = user.userPrincipalName.toLowerCase();
                const reportInfo = usageReport.find(r => r.userPrincipalName?.toLowerCase() === upn);

                // Check if the report data is hashed/concealed (hexadecimal string without @)
                if (usageReport.length > 0 && !isConcealed) {
                    const firstUPN = usageReport[0].userPrincipalName;
                    if (firstUPN && /^[A-F0-9]+$/.test(firstUPN)) {
                        isConcealed = true;
                    }
                }

                // Archive logic: Trust report first (hasArchive), fallback to User object 'archiveStatus'
                const isArchiveEnabled = (reportInfo && reportInfo.hasArchive !== undefined) ?
                    reportInfo.hasArchive :
                    (user.archiveStatus && user.archiveStatus.toLowerCase() === 'active');

                const hasExchange = user.assignedPlans?.some(p => p.service === 'Exchange' && p.capabilityStatus === 'Enabled');
                const isSynced = user.onPremisesSyncEnabled === true;

                // Safely format bytes to GB
                const formatGB = (bytes) => (bytes ? (bytes / 1073741824).toFixed(2) : "0.00");
                const quotaGB = (bytes) => (bytes ? (bytes / 1073741824).toFixed(0) : "0");

                // Get Quota - prefer prohibitSendReceiveQuotaInBytes from report
                const quotaBytes = reportInfo?.prohibitSendReceiveQuotaInBytes || reportInfo?.archiveQuotaInBytes;

                return {
                    displayName: user.displayName,
                    userPrincipalName: user.userPrincipalName, // Explicit UPN
                    emailAddress: user.mail || user.userPrincipalName,
                    jobTitle: user.jobTitle || '',
                    department: user.department || '',
                    officeLocation: user.officeLocation || '',
                    city: user.city || '',
                    country: user.country || '',
                    accountEnabled: user.accountEnabled ? 'Yes' : 'No',
                    createdDateTime: user.createdDateTime,

                    // Mailbox Report Data
                    lastActivityDate: reportInfo?.lastActivityDate || 'N/A',
                    itemCount: reportInfo?.itemCount || 0,
                    deletedItemCount: reportInfo?.deletedItemCount || 0,

                    archivePolicy: isArchiveEnabled,
                    retentionPolicy: reportInfo?.retentionPolicy || (reportInfo ? "Applied" : (isArchiveEnabled ? "See PowerShell" : (hasExchange ? "Default MRT" : "None"))),
                    autoExpanding: "N/A (PowerShell)",

                    mailboxSize: reportInfo ? `${formatGB(reportInfo.storageUsedInBytes)} GB` : "0.00 GB",
                    quotaUsedPct: reportInfo ? Math.round((reportInfo.storageUsedInBytes / (quotaBytes || 1)) * 100) + '%' : '0%',

                    issueWarningQuota: formatGB(reportInfo?.issueWarningQuotaInBytes) + ' GB',
                    prohibitSendQuota: formatGB(reportInfo?.prohibitSendQuotaInBytes) + ' GB',
                    prohibitSendReceiveQuota: formatGB(quotaBytes) + ' GB',

                    migrationStatus: isSynced ? "Migrated" : "Cloud Native",
                    dataMigrated: reportInfo ? `${formatGB(reportInfo.storageUsedInBytes)} GB` : "N/A"
                };
            });

            return {
                reports: detailedReports,
                isConcealed: isConcealed
            };
        } catch (error) {
            console.error("Graph API Error:", error);
            throw error;
        }
    }
    /**
     * Fetches email activity report for the last 7 days.
     * Returns user-level details on send/receive counts.
     */
    async getEmailActivityUserDetail(period = 'D7') {
        try {
            // Using Beta endpoint for JSON format support
            const reportUrl = `https://graph.microsoft.com/beta/reports/getEmailActivityUserDetail(period='${period}')?$format=application/json`;
            const response = await fetch(reportUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`
                },
                redirect: "manual"
            });

            let data = [];
            if (response.status === 302 || response.status === 301) {
                const redirectUrl = response.headers.get("Location");
                if (redirectUrl) {
                    const dataResponse = await fetch(redirectUrl);
                    if (dataResponse.ok) {
                        const json = await dataResponse.json();
                        data = json.value || [];
                    }
                }
            } else if (response.ok) {
                const json = await response.json();
                data = json.value || [];
            } else {
                console.warn(`Email activity fetch returned status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error("getEmailActivityUserDetail Error:", error);
            // Return empty array instead of throwing to prevent blocking other dashboard data
            return [];
        }
    }

    /**
     * Fetches daily email activity counts (aggregates).
     */
    async getEmailActivityCounts(period = 'D7') {
        try {
            const reportUrl = `https://graph.microsoft.com/beta/reports/getEmailActivityCounts(period='${period}')?$format=application/json`;
            const response = await fetch(reportUrl, {
                method: "GET",
                headers: { "Authorization": `Bearer ${this.accessToken}` },
                redirect: "manual"
            });

            let data = [];
            if (response.status === 302 || response.status === 301) {
                const redirectUrl = response.headers.get("Location");
                if (redirectUrl) {
                    const r = await fetch(redirectUrl);
                    if (r.ok) {
                        const json = await r.json();
                        data = json.value || [];
                    }
                }
            } else if (response.ok) {
                const json = await response.json();
                data = json.value || [];
            }
            return data;
        } catch (error) {
            console.error("getEmailActivityCounts Error:", error);
            return [];
        }
    }

    async getLicensingData() {
        try {
            // 1. Get Subscribed SKUs (Tenant level licenses)
            const skusResponse = await this.client.api("/subscribedSkus").get();
            const skus = skusResponse.value;

            // 2. Get Users and their assigned licenses
            const usersResponse = await this.client.api("/users")
                .select("id,displayName,userPrincipalName,assignedLicenses")
                .top(50)
                .get();

            const users = usersResponse.value;

            // Map SKU IDs to Names for easier display if possible, or just return raw
            // We will return both sets of data
            return { skus, users };
        } catch (error) {
            console.error("Graph API Error (Licensing):", error);
            throw error;
        }
    }
    async getDomains() {
        try {
            const response = await this.client.api("/domains").get();
            return response.value || [];
        } catch (error) {
            console.error("Graph API Error (Domains):", error);
            throw error;
        }
    }
    async getGroups() {
        try {
            const response = await this.client.api("/groups").get();
            return response.value || [];
        } catch (error) {
            console.error("Graph API Error (Groups):", error);
            throw error;
        }
    }

    async getApplications() {
        try {
            const response = await this.client.api("/applications")
                .select("id,appId,displayName,createdDateTime,signInAudience")
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.error("Graph API Error (Applications):", error);
            return [];
        }
    }

    // Entra: Directory Audits
    async getDirectoryAudits() {
        try {
            return await this.client.api("/auditLogs/directoryAudits")
                .top(5)
                .orderby("activityDateTime desc")
                .get();
        } catch (error) {
            console.warn("Audit Logs access denied", error);
            return null;
        }
    }

    // Entra: Conditional Access Policies
    async getConditionalAccessPolicies() {
        try {
            const res = await this.client.api("/identity/conditionalAccess/policies")
                .select("id,displayName,state,createdDateTime")
                .top(100)
                .get();
            return res.value || [];
        } catch (error) {
            console.warn("CA Policies access denied", error);
            return [];
        }
    }

    // Entra: Global Admins Count
    async getGlobalAdmins() {
        try {
            // Need to ensure Directory Roles are activated/fetched first
            // But simple way is to query member objects
            // Role Template ID for Global Admin: "62e90394-69f5-4237-9190-012177145e10"
            const res = await this.client.api("/directoryRoles")
                .filter("roleTemplateId eq '62e90394-69f5-4237-9190-012177145e10'")
                .expand("members")
                .get();
            return res.value?.[0]?.members || [];
        } catch (error) {
            console.warn("Directory Roles access denied", error);
            return [];
        }
    }
}
