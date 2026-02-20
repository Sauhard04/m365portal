import RuntimeConfig from './config';

export const getMsalConfig = () => {
    // Use the ACTIVE tenant's clientId and authority.
    // RuntimeConfig.initialize() runs before this and applies the pending tenant
    // (set by TenantSelector before logoutRedirect) — so MSAL is initialized
    // with the correct credentials for the tenant being switched to.
    const clientId = RuntimeConfig.get('VITE_CLIENT_ID');
    const tenantId = RuntimeConfig.getActiveTenantId();
    const authority = tenantId
        ? `https://login.microsoftonline.com/${tenantId}`
        : 'https://login.microsoftonline.com/organizations';

    console.log(`[AuthConfig] MSAL clientId: ${clientId}, authority: ${authority}`);

    return {
        auth: {
            clientId,
            authority,
            redirectUri: window.location.origin,
            navigateToLoginRequestUrl: false,
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false,
        },
    };
};

export const loginRequest = {
    scopes: [
        // Core identity
        "User.Read",
        "Directory.Read.All",
        "AuditLog.Read.All",
        "Reports.Read.All",

        // Service health
        "ServiceHealth.Read.All",

        // Security & Compliance (admin consent required)
        "SecurityEvents.Read.All",
        "SecurityAlert.Read.All",
        "SecurityIncident.Read.All",
        "IdentityRiskyUser.Read.All",
        "IdentityRiskEvent.Read.All",

        // Purview / Information Protection (admin consent required)
        "InformationProtectionPolicy.Read",

        // Intune / Device Management (admin consent required)
        "DeviceManagementManagedDevices.Read.All",
        "DeviceManagementServiceConfig.Read.All",
        "DeviceManagementConfiguration.Read.All",
        "DeviceManagementApps.Read.All",

        // Policy & Governance
        "Policy.Read.All",
        "Agreement.Read.All",
        "UserAuthenticationMethod.Read.All",
        "AppRoleAssignment.ReadWrite.All",

        // SharePoint & Files
        "Sites.Read.All",
        "Files.Read.All",

        // Teams
        "Team.ReadBasic.All",
        "TeamSettings.Read.All",
        "Group.Read.All",

        // Threat Intelligence
        "ThreatHunting.Read.All",
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
