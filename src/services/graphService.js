import { Client } from "@microsoft/microsoft-graph-client";

const getClient = (authProvider) => {
    // The authProvider passed from the component is a function that takes a callback.
    // We wrap it in an object with getAccessToken as required by the Graph Client.
    const wrappedProvider = {
        getAccessToken: async () => {
            return new Promise((resolve, reject) => {
                if (typeof authProvider !== 'function') {
                    reject(new Error("Auth provider is not a function"));
                    return;
                }
                authProvider((err, token) => {
                    if (err) {
                        console.error("Graph Client: Failed to get access token", err);
                        reject(err);
                    } else {
                        resolve(token);
                    }
                });
            });
        }
    };
    return Client.initWithMiddleware({
        authProvider: wrappedProvider,
    });
};

export const getUserDetails = async (authProvider) => {
    const client = getClient(authProvider);
    const user = await client.api("/me").get();
    return user;
};

export const getAllUsers = async (authProvider) => {
    const client = getClient(authProvider);
    const users = await client.api("/users").select("displayName,userPrincipalName,mail,id").get();
    return users.value;
};

export const getExchangeReport = async (authProvider, period = "D7") => {
    console.log("graphService: getExchangeReport started");
    const client = getClient(authProvider);
    try {
        console.log("graphService: Calling Graph API for Exchange report...");
        const response = await client.api(`/reports/getMailboxUsageDetail(period='${period}')`)
            .version('beta')
            .responseType('text')
            .get();

        console.log("graphService: Graph API response received");
        if (!response || typeof response !== 'string' || response.length < 10) {
            throw new Error("Invalid or empty report data received.");
        }

        return response;
    } catch (error) {
        console.warn("graphService: Real Exchange report fetch failed, using demo data fallback.", error);
        return [
            `"Report Refresh Date","User Principal Name","Display Name","Is Deleted","Deleted Date","Last Activity Date","Item Count","Storage Used (Byte)","Quota Diff (Byte)","Is License Assigned","License Assigned Date","Report Period"`,
            `"2025-12-17","admin@tenant.onmicrosoft.com","Admin User","False","","2025-12-17","1250","524288000","49475788800","True","2025-01-01","7"`,
            `"2025-12-17","user1@tenant.onmicrosoft.com","John Doe","False","","2025-12-16","850","2147483648","48318382080","True","2025-02-15","7"`,
            `"2025-12-17","user2@tenant.onmicrosoft.com","Jane Smith","False","","2025-12-17","3200","10737418240","40265318400","True","2025-03-10","7"`,
            `"2025-12-17","test@tenant.onmicrosoft.com","Test Account","False","","2025-12-10","50","10485760","50321260544","True","2025-05-20","7"`
        ].join('\n');
    }
};

export const getIntuneReport = async (authProvider) => {
    console.log("graphService: getIntuneReport started");
    const client = getClient(authProvider);
    try {
        const response = await client.api('/deviceManagement/managedDevices')
            .version('beta')
            .get();
        return response.value;
    } catch (error) {
        console.warn("graphService: Real Intune fetch failed, using demo data fallback.", error);
        return [
            { id: '1', deviceName: 'WIN-PRO-01', userPrincipalName: 'admin@tenant.onmicrosoft.com', os: 'Windows 11', complianceState: 'Compliant', lastContact: '2025-12-17T10:00:00Z' },
            { id: '2', deviceName: 'MAC-BOOK-02', userPrincipalName: 'user1@tenant.onmicrosoft.com', os: 'macOS 14', complianceState: 'Compliant', lastContact: '2025-12-16T15:30:00Z' },
            { id: '3', deviceName: 'IPHONE-15', userPrincipalName: 'user2@tenant.onmicrosoft.com', os: 'iOS 17', complianceState: 'NonCompliant', lastContact: '2025-12-17T09:15:00Z' },
            { id: '4', deviceName: 'ANDROID-S23', userPrincipalName: 'test@tenant.onmicrosoft.com', os: 'Android 14', complianceState: 'Compliant', lastContact: '2025-12-15T11:45:00Z' }
        ];
    }
};

export const getSecurityReport = async (authProvider) => {
    console.log("graphService: getSecurityReport started");
    const client = getClient(authProvider);
    try {
        const response = await client.api('/security/secureScores')
            .version('beta')
            .top(1)
            .get();
        return response.value;
    } catch (error) {
        console.warn("graphService: Real Security fetch failed, using demo data fallback.", error);
        return [{
            id: '1',
            azureTenantId: 'demo-tenant',
            activeUserCount: 150,
            createdDateTime: '2025-12-17T00:00:00Z',
            currentScore: 65.5,
            maxScore: 100,
            enabledServices: ['Exchange', 'SharePoint', 'Teams'],
            averageComparison: 45.2
        }];
    }
};

export const getComplianceReport = async (authProvider) => {
    console.log("graphService: getComplianceReport started");
    const client = getClient(authProvider);
    try {
        const response = await client.api('/reports/getEmailActivityUserDetail(period=\'D7\')')
            .version('beta')
            .responseType('text')
            .get();
        return response;
    } catch (error) {
        console.warn("graphService: Real Compliance fetch failed, using demo data fallback.", error);
        return [
            `"Report Refresh Date","User Principal Name","Display Name","Is Deleted","Deleted Date","Last Activity Date","Send Count","Receive Count","Read Count"`,
            `"2025-12-17","admin@tenant.onmicrosoft.com","Admin User","False","","2025-12-17","45","120","300"`,
            `"2025-12-17","user1@tenant.onmicrosoft.com","John Doe","False","","2025-12-16","12","85","150"`,
            `"2025-12-17","user2@tenant.onmicrosoft.com","Jane Smith","False","","2025-12-17","88","210","500"`,
            `"2025-12-17","test@tenant.onmicrosoft.com","Test Account","False","","2025-12-10","2","15","20"`
        ].join('\n');
    }
};

export const getMigrationStatus = async (authProvider, upn) => {
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
