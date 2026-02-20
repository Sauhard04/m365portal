/**
 * Runtime configuration manager
 *
 * MULTI-TENANT ARCHITECTURE (separate accounts per tenant):
 * ─────────────────────────────────────────────────────────
 * When the user switches tenants:
 *   1. TenantSelector saves the target tenantId to `m365_pending_tenant` (global key)
 *   2. TenantSelector calls msalInstance.logoutRedirect() to clear the current session
 *   3. After redirect back, initialize() reads `m365_pending_tenant` to configure
 *      MSAL with the new tenant's clientId and authority BEFORE the app renders
 *   4. LandingPage auto-triggers loginRedirect for the new tenant
 *   5. User logs in with the new tenant's credentials
 *   6. LandingPage clears `m365_pending_tenant` and sets the user-scoped active tenant
 *
 * Active tenant preferences are stored per-user under `m365_active_tenant_{homeAccountId}`
 * so different users on the same browser have isolated preferences.
 */

const PENDING_TENANT_KEY = 'm365_pending_tenant';

class RuntimeConfig {
    constructor() {
        this.primaryConfig = {
            VITE_CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
            VITE_TENANT_ID: import.meta.env.VITE_TENANT_ID,
            VITE_GROQ_API_KEY: import.meta.env.VITE_GROQ_API_KEY,
            VITE_PURVIEW_ACCOUNT_NAME: import.meta.env.VITE_PURVIEW_ACCOUNT_NAME,
            VITE_PURVIEW_ENDPOINT: import.meta.env.VITE_PURVIEW_ENDPOINT,
            VITE_WEB3FORMS_ACCESS_KEY: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
            tenants: []
        };
        this.activeConfig = { ...this.primaryConfig };
        this.activeTenantId = null;
        this.activeTenantName = null;
        this._currentUserAccountId = null;
        this.initialized = false;
    }

    // ─── Pending Tenant (used during logout/re-login switch) ───────────────────

    /**
     * Store the FULL tenant config so initialize() can apply it directly
     * without needing a database round-trip.
     * @param {string} tenantId
     * @param {string} clientId  - the app registration clientId for this tenant
     * @param {string} [displayName]
     * @param {boolean} [autoLogin] - if true, LandingPage will auto-trigger loginRedirect on reload
     *                                Set to true ONLY from explicit user actions (Sign In button / TenantSelector).
     *                                Prevents stale pending tenants from bypassing the tenant picker.
     */
    setPendingTenant(tenantId, clientId, displayName = '', autoLogin = false) {
        const payload = JSON.stringify({ tenantId, clientId, displayName, autoLogin });
        localStorage.setItem(PENDING_TENANT_KEY, payload);
        console.log(`[RuntimeConfig] 🔄 Pending tenant set: ${displayName || tenantId} (clientId: ${clientId}, autoLogin: ${autoLogin})`);
    }

    /** Returns { tenantId, clientId, displayName } or null */
    getPendingTenant() {
        const raw = localStorage.getItem(PENDING_TENANT_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            // Accept both old format (plain string) and new format (JSON object)
            if (typeof parsed === 'string') return { tenantId: parsed, clientId: null };
            return parsed;
        } catch {
            // Legacy: key was stored as a plain tenantId string
            return { tenantId: raw, clientId: null };
        }
    }

    clearPendingTenant() {
        localStorage.removeItem(PENDING_TENANT_KEY);
        console.log('[RuntimeConfig] ✅ Pending tenant cleared');
    }

    // ─── User-scoped active tenant (stored after successful login) ─────────────

    _getTenantStorageKey(accountId = null) {
        const id = accountId || this._currentUserAccountId;
        if (id) return `m365_active_tenant_${id}`;
        return null; // No fallback to global key - avoid cross-user contamination
    }

    /**
     * Called after MSAL resolves the logged-in account.
     * Reads the user-scoped tenant preference and fires 'm365_tenant_changed'.
     */
    setCurrentUser(homeAccountId) {
        if (!homeAccountId) return;
        if (this._currentUserAccountId === homeAccountId && this.activeTenantId) return;

        console.log(`[RuntimeConfig] 👤 User context set: ${homeAccountId}`);
        this._currentUserAccountId = homeAccountId;

        const key = this._getTenantStorageKey();
        const savedTenantId = key ? localStorage.getItem(key) : null;
        const tenants = this.primaryConfig.tenants || [];

        let resolvedTenantId;

        if (savedTenantId && tenants.find(t => t.tenantId === savedTenantId)) {
            const active = tenants.find(t => t.tenantId === savedTenantId);
            console.log(`[RuntimeConfig] ✅ Restored tenant for user: ${active.displayName}`);
            this.activeConfig.VITE_TENANT_ID = active.tenantId;
            this.activeConfig.VITE_CLIENT_ID = active.clientId;
            resolvedTenantId = savedTenantId;
        } else {
            console.log(`[RuntimeConfig] ℹ️ No user-scoped tenant found, using current active.`);
            resolvedTenantId = this.activeTenantId || this.primaryConfig.VITE_TENANT_ID;
        }

        this.activeTenantId = resolvedTenantId;

        window.dispatchEvent(new CustomEvent('m365_tenant_changed', {
            detail: { tenantId: resolvedTenantId }
        }));
    }

    // ─── Core initialization (runs in main.jsx BEFORE MSAL is created) ─────────

    async initialize() {
        if (this.initialized) return;
        console.log('[RuntimeConfig] 🚀 Initializing...');

        // ── STEP 1: Read pending tenant IMMEDIATELY from localStorage ──────────
        // Must happen BEFORE any async work. The clientId stored here is what
        // MSAL needs to boot correctly, and we cannot let a fetch failure erase it.
        const pending = this.getPendingTenant();
        if (pending) {
            console.log(`[RuntimeConfig] 📦 Found pending tenant in localStorage:`, pending);
        }

        // ── STEP 2: Fetch runtime config from server ───────────────────────────
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();
                if (data.VITE_CLIENT_ID) this.primaryConfig.VITE_CLIENT_ID = data.VITE_CLIENT_ID;
                if (data.VITE_TENANT_ID) this.primaryConfig.VITE_TENANT_ID = data.VITE_TENANT_ID;
                if (data.VITE_GROQ_API_KEY) this.primaryConfig.VITE_GROQ_API_KEY = data.VITE_GROQ_API_KEY;
                if (data.VITE_PURVIEW_ACCOUNT_NAME) this.primaryConfig.VITE_PURVIEW_ACCOUNT_NAME = data.VITE_PURVIEW_ACCOUNT_NAME;
                if (data.VITE_PURVIEW_ENDPOINT) this.primaryConfig.VITE_PURVIEW_ENDPOINT = data.VITE_PURVIEW_ENDPOINT;
                if (data.VITE_WEB3FORMS_ACCESS_KEY) this.primaryConfig.VITE_WEB3FORMS_ACCESS_KEY = data.VITE_WEB3FORMS_ACCESS_KEY;
                if (data.tenants) this.primaryConfig.tenants = data.tenants;
                console.log('[RuntimeConfig] ✅ Server config loaded. Tenants:', (data.tenants || []).map(t => t.displayName));
            } else {
                console.warn('[RuntimeConfig] ⚠️ /api/config returned non-OK:', response.status);
            }
        } catch (error) {
            console.warn('[RuntimeConfig] ⚠️ /api/config fetch failed (proxy may not be configured):', error.message);
            // Not a fatal error — we still have build-time env vars in primaryConfig
            // and the pending tenant (if any) will be applied below.
        }

        // ── STEP 3: Apply pending tenant OR fall back to primary ───────────────
        // This runs REGARDLESS of whether the server fetch succeeded.
        if (pending && pending.tenantId && pending.clientId) {
            const dbTenant = (this.primaryConfig.tenants || []).find(t => t.tenantId === pending.tenantId);
            const displayName = dbTenant?.displayName || pending.displayName || pending.tenantId;

            console.log(`[RuntimeConfig] 🔄 Applying pending tenant: ${displayName}`);
            console.log(`[RuntimeConfig]   tenantId : ${pending.tenantId}`);
            console.log(`[RuntimeConfig]   clientId : ${pending.clientId}`);

            this.activeConfig = {
                ...this.primaryConfig,
                VITE_CLIENT_ID: pending.clientId,   // ← from localStorage, authoritative
                VITE_TENANT_ID: pending.tenantId,
            };
            this.activeTenantId = pending.tenantId;
            this.activeTenantName = displayName;
        } else if (pending && pending.tenantId) {
            // Legacy: pending has tenantId only → look up clientId from DB
            const dbTenant = (this.primaryConfig.tenants || []).find(t => t.tenantId === pending.tenantId);
            if (dbTenant) {
                console.log(`[RuntimeConfig] 🔄 Applying pending tenant (legacy lookup): ${dbTenant.displayName}`);
                this.activeConfig = {
                    ...this.primaryConfig,
                    VITE_CLIENT_ID: dbTenant.clientId,
                    VITE_TENANT_ID: dbTenant.tenantId,
                };
                this.activeTenantId = dbTenant.tenantId;
                this.activeTenantName = dbTenant.displayName;
            } else {
                console.warn(`[RuntimeConfig] ⚠️ Legacy pending tenant ${pending.tenantId} not in DB, using primary`);
                this.clearPendingTenant();
                this._applyPrimary();
            }
        } else {
            this._applyPrimary();
        }

        console.log(`[RuntimeConfig] 🏁 Ready — clientId: ${this.activeConfig.VITE_CLIENT_ID}, tenantId: ${this.activeTenantId}`);
        this.initialized = true;
    }


    _applyPrimary() {
        this.activeConfig = { ...this.primaryConfig };
        this.activeTenantId = this.primaryConfig.VITE_TENANT_ID;
    }

    // ─── Getters ────────────────────────────────────────────────────────────────

    get(key) {
        return this.activeConfig[key];
    }

    getPortalConfig(key) {
        return this.primaryConfig[key];
    }

    getTenants() {
        return this.primaryConfig.tenants || [];
    }

    getActiveTenantId() {
        return this.activeTenantId || this.primaryConfig.VITE_TENANT_ID;
    }

    getActiveTenantName() {
        return this.activeTenantName;
    }

    /**
     * Saves the user's chosen tenant preference to their user-scoped key.
     * Called by LandingPage AFTER a successful login.
     */
    setActiveTenant(tenantId, homeAccountId = null) {
        const effectiveAccountId = homeAccountId || this._currentUserAccountId;
        this.activeTenantId = tenantId;

        if (effectiveAccountId) {
            const key = `m365_active_tenant_${effectiveAccountId}`;
            localStorage.setItem(key, tenantId);
            console.log(`[RuntimeConfig] 💾 Saved tenant ${tenantId} for user ${effectiveAccountId}`);
        }

        const active = (this.primaryConfig.tenants || []).find(t => t.tenantId === tenantId);
        if (active) {
            this.activeConfig.VITE_TENANT_ID = active.tenantId;
            this.activeConfig.VITE_CLIENT_ID = active.clientId;
            this.activeTenantName = active.displayName;
        }
    }
}

const configInstance = new RuntimeConfig();
export default configInstance;
