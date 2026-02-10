/**
 * Security Data Source Abstraction Layer
 * Provides unified interface for fetching security data from multiple sources
 */

import { DataPersistenceService } from '../dataPersistence';
import { Client } from '@microsoft/microsoft-graph-client';

/**
 * Base interface for security data sources
 */
export class ISecurityDataSource {
    constructor(source) {
        this.source = source; // 'Graph' | 'Defender' | 'AdvancedHunting'
    }

    async fetchRawData(tenantId, params) {
        throw new Error('fetchRawData must be implemented by subclass');
    }

    normalizeData(rawData) {
        throw new Error('normalizeData must be implemented by subclass');
    }
}

/**
 * Graph Security Data Source
 */
export class GraphSecurityDataSource extends ISecurityDataSource {
    constructor() {
        super('Graph');
        this.graphService = GraphService;
    }

    async fetchRawData(tenantId, params) {
        const { reportType, filters = {} } = params;

        switch (reportType) {
            case 'SecureScore':
                return await this.graphService.client
                    .api('/security/secureScores')
                    .top(1)
                    .orderby('createdDateTime desc')
                    .get();

            case 'SecurityAlerts':
                let alertQuery = this.graphService.client.api('/security/alerts_v2');
                if (filters.severity) {
                    alertQuery = alertQuery.filter(`severity eq '${filters.severity}'`);
                }
                if (filters.category) {
                    alertQuery = alertQuery.filter(`category eq '${filters.category}'`);
                }
                return await alertQuery.top(filters.top || 100).get();

            case 'Incidents':
                return await this.graphService.client
                    .api('/security/incidents')
                    .top(filters.top || 50)
                    .get();

            case 'RiskyUsers':
                return await this.graphService.client
                    .api('/identityProtection/riskyUsers')
                    .get();

            case 'RiskDetections':
                return await this.graphService.client
                    .api('/identityProtection/riskDetections')
                    .filter(`detectedDateTime ge ${filters.startDate || '2026-01-01'}`)
                    .get();

            case 'SignInLogs':
                let signInQuery = this.graphService.client
                    .api('/auditLogs/signIns')
                    .filter(`createdDateTime ge ${filters.startDate}`)
                    .top(filters.top || 1000);
                return await signInQuery.get();

            case 'MFARegistration':
                return await this.graphService.client
                    .api('/reports/credentialUserRegistrationDetails')
                    .version('beta')
                    .get();

            case 'OAuthApps':
                const [servicePrincipals, permissionGrants] = await Promise.all([
                    this.graphService.client.api('/servicePrincipals').top(100).get(),
                    this.graphService.client.api('/oauth2PermissionGrants').top(500).get()
                ]);
                return { servicePrincipals, permissionGrants };

            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
    }

    normalizeData(rawData) {
        // Transform Graph API response to normalized format
        return {
            source: this.source,
            data: rawData.value || rawData,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Defender API Data Source
 */
export class DefenderAPIDataSource extends ISecurityDataSource {
    constructor() {
        super('Defender');
        this.defenderService = DefenderAPIService;
    }

    async fetchRawData(tenantId, params) {
        const { reportType, filters = {} } = params;

        switch (reportType) {
            case 'DefenderAlerts':
                return await this.defenderService.getAlerts(filters);

            case 'DefenderIncidents':
                return await this.defenderService.getIncidents(filters);

            case 'ThreatAnalytics':
                return await this.defenderService.getThreatAnalytics();

            case 'ExposedDevices':
                return await this.defenderService.getMachines(filters);

            case 'EmailThreats':
                return await this.defenderService.getEmailThreats(filters.period || 30);

            case 'TopMalware':
                return await this.defenderService.getTopMalware(filters.period || 30, filters.limit || 10);

            default:
                throw new Error(`Unknown Defender report type: ${reportType}`);
        }
    }

    normalizeData(rawData) {
        return {
            source: this.source,
            data: rawData.value || rawData.Results || rawData,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Advanced Hunting Data Source
 */
export class AdvancedHuntingDataSource extends ISecurityDataSource {
    constructor() {
        super('AdvancedHunting');
        this.defenderService = DefenderAPIService;
    }

    async fetchRawData(tenantId, params) {
        const { query } = params;
        if (!query) {
            throw new Error('KQL query is required for Advanced Hunting');
        }

        return await this.defenderService.advancedHunting(query);
    }

    normalizeData(rawData) {
        return {
            source: this.source,
            data: rawData.Results || [],
            schema: rawData.Schema || [],
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Security Report Aggregator
 * Orchestrates data fetching from multiple sources and normalizes the output
 */
export class SecurityReportAggregator {
    constructor() {
        this.sources = {
            graph: new GraphSecurityDataSource(),
            defender: new DefenderAPIDataSource(),
            hunting: new AdvancedHuntingDataSource()
        };
        this.cacheService = DataPersistenceService;
    }

    /**
     * Generate cache key for tenant-isolated storage
     */
    getCacheKey(tenantId, reportType, params = {}) {
        const paramHash = JSON.stringify(params);
        return `tenant:${tenantId}:report:${reportType}:${paramHash}`;
    }

    /**
     * Fetch security report with caching
     * @param {string} reportId - Unique report identifier
     * @param {string} reportType - Type of report (e.g., 'SecureScore', 'RiskyUsers')
     * @param {string} source - Data source ('graph', 'defender', 'hunting')
     * @param {object} params - Query parameters
     * @param {number} cacheDuration - Cache duration in minutes
     */
    async fetchReport(reportId, reportType, source, params = {}, cacheDuration = 15) {
        const tenantId = params.tenantId || 'default';
        const cacheKey = this.getCacheKey(tenantId, reportType, params);

        // Check cache first
        const cached = await this.cacheService.load(cacheKey);
        if (cached && !this.cacheService.isExpired(cacheKey, cacheDuration)) {
            console.debug(`Cache hit for ${reportType}`);
            return cached;
        }

        // Fetch from appropriate source
        const dataSource = this.sources[source];
        if (!dataSource) {
            throw new Error(`Unknown data source: ${source}`);
        }

        try {
            const rawData = await dataSource.fetchRawData(tenantId, { reportType, ...params });
            const normalized = dataSource.normalizeData(rawData);

            // Build complete security report
            const report = {
                reportId,
                tenantId,
                category: this.getCategoryForReport(reportType),
                reportType,
                timestamp: new Date().toISOString(),
                periodCovered: params.periodCovered || {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                },
                metrics: this.extractMetrics(normalized.data, reportType),
                rawSources: {
                    [source]: [reportType]
                },
                data: normalized.data
            };

            // Cache the result
            await this.cacheService.save(cacheKey, report);

            return report;
        } catch (error) {
            console.error(`Failed to fetch ${reportType} from ${source}:`, error);

            // Return cached data if available, even if expired
            if (cached) {
                console.warn(`Returning stale cache for ${reportType}`);
                return cached;
            }

            throw error;
        }
    }

    /**
     * Determine category for report type
     */
    getCategoryForReport(reportType) {
        const categoryMap = {
            'SecureScore': 'General',
            'SecurityAlerts': 'General',
            'Incidents': 'General',
            'ThreatAnalytics': 'General',
            'EmailThreats': 'Email',
            'TopMalware': 'Email',
            'OAuthApps': 'CloudApps',
            'RiskyUsers': 'Identities',
            'RiskDetections': 'Identities',
            'SignInLogs': 'Identities',
            'MFARegistration': 'Identities'
        };

        return categoryMap[reportType] || 'General';
    }

    /**
     * Extract key metrics from normalized data
     */
    extractMetrics(data, reportType) {
        const metrics = {};

        switch (reportType) {
            case 'SecureScore':
                if (data.length > 0) {
                    const score = data[0];
                    metrics.currentScore = score.currentScore || 0;
                    metrics.maxScore = score.maxScore || 0;
                    metrics.percentage = ((metrics.currentScore / metrics.maxScore) * 100).toFixed(2);
                }
                break;

            case 'SecurityAlerts':
            case 'DefenderAlerts':
                metrics.totalAlerts = data.length;
                metrics.highSeverity = data.filter(a => a.severity === 'high').length;
                metrics.mediumSeverity = data.filter(a => a.severity === 'medium').length;
                metrics.lowSeverity = data.filter(a => a.severity === 'low').length;
                metrics.activeAlerts = data.filter(a => a.status !== 'resolved').length;
                break;

            case 'RiskyUsers':
                metrics.totalRiskyUsers = data.length;
                metrics.highRisk = data.filter(u => u.riskLevel === 'high').length;
                metrics.mediumRisk = data.filter(u => u.riskLevel === 'medium').length;
                metrics.atRisk = data.filter(u => u.riskState === 'atRisk').length;
                break;

            case 'MFARegistration':
                metrics.totalUsers = data.length;
                metrics.mfaRegistered = data.filter(u => u.isMfaRegistered).length;
                metrics.registrationRate = ((metrics.mfaRegistered / metrics.totalUsers) * 100).toFixed(2);
                break;

            default:
                metrics.count = data.length;
        }

        return metrics;
    }
}

// Export singleton instance
const securityReportAggregator = new SecurityReportAggregator();

export default securityReportAggregator;
