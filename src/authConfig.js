import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
        redirectUri: "http://localhost:3000/", // Must match Azure exactly (trailing slash matters)
        postLogoutRedirectUri: "http://localhost:3000/",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
        },
    },
};

export const loginRequest = {
    scopes: ["User.Read", "Reports.Read.All", "MailboxSettings.Read"],
};

// Prevent multiple instances during HMR
let msalInstance;
if (!window.msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    window.msalInstance = msalInstance;
} else {
    msalInstance = window.msalInstance;
}

export { msalInstance };
