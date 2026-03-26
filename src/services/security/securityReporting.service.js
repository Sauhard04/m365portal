/**
 * Security Reporting Service - Main Entry Point
 * Provides high-level methods for fetching security reports
 */

import securityReportAggregator from './securityAggregator.service';
import GraphService from '../graphService';
import DefenderAPIService from './defenderAPI.service';

class SecurityReportingService {
    constructor() {
        this.aggregator = securityReportAggregator;
        this.initialized = false;
    }

    /**
     * Initialize services with MSAL instance
     */
    initialize(msalInstance) {
        if (!this.initialized) {
            GraphService.initialize(msalInstance);
            DefenderAPIService.initialize(msalInstance);
            this.initialized = true;
        }
    }

    // ============ GENERAL TAB REPORTS ============

    /**
     * Get Secure Score with trend data
     */
    async getSecureScore(tenantId = 'default') {
        return await this.aggregator.fetchReport(
            'secure-score',
            'SecureScore',
            'graph',
            { tenantId },
            240 // 4 hour cache
        );
    }

    /**
     * Get Security Alerts overview
     */
    async getSecurityAlerts(tenantId = 'default', filters = {}) {
        return await this.aggregator.fetchReport(
            'security-alerts',
            'SecurityAlerts',
            'graph',
            { tenantId, filters },
            15 // 15 minute cache
        );
    }

    /**
     * Get Security Incidents
     */
    async getIncidents(tenantId = 'default', filters = {}) {
        return await this.aggregator.fetchReport(
            'incidents',
            'Incidents',
            'graph',
            { tenantId, filters },
            15 // 15 minute cache
        );
    }

    /**
     * Get Threat Analytics (requires Defender for Endpoint)
     */
    async getThreatAnalytics(tenantId = 'default') {
        return await this.aggregator.fetchReport(
            'threat-analytics',
            'ThreatAnalytics',
            'defender',
            { tenantId },
            60 // 1 hour cache
        );
    }

    /**
     * Get Exposed Devices (requires Defender for Endpoint)
     */
    async getExposedDevices(tenantId = 'default', filters = {}) {
        return await this.aggregator.fetchReport(
            'exposed-devices',
            'ExposedDevices',
            'defender',
            { tenantId, filters },
            30 // 30 minute cache
        );
    }

    // ============ EMAIL & COLLABORATION REPORTS ============

    /**
     * Get Email Threat Protection status
     */
    async getEmailThreats(tenantId = 'default', period = 30) {
        return await this.aggregator.fetchReport(
            'email-threats',
            'EmailThreats',
            'defender',
            { tenantId, filters: { period } },
            60 // 1 hour cache
        );
    }

    /**
     * Get Top Malware families
     */
    async getTopMalware(tenantId = 'default', period = 30, limit = 10) {
        return await this.aggregator.fetchReport(
            'top-malware',
            'TopMalware',
            'defender',
            { tenantId, filters: { period, limit } },
            60 // 1 hour cache
        );
    }

    // ============ CLOUD APPS REPORTS ============

    /**
     * Get OAuth App Insights
     */
    async getOAuthApps(tenantId = 'default') {
        return await this.aggregator.fetchReport(
            'oauth-apps',
            'OAuthApps',
            'graph',
            { tenantId },
            120 // 2 hour cache
        );
    }

    // ============ IDENTITIES REPORTS ============

    /**
     * Get Risky Users
     */
    async getRiskyUsers(tenantId = 'default') {
        return await this.aggregator.fetchReport(
            'risky-users',
            'RiskyUsers',
            'graph',
            { tenantId },
            30 // 30 minute cache
        );
    }

    /**
     * Get Risk Detections
     */
    async getRiskDetections(tenantId = 'default', startDate = null) {
        const filters = {};
        if (startDate) {
            filters.startDate = startDate;
        } else {
            // Default to last 30 days
            filters.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return await this.aggregator.fetchReport(
            'risk-detections',
            'RiskDetections',
            'graph',
            { tenantId, filters },
            30 // 30 minute cache
        );
    }

    /**
     * Get Sign-in Logs
     */
    async getSignInLogs(tenantId = 'default', startDate = null, top = 1000) {
        const filters = { top };
        if (startDate) {
            filters.startDate = startDate;
        } else {
            // Default to last 7 days
            filters.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        }

        return await this.aggregator.fetchReport(
            'signin-logs',
            'SignInLogs',
            'graph',
            { tenantId, filters },
            15 // 15 minute cache
        );
    }

    /**
     * Get MFA Registration status
     */
    async getMFARegistration(tenantId = 'default') {
        return await this.aggregator.fetchReport(
            'mfa-registration',
            'MFARegistration',
            'graph',
            { tenantId },
            60 // 1 hour cache
        );
    }

    // ============ ANALYTICS & TRENDS ============

    /**
     * Calculate trend for a metric over periods
     * @param {number} current - Current period value
     * @param {number} previous - Previous period value
     */
    calculateTrend(current, previous) {
        if (previous === 0) {
            return {
                delta: current,
                percentageChange: current > 0 ? Infinity : 0,
                direction: current > 0 ? 'up' : 'stable',
                label: 'New'
            };
        }

        const delta = current - previous;
        const percentageChange = ((delta / previous) * 100).toFixed(2);
        const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';

        return {
            delta,
            percentageChange: parseFloat(percentageChange),
            direction,
            label: `${delta > 0 ? '+' : ''}${percentageChange}%`
        };
    }

    /**
     * Execute custom Advanced Hunting query
     * @param {string} query - KQL query
     * @param {string} cacheKey - Optional custom cache key
     */
    async executeAdvancedHunting(query, cacheKey = null) {
        const reportId = cacheKey || `hunting-${Date.now()}`;

        return await this.aggregator.fetchReport(
            reportId,
            'CustomHunting',
            'hunting',
            { query },
            15 // 15 minute cache for hunting queries
        );
    }
}

// Export singleton instance
const securityReportingService = new SecurityReportingService();

export default securityReportingService;
