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
// Scopes for the Graph API calls we need
export const loginRequest = {
    scopes: [
        "User.Read",
        "Directory.Read.All",
        "Reports.Read.All",
        "MailboxSettings.Read",
        "ServiceHealth.Read.All",
        "AuditLog.Read.All",
        "Sites.Read.All",
        // Security
        "SecurityAlert.Read.All",
        "SecurityIncident.Read.All",
        "IdentityRiskyUser.Read.All",
        "IdentityRiskEvent.Read.All",
        // Governance
        "Policy.Read.All",
        "Agreement.Read.All",
        "AppRoleAssignment.ReadWrite.All",
        // SharePoint
        "Files.Read.All",
        // Intune
        "DeviceManagementManagedDevices.Read.All",
        "DeviceManagementServiceConfig.Read.All",
        "DeviceManagementApps.Read.All",
        "DeviceManagementConfiguration.Read.All",
        "ThreatHunting.Read.All",
        // Teams
        "Team.ReadBasic.All",
        "TeamSettings.Read.All",
        "Group.Read.All",
        "Chat.Read",
        // Admin
        "Organization.Read.All",
        // Purview
        "InformationProtectionPolicy.Read",
        "RecordsManagement.Read.All",
        "eDiscovery.Read.All"
    ]
};

// Granular scopes for specific modules
export const securityScopes = {
    scopes: [
        "SecurityAlert.Read.All",
        "SecurityIncident.Read.All",
        "IdentityRiskyUser.Read.All",
        "IdentityRiskEvent.Read.All"
    ]
};

export const governanceScopes = {
    scopes: [
        "Policy.Read.All",
        "Agreement.Read.All",
        "Directory.Read.All",
        "AppRoleAssignment.ReadWrite.All"
    ]
};

export const sharepointScopes = {
    scopes: [
        "Sites.Read.All",
        "Files.Read.All"
    ]
};

export const intuneScopes = {
    scopes: [
        "DeviceManagementManagedDevices.Read.All",
        "DeviceManagementServiceConfig.Read.All",
        "DeviceManagementApps.Read.All",
        "DeviceManagementConfiguration.Read.All",
        "IdentityRiskyUser.Read.All",
        "IdentityRiskEvent.Read.All",
        "SecurityAlert.Read.All",
        "ThreatHunting.Read.All"
    ]
};

export const teamsScopes = {
    scopes: [
        "Team.ReadBasic.All",
        "TeamSettings.Read.All",
        "Group.Read.All",
        "Chat.Read"
    ]
};

export const adminScopes = {
    scopes: [
        "Directory.Read.All",
        "ServiceHealth.Read.All",
        "Organization.Read.All"
    ]
};

export const purviewScopes = {
    scopes: [
        "InformationProtectionPolicy.Read",
        "RecordsManagement.Read.All",
        "eDiscovery.Read.All"
    ]
};

export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    // Endpoint for Mailbox usage and settings
    mailboxSettingsEndpoint: "https://graph.microsoft.com/v1.0/users"
};
