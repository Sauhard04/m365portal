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
     * Mailbox Usage Detail Report
     */
    async getExchangeMailboxReport() {
        try {
            // Get users with beta properties
            const usersResponse = await this.client.api("/users")
                .version("beta")
                .select("id,displayName,userPrincipalName,mail,archiveStatus,assignedPlans,onPremisesSyncEnabled,userType,jobTitle,department,officeLocation,city,country,createdDateTime,accountEnabled,mobilePhone")
                .top(999)
                .get();

            const users = usersResponse.value;

            // Fetch usage report
            let usageReport = [];
            try {
                const reportUrl = "https://graph.microsoft.com/beta/reports/getMailboxUsageDetail(period='D7')?$format=application/json";
                const resp = await fetch(reportUrl, {
                    headers: { "Authorization": `Bearer ${this.accessToken}` },
                    redirect: "manual"
                });

                if (resp.ok) {
                    const json = await resp.json();
                    usageReport = json.value || [];
                } else if (resp.status === 302 || resp.status === 301) {
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
                console.warn("Mailbox usage report could not be synchronized.");
            }

            let isConcealed = false;
            const detailedReports = users.map((user) => {
                const upn = user.userPrincipalName.toLowerCase();
                const reportInfo = usageReport.find(r => r.userPrincipalName?.toLowerCase() === upn);

                if (usageReport.length > 0 && !isConcealed) {
                    const firstUPN = usageReport[0].userPrincipalName;
                    if (firstUPN && /^[A-F0-9]+$/.test(firstUPN)) isConcealed = true;
                }

                const isArchiveEnabled = (reportInfo && reportInfo.hasArchive !== undefined) ?
                    reportInfo.hasArchive :
                    (user.archiveStatus && user.archiveStatus.toLowerCase() === 'active');

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
        try {
            const reportUrl = `https://graph.microsoft.com/beta/reports/getEmailActivityUserDetail(period='${period}')?$format=application/json`;
            const response = await fetch(reportUrl, {
                method: "GET",
                headers: { "Authorization": `Bearer ${this.accessToken}` },
                redirect: "manual"
            });

            if (response.status === 302 || response.status === 301) {
                const redirectUrl = response.headers.get("Location");
                const dataResponse = await fetch(redirectUrl);
                const json = await dataResponse.json();
                return json.value || [];
            } else if (response.ok) {
                const json = await response.json();
                return json.value || [];
            }
            return [];
        } catch (error) {
            return [];
        }
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

    async getSecureScore() {
        const res = await this.client.api("/security/secureScores").top(1).select("currentScore,maxScore,createdDateTime").orderby("createdDateTime desc").get().catch(() => ({ value: [] }));
        return res.value?.[0] || null;
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

    async getDeviceComplianceStats() {
        if (!GraphService.isIntuneOperational) {
            return { total: 0, compliant: 0 };
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
                compliant: overview.compliantDeviceCount || 0
            };
        } catch (e) {
            return { total: 0, compliant: 0 };
        }
    }
}
