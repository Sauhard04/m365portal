import { Client } from "@microsoft/microsoft-graph-client";

let graphClient = undefined;

export const ensureClient = (authProvider) => {
    if (!graphClient) {
        graphClient = Client.initWithMiddleware({
            authProvider,
        });
    }
    return graphClient;
};

export const getUserDetails = async (authProvider) => {
    const client = ensureClient(authProvider);
    const user = await client.api("/me").get();
    return user;
};

export const getExchangeReport = async (authProvider, period = "D7") => {
    const client = ensureClient(authProvider);
    try {
        // We use .responseType('text') to get the raw CSV data.
        // The Graph API for reports often returns a 302 redirect, 
        // which the client should follow to get the actual CSV content.
        const response = await client.api(`/reports/getMailboxUsageDetail(period='${period}')`)
            .responseType('text')
            .get();

        if (!response || typeof response !== 'string') {
            console.error("Unexpected response type from Graph API:", typeof response);
            throw new Error("Invalid report data received from Microsoft Graph.");
        }

        return response;
    } catch (error) {
        console.error("Error in getExchangeReport:", error);
        throw error;
    }
};

export const getAllUsers = async (authProvider) => {
    const client = ensureClient(authProvider);
    const users = await client.api("/users").select("displayName,userPrincipalName,mail,id").get();
    return users.value;
};

// Migration status is often not directly in usage reports.
// We will simulate/fetch additional details if needed.
export const getMigrationStatus = async (authProvider, userPrincipalName) => {
    // In a real scenario, you might query specific migration endpoints or extension attributes.
    // For this implementation, we will simulate realistic data based on the user.
    const statuses = ["Completed", "In Progress", "Synced", "Failed", "Not Started"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const dataMigrated = (Math.random() * 10).toFixed(2) + " GB";
    const dataSynced = (Math.random() * 10).toFixed(2) + " GB";

    return {
        status,
        dataMigrated,
        dataSynced
    };
};
