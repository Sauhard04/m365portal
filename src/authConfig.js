import RuntimeConfig from './config';

export const getMsalConfig = () => ({
    auth: {
        clientId: RuntimeConfig.get('VITE_CLIENT_ID'),
        authority: `https://login.microsoftonline.com/${RuntimeConfig.get('VITE_TENANT_ID')}`,
        redirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    },
});

export const loginRequest = {
    scopes: [
        "User.Read",
        "Directory.Read.All",
        "Reports.Read.All",
        "AuditLog.Read.All",
        "DeviceManagementManagedDevices.Read.All",
        "DeviceManagementServiceConfig.Read.All",
        "ServiceHealth.Read.All"
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
        "AppRoleAssignment.ReadWrite.All",
        "AuditLog.Read.All",
        "UserAuthenticationMethod.Read.All"
    ]
};

export const sharepointScopes = {
    scopes: [
        "Sites.Read.All",
        "Files.Read.All",
        "Reports.Read.All",
        "ServiceHealth.Read.All"
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
        "Chat.Read",
        "Reports.Read.All"
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
        "SensitivityLabel.Read",
        "RecordsManagement.Read.All",
        "eDiscovery.Read.All"
    ]
};

export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    // Endpoint for Mailbox usage and settings
    mailboxSettingsEndpoint: "https://graph.microsoft.com/v1.0/users"
};
