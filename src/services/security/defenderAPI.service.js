/**
 * Microsoft Defender API Service
 * Handles authentication and requests to https://api.security.microsoft.com
 */

import { PublicClientApplication } from '@azure/msal-browser';

class DefenderAPIService {
    constructor() {
        this.baseURL = 'https://api.security.microsoft.com';
        this.resource = 'https://security.microsoft.com';
        this.tokenCache = null;
        this.tokenExpiry = null;
    }

    /**
     * Initialize with MSAL instance
     * @param {PublicClientApplication} msalInstance
     */
    initialize(msalInstance) {
        this.msalInstance = msalInstance;
    }

    /**
     * Get access token for Defender API
     * Tokens are cached with 55-minute TTL
     */
    async getAccessToken() {
        // Check if cached token is still valid
        if (this.tokenCache && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.tokenCache;
        }

        try {
            const account = this.msalInstance.getAllAccounts()[0];
            if (!account) {
                throw new Error('No active account found');
            }

            const request = {
                scopes: [`${this.resource}/.default`],
                account: account
            };

            const response = await this.msalInstance.acquireTokenSilent(request);
            this.tokenCache = response.accessToken;
            // Set expiry to 55 minutes (refresh before 60min expiry)
            this.tokenExpiry = Date.now() + (55 * 60 * 1000);

            return response.accessToken;
        } catch (error) {
            console.error('Defender token acquisition failed:', error);

            // Fallback to interactive if silent fails
            try {
                const response = await this.msalInstance.acquireTokenPopup({
                    scopes: [`${this.resource}/.default`]
                });
                this.tokenCache = response.accessToken;
                this.tokenExpiry = Date.now() + (55 * 60 * 1000);
                return response.accessToken;
            } catch (popupError) {
                console.error('Interactive token acquisition failed:', popupError);
                throw popupError;
            }
        }
    }

    /**
     * Make authenticated request to Defender API
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {string} method - HTTP method
     * @param {object} options - Additional fetch options
     */
    async request(endpoint, method = 'GET', options = {}) {
        const token = await this.getAccessToken();
        const url = `${this.baseURL}${endpoint}`;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const fetchOptions = {
            method,
            headers,
            ...options
        };

        if (options.body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Defender API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Defender API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get security alerts from Defender
     * @param {object} filters - Query filters
     */
    async getAlerts(filters = {}) {
        let endpoint = '/api/alerts';

        // Build query string from filters
        const params = new URLSearchParams();
        if (filters.severity) params.append('$filter', `severity eq '${filters.severity}'`);
        if (filters.status) params.append('$filter', `status eq '${filters.status}'`);
        if (filters.top) params.append('$top', filters.top);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await this.request(endpoint);
    }

    /**
     * Get security incidents
     */
    async getIncidents(filters = {}) {
        let endpoint = '/api/incidents';

        const params = new URLSearchParams();
        if (filters.status) params.append('$filter', `status eq '${filters.status}'`);
        if (filters.top) params.append('$top', filters.top);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await this.request(endpoint);
    }

    /**
     * Get threat analytics overview
     * Requires Defender for Endpoint license
     */
    async getThreatAnalytics() {
        try {
            return await this.request('/api/threatanalytics/overview');
        } catch (error) {
            console.warn('Threat Analytics not available (may require Defender for Endpoint license)');
            return { activeThreats: 0, exposedDevices: 0, mitigation: { total: 0, mitigated: 0 } };
        }
    }

    /**
     * Get machines/devices with exposure levels
     * Requires Defender for Endpoint license
     */
    async getMachines(filters = {}) {
        try {
            let endpoint = '/api/machines';

            const params = new URLSearchParams();
            if (filters.exposureLevel) params.append('$filter', `exposureLevel eq '${filters.exposureLevel}'`);
            if (filters.top) params.append('$top', filters.top);

            if (params.toString()) {
                endpoint += `?${params.toString()}`;
            }

            return await this.request(endpoint);
        } catch (error) {
            console.warn('Machines API not available (may require Defender for Endpoint license)');
            return { value: [] };
        }
    }

    /**
     * Execute Advanced Hunting query
     * @param {string} query - KQL query string
     */
    async advancedHunting(query) {
        try {
            return await this.request('/api/advancedhunting/run', 'POST', {
                body: { Query: query }
            });
        } catch (error) {
            console.error('Advanced Hunting query failed:', error);
            return { Results: [] };
        }
    }

    /**
     * Get email threat data
     * Requires Microsoft Defender for Office 365
     */
    async getEmailThreats(period = 30) {
        try {
            const query = `
                EmailEvents
                | where Timestamp > ago(${period}d)
                | summarize 
                    TotalEmails = count(),
                    MalwareDetected = countif(ThreatTypes has "Malware"),
                    PhishingDetected = countif(ThreatTypes has "Phish"),
                    SpamFiltered = countif(ThreatTypes has "Spam")
                  by bin(Timestamp, 1d)
                | order by Timestamp desc
            `;

            return await this.advancedHunting(query);
        } catch (error) {
            console.warn('Email threats data not available');
            return { Results: [] };
        }
    }

    /**
     * Get top malware families
     */
    async getTopMalware(period = 30, limit = 10) {
        try {
            const query = `
                EmailEvents
                | where Timestamp > ago(${period}d) and ThreatTypes has "Malware"
                | summarize Count = count(), AffectedUsers = dcount(RecipientEmailAddress) by MalwareFamily
                | top ${limit} by Count desc
            `;

            return await this.advancedHunting(query);
        } catch (error) {
            console.warn('Top malware data not available');
            return { Results: [] };
        }
    }
}

// Create singleton instance
const defenderAPIService = new DefenderAPIService();

export default defenderAPIService;
