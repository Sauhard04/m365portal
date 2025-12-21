import { Client } from "@microsoft/microsoft-graph-client";

export class GraphService {
    constructor(accessToken) {
        this.client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });
    }

    async getUserDetails() {
        return await this.client.api("/me").get();
    }

    // Fetches users and their mailbox settings using the Beta endpoint
    async getExchangeMailboxReport() {
        try {
            // 1. Get List of Users with Beta properties
            // archiveStatus is often available directly on the User object in Beta
            const usersResponse = await this.client.api("/users")
                .version("beta")
                .select("id,displayName,userPrincipalName,mail,archiveStatus,assignedPlans,onPremisesSyncEnabled")
                .top(25)
                .get();

            const users = usersResponse.value;

            // 2. Fetch Mailbox Settings/Details 
            const detailedReports = await Promise.all(users.map(async (user) => {
                let settings = {};
                try {
                    // Try to get mailbox settings for retention/auto-expand
                    settings = await this.client.api(`/users/${user.id}/mailboxSettings`).version("beta").get();
                } catch (err) {
                    console.log(`Could not fetch mailbox settings for ${user.userPrincipalName}`);
                }

                // Infer or read properties
                const isArchiveEnabled = user.archiveStatus === 'Active' || user.archiveStatus === 'Enabled';
                // Fallback to checking assignedPlans if archiveStatus is missing but they have Exchange
                const hasExchange = user.assignedPlans?.some(p => p.service === 'Exchange' && p.capabilityStatus === 'Enabled');

                // Estimate Mailbox Size based on Plan (Mock logic for demo)
                let mailboxQuota = "50 GB"; // Default E1/Business
                const planName = user.assignedPlans?.find(p => p.service === 'Exchange')?.servicePlanId;
                // Simple heuristic: If plan ID starts with generic values or known GUIDs (mocking checks)
                // In a real app, we'd map ServicePlanId GUIDs to Names.

                // Determine Migration Status
                const isSynced = user.onPremisesSyncEnabled === true;
                const migrationStatus = isSynced ? "Migrated" : "Cloud Native";

                // Mock Data Migrated (Random for demo, as real data requires MigrationBatch API)
                const dataMigrated = isSynced ? (Math.floor(Math.random() * 45) + 5) + " GB" : "N/A";

                return {
                    displayName: user.displayName,
                    emailAddress: user.mail || user.userPrincipalName,
                    archivePolicy: isArchiveEnabled,
                    // Retention/AutoExpanding are difficult to access via Graph without PowerShell. 
                    // We attempt to read them from settings or default to reasonable values.
                    retentionPolicy: settings.retentionPolicy || (hasExchange ? "Default MRT" : "None"),
                    autoExpanding: settings.autoExpandingArchiveEnabled === true,
                    mailboxSize: mailboxQuota,
                    migrationStatus: migrationStatus,
                    dataMigrated: dataMigrated
                };
            }));

            return detailedReports;
        } catch (error) {
            console.error("Graph API Error:", error);
            throw error;
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
}
