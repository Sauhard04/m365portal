export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    }
};

// Scopes for the Graph API calls we need
export const loginRequest = {
    scopes: [
        "User.Read",
        "Directory.Read.All",
        "Reports.Read.All",
        "MailboxSettings.Read",
        "ServiceHealth.Read.All",
        "AuditLog.Read.All",
        "DeviceManagementManagedDevices.Read.All"
    ]
};

export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    // Endpoint for Mailbox usage and settings
    mailboxSettingsEndpoint: "https://graph.microsoft.com/v1.0/users"
};
