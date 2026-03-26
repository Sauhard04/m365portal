// Security Service - Microsoft Graph API calls for security operations

export const SecurityService = {
    /**
     * Get security alerts from Microsoft Graph Security API
     * @param {Client} client - Microsoft Graph client
     * @param {number} top - Number of alerts to fetch
     */
    async getSecurityAlerts(client, top = 100) {
        try {
            const response = await client.api('/security/alerts_v2')
                .top(top)
                .orderby('createdDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Security alerts v2 fetch failed (optional):', error);
            // Fall back to legacy alerts endpoint
            try {
                const legacyResponse = await client.api('/security/alerts')
                    .top(top)
                    .orderby('createdDateTime desc')
                    .get();
                return legacyResponse.value || [];
            } catch (legacyError) {
                console.debug('Legacy security alerts also failed (optional):', legacyError);
                return [];
            }
        }
    },

    /**
     * Get security incidents
     * @param {Client} client - Microsoft Graph client
     * @param {number} top - Number of incidents to fetch
     */
    async getSecurityIncidents(client, top = 50) {
        try {
            const response = await client.api('/security/incidents')
                .top(top)
                .orderby('createdDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Security incidents fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get secure scores with history
     * @param {Client} client - Microsoft Graph client
     * @param {number} top - Number of scores to fetch for history
     */
    async getSecureScores(client, top = 7) {
        try {
            const response = await client.api('/security/secureScores')
                .top(top)
                .orderby('createdDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Secure scores fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get secure score control profiles (improvement actions)
     * @param {Client} client - Microsoft Graph client
     */
    async getSecureScoreControlProfiles(client) {
        try {
            const response = await client.api('/security/secureScoreControlProfiles')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Secure score control profiles fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get risky users from Identity Protection
     * @param {Client} client - Microsoft Graph client
     */
    async getRiskyUsers(client) {
        try {
            const response = await client.api('/identityProtection/riskyUsers')
                .top(100)
                .orderby('riskLastUpdatedDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Risky users fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get risk detections from Identity Protection
     * @param {Client} client - Microsoft Graph client
     * @param {number} top - Number of detections to fetch
     */
    async getRiskDetections(client, top = 100) {
        try {
            const response = await client.api('/identityProtection/riskDetections')
                .top(top)
                .orderby('detectedDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Risk detections fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get risky sign-ins
     * @param {Client} client - Microsoft Graph client
     * @param {number} top - Number of sign-ins to fetch
     */
    async getRiskySignIns(client, top = 100) {
        try {
            const response = await client.api('/identityProtection/riskyServicePrincipals')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            // Fall back to audit logs with risky sign-ins filter
            try {
                const signInsResponse = await client.api('/auditLogs/signIns')
                    .filter('riskLevelDuringSignIn ne \'none\'')
                    .top(top)
                    .orderby('createdDateTime desc')
                    .get();
                return signInsResponse.value || [];
            } catch (fallbackError) {
                console.debug('Risky sign-ins fetch failed (optional):', fallbackError);
                return [];
            }
        }
    },

    /**
     * Get threat intelligence indicators
     * @param {Client} client - Microsoft Graph client
     */
    async getThreatIndicators(client, top = 50) {
        try {
            const response = await client.api('/security/tiIndicators')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Threat indicators fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get authentication methods registration details
     * @param {Client} client - Microsoft Graph client
     */
    async getAuthMethodsRegistration(client) {
        try {
            const response = await client.api('/reports/authenticationMethods/userRegistrationDetails')
                .version('beta')
                .top(999)
                .get();
            return response.value || [];
        } catch (error) {
            console.debug('Auth methods registration fetch failed (optional):', error);
            return [];
        }
    },

    /**
     * Get security dashboard summary
     * @param {Client} client - Microsoft Graph client
     */
    async getDashboardSummary(client) {
        try {
            const [alerts, incidents, secureScores, riskyUsers, riskDetections, authMethods] =
                await Promise.all([
                    this.getSecurityAlerts(client, 100),
                    this.getSecurityIncidents(client, 50),
                    this.getSecureScores(client, 1),
                    this.getRiskyUsers(client),
                    this.getRiskDetections(client, 50),
                    this.getAuthMethodsRegistration(client)
                ]);

            // Calculate alert severity breakdown
            const alertsBySeverity = alerts.reduce((acc, alert) => {
                const severity = alert.severity || 'unknown';
                acc[severity] = (acc[severity] || 0) + 1;
                return acc;
            }, {});

            // Calculate incident status breakdown
            const incidentsByStatus = incidents.reduce((acc, incident) => {
                const status = incident.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            // Calculate risky user levels
            const riskyUsersByLevel = riskyUsers.reduce((acc, user) => {
                const level = user.riskLevel || 'unknown';
                acc[level] = (acc[level] || 0) + 1;
                return acc;
            }, {});

            // Calculate MFA coverage
            const mfaRegistered = authMethods.filter(u => u.isMfaRegistered).length;
            const mfaCoverage = authMethods.length > 0
                ? Math.round((mfaRegistered / authMethods.length) * 100)
                : 0;

            // Get current secure score
            const currentScore = secureScores[0] || { currentScore: 0, maxScore: 100 };

            return {
                alerts: {
                    total: alerts.length,
                    bySeverity: alertsBySeverity,
                    highSeverity: alertsBySeverity.high || 0,
                    mediumSeverity: alertsBySeverity.medium || 0,
                    lowSeverity: alertsBySeverity.low || 0
                },
                incidents: {
                    total: incidents.length,
                    byStatus: incidentsByStatus,
                    active: incidentsByStatus.active || 0,
                    resolved: incidentsByStatus.resolved || 0
                },
                secureScore: {
                    current: currentScore.currentScore || 0,
                    max: currentScore.maxScore || 100,
                    percentage: currentScore.maxScore
                        ? Math.round((currentScore.currentScore / currentScore.maxScore) * 100)
                        : 0
                },
                riskyUsers: {
                    total: riskyUsers.length,
                    byLevel: riskyUsersByLevel,
                    high: riskyUsersByLevel.high || 0,
                    medium: riskyUsersByLevel.medium || 0,
                    low: riskyUsersByLevel.low || 0
                },
                riskDetections: {
                    total: riskDetections.length,
                    recent: riskDetections.slice(0, 5)
                },
                mfa: {
                    registered: mfaRegistered,
                    total: authMethods.length,
                    coverage: mfaCoverage
                }
            };
        } catch (error) {
            console.error('Security dashboard summary fetch failed:', error);
            return {
                alerts: { total: 0, bySeverity: {}, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
                incidents: { total: 0, byStatus: {}, active: 0, resolved: 0 },
                secureScore: { current: 0, max: 100, percentage: 0 },
                riskyUsers: { total: 0, byLevel: {}, high: 0, medium: 0, low: 0 },
                riskDetections: { total: 0, recent: [] },
                mfa: { registered: 0, total: 0, coverage: 0 }
            };
        }
    }
};

export default SecurityService;
