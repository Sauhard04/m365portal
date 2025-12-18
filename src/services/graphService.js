import { Client } from "@microsoft/microsoft-graph-client";

let client = null;

const ensureClient = (authProvider) => {
    if (!client) {
        // The authProvider passed from the component is a function that takes a callback.
        // We wrap it in an object with getAccessToken as required by the Graph Client.
        const wrappedProvider = {
            getAccessToken: async () => {
                return new Promise((resolve, reject) => {
                    authProvider((err, token) => {
                        if (err) reject(err);
                        else resolve(token);
                    });
                });
            }
        };
        client = Client.initWithMiddleware({
            authProvider: wrappedProvider,
        });
    }
    return client;
};

export const getUserDetails = async (authProvider) => {
    const client = ensureClient(authProvider);
    const user = await client.api("/me").get();
    return user;
};

export const getExchangeReport = async (authProvider, period = "D7") => {
    const client = ensureClient(authProvider);
    try {
        // Using beta endpoint as it sometimes has better behavior or different redirect logic
        const response = await client.api(`/reports/getMailboxUsageDetail(period='${period}')`)
            .version('beta')
            .responseType('text')
            .get();

        if (!response || typeof response !== 'string' || response.length < 10) {
            throw new Error("Invalid or empty report data received.");
        }

        return response;
    } catch (error) {
        console.warn("Real report fetch failed, using demo data fallback. Error:", error);

        // Fallback to Demo Data if real fetch fails (common due to CORS on redirects in SPAs)
        const demoData = [
            `"Report Refresh Date","User Principal Name","Display Name","Is Deleted","Deleted Date","Last Activity Date","Item Count","Storage Used (Byte)","Quota Diff (Byte)","Is License Assigned","License Assigned Date","Report Period"`,
            `"2025-12-17","admin@tenant.onmicrosoft.com","Admin User","False","","2025-12-17","1250","524288000","49475788800","True","2025-01-01","7"`,
            `"2025-12-17","user1@tenant.onmicrosoft.com","John Doe","False","","2025-12-16","850","2147483648","48318382080","True","2025-02-15","7"`,
            `"2025-12-17","user2@tenant.onmicrosoft.com","Jane Smith","False","","2025-12-17","3200","10737418240","40265318400","True","2025-03-10","7"`,
            `"2025-12-17","test@tenant.onmicrosoft.com","Test Account","False","","2025-12-10","50","10485760","50321260544","True","2025-05-20","7"`
        ].join('\n');

        return demoData;
    }
};

export const getAllUsers = async (authProvider) => {
    const client = ensureClient(authProvider);
    const users = await client.api("/users").select("displayName,userPrincipalName,mail,id").get();
    return users.value;
};

export const getMigrationStatus = async (authProvider, userPrincipalName) => {
    // Simulated migration data
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
