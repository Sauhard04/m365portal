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
const LAST_ACTIVE_TENANT_KEY = 'm365_last_active_tenant'; // Global hint for initialize()

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
        const clientId = this.activeConfig.VITE_CLIENT_ID;
        if (id && clientId) return `m365_active_tenant_${clientId}_${id}`;
        return null;
    }

    /**
     * Called after MSAL resolves the logged-in account.
     * Reads the user-scoped tenant preference and fires 'm365_tenant_changed'.
     */
    setCurrentUser(homeAccountId) {
        if (!homeAccountId) return;

        // Only return early if BOTH the user and the active tenant are already set and correct.
        // If we just reloaded as part of a switch, activeTenantId might have changed
        // while _currentUserAccountId stayed the same.
        if (this._currentUserAccountId === homeAccountId && this.activeTenantId) {
            console.log(`[RuntimeConfig] 👤 User context already correct: ${homeAccountId}`);
            return;
        }

        console.log(`[RuntimeConfig] 👤 User context set: ${homeAccountId}`);
        this._currentUserAccountId = homeAccountId;

        const key = this._getTenantStorageKey();
        const savedTenantId = key ? localStorage.getItem(key) : null;
        const tenants = this.primaryConfig.tenants || [];

        let resolvedTenantId = this.activeTenantId;

        // IDENTITY PROTECTION: 
        // We only restore from user-scoped storage if we are in the "Default/Primary" 
        // environment AND we have a valid preference. 
        // If this.activeTenantId was already set (e.g. by initialize() from a pending switch),
        // we MUST NOT let the old user preference overwrite it.
        const isCurrentlyPrimary = this.activeTenantId === this.primaryConfig.VITE_TENANT_ID;
        const hasSavedPreference = savedTenantId && tenants.find(t => t.tenantId === savedTenantId);

        if (hasSavedPreference && isCurrentlyPrimary && savedTenantId !== this.activeTenantId) {
            const active = tenants.find(t => t.tenantId === savedTenantId);
            console.log(`[RuntimeConfig] ✅ Restoring user preference: ${active.displayName}`);
            this.activeConfig.VITE_TENANT_ID = active.tenantId;
            this.activeConfig.VITE_CLIENT_ID = active.clientId;
            resolvedTenantId = savedTenantId;
        } else if (hasSavedPreference && !isCurrentlyPrimary) {
            console.log(`[RuntimeConfig] 🛡️ Switch in progress: Preserving active tenant ${this.activeTenantId}, ignoring old preference ${savedTenantId}`);
        } else {
            console.log(`[RuntimeConfig] ℹ️ Context maintained: ${this.activeTenantId}`);
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

        // ── STEP 3: Apply pending tenant OR last active hint OR fall back ────────
        // This runs REGARDLESS of whether the server fetch succeeded.
        if (pending && pending.tenantId && pending.clientId) {
            console.log(`[RuntimeConfig] 🔄 Applying pending tenant switch: ${pending.displayName || pending.tenantId}`);
            this._applyConfig(pending.tenantId, pending.clientId, pending.displayName);
        } else {
            // No switch in progress. Check if we have a hint from the last session.
            const hintRaw = localStorage.getItem(LAST_ACTIVE_TENANT_KEY);
            let hint = null;
            if (hintRaw) {
                try { hint = JSON.parse(hintRaw); } catch { hint = null; }
            }

            if (hint && hint.tenantId && hint.clientId) {
                console.log(`[RuntimeConfig] 💡 Restoring last active tenant environment: ${hint.displayName || hint.tenantId}`);
                this._applyConfig(hint.tenantId, hint.clientId, hint.displayName);
            } else {
                console.log('[RuntimeConfig] ℹ️ No pending or hint found, using environment defaults.');
                this._applyPrimary();
            }
        }

        console.log(`[RuntimeConfig] 🏁 Ready — clientId: ${this.activeConfig.VITE_CLIENT_ID}, tenantId: ${this.activeTenantId}`);
        this.initialized = true;
    }


    _applyConfig(tenantId, clientId, displayName = '') {
        this.activeConfig = {
            ...this.primaryConfig,
            VITE_CLIENT_ID: clientId,
            VITE_TENANT_ID: tenantId,
        };
        this.activeTenantId = tenantId;
        this.activeTenantName = displayName;
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
     * Centralized cleanup after a successful login (manual or redirect).
     * Clears pending state and sets the user context.
     */
    finishLogin(account) {
        if (!account) return;

        console.log(`[RuntimeConfig] 🏁 Finishing login for: ${account.username}`);

        // SAVE LOGIN HINT: Remember which email was used for this tenant
        this.setLoginHint(account.tenantId, account.username);

        // PERSIST ACTIVE TENANT
        this.setActiveTenant(account.tenantId, account.homeAccountId);

        // CLEAR PENDING STATE
        this.clearPendingTenant();

        // RESET LOOP PROTECTIONS
        const attemptKey = `m365_switch_attempts_${account.tenantId}`;
        localStorage.removeItem(attemptKey);

        // UPDATE USER CONTEXT
        this.setCurrentUser(account.homeAccountId);
    }

    /**
     * Saves the user's chosen tenant preference to their user-scoped key.
     * Called by LandingPage AFTER a successful login.
     */
    setActiveTenant(tenantId, homeAccountId = null) {
        const effectiveAccountId = homeAccountId || this._currentUserAccountId;
        this.activeTenantId = tenantId;

        const active = (this.primaryConfig.tenants || []).find(t => t.tenantId === tenantId);

        // Save to global hint key so initialize() uses the correct ClientId on reload
        if (active) {
            localStorage.setItem(LAST_ACTIVE_TENANT_KEY, JSON.stringify({
                tenantId: active.tenantId,
                clientId: active.clientId,
                displayName: active.displayName
            }));

            this.activeConfig.VITE_TENANT_ID = active.tenantId;
            this.activeConfig.VITE_CLIENT_ID = active.clientId;
            this.activeTenantName = active.displayName;
        }

        // Save to user-scoped key for preferences
        // Save to user-scoped key for preferences (scoped by clientId + accountId)
        if (effectiveAccountId) {
            const clientId = this.activeConfig.VITE_CLIENT_ID;
            if (clientId) {
                const key = `m365_active_tenant_${clientId}_${effectiveAccountId}`;
                localStorage.setItem(key, tenantId);
                console.log(`[RuntimeConfig] 💾 Saved tenant ${tenantId} for user ${effectiveAccountId} under clientId ${clientId}`);
            }
        }
    }

    /**
     * Store which email was used for which tenant to prevent "Account not in tenant" errors.
     * Scoped by clientId to ensure correct isolation.
     */
    setLoginHint(tenantId, username) {
        if (!tenantId || !username) return;
        const clientId = this.activeConfig.VITE_CLIENT_ID;
        const key = `m365_hint_${clientId}_${tenantId}`;
        localStorage.setItem(key, username);
        console.log(`[RuntimeConfig] 💡 Saved login hint for tenant ${tenantId} (client: ${clientId}): ${username}`);
    }

    getLoginHint(tenantId) {
        const clientId = this.activeConfig.VITE_CLIENT_ID;
        // Check specific scoped key first, fall back to legacy if needed
        return localStorage.getItem(`m365_hint_${clientId}_${tenantId}`) ||
            localStorage.getItem(`m365_hint_${tenantId}`);
    }
}

const configInstance = new RuntimeConfig();
export default configInstance;
