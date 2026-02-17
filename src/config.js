/**
 * Runtime configuration manager
 * Holds settings fetched from the server /api/config
 */
class RuntimeConfig {
    constructor() {
        this.config = {
            VITE_CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
            VITE_TENANT_ID: import.meta.env.VITE_TENANT_ID,
            VITE_GROQ_API_KEY: import.meta.env.VITE_GROQ_API_KEY,
            VITE_PURVIEW_ACCOUNT_NAME: import.meta.env.VITE_PURVIEW_ACCOUNT_NAME,
            VITE_PURVIEW_ENDPOINT: import.meta.env.VITE_PURVIEW_ENDPOINT,
            VITE_WEB3FORMS_ACCESS_KEY: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
            tenants: []
        };
        this.activeTenantId = localStorage.getItem('m365_active_tenant') || null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('[RuntimeConfig] Fetching configuration from server...');
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();

                // Only override if we got actual values (avoid overriding with undefined if endpoint fails)
                if (data.VITE_CLIENT_ID) this.config.VITE_CLIENT_ID = data.VITE_CLIENT_ID;
                if (data.VITE_TENANT_ID) this.config.VITE_TENANT_ID = data.VITE_TENANT_ID;
                if (data.VITE_GROQ_API_KEY) this.config.VITE_GROQ_API_KEY = data.VITE_GROQ_API_KEY;
                if (data.VITE_PURVIEW_ACCOUNT_NAME) this.config.VITE_PURVIEW_ACCOUNT_NAME = data.VITE_PURVIEW_ACCOUNT_NAME;
                if (data.VITE_PURVIEW_ENDPOINT) this.config.VITE_PURVIEW_ENDPOINT = data.VITE_PURVIEW_ENDPOINT;
                if (data.VITE_WEB3FORMS_ACCESS_KEY) this.config.VITE_WEB3FORMS_ACCESS_KEY = data.VITE_WEB3FORMS_ACCESS_KEY;
                if (data.tenants) this.config.tenants = data.tenants;

                // Handle dynamic tenant override
                if (this.activeTenantId && data.tenants) {
                    const active = data.tenants.find(t => t.tenantId === this.activeTenantId);
                    if (active) {
                        console.log(`[RuntimeConfig] Overriding current config with active tenant: ${active.displayName}`);
                        this.config.VITE_TENANT_ID = active.tenantId;
                        this.config.VITE_CLIENT_ID = active.clientId;
                    }
                }

                console.log('[RuntimeConfig] Configuration loaded successfully');
            } else {
                console.warn('[RuntimeConfig] Failed to fetch server config, using build-time defaults');
            }
        } catch (error) {
            console.error('[RuntimeConfig] Error fetching config:', error);
        } finally {
            this.initialized = true;
        }
    }

    get(key) {
        return this.config[key];
    }

    getTenants() {
        return this.config.tenants || [];
    }

    getActiveTenantId() {
        return this.activeTenantId || this.config.VITE_TENANT_ID;
    }

    setActiveTenant(tenantId) {
        console.log(`[RuntimeConfig] Switching to tenant: ${tenantId}`);
        this.activeTenantId = tenantId;
        localStorage.setItem('m365_active_tenant', tenantId);
        // Force reload to re-initialize MSAL with new config
        window.location.reload();
    }
}

const configInstance = new RuntimeConfig();
export default configInstance;
