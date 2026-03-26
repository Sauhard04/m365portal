import { Client } from '@microsoft/microsoft-graph-client';

class AlertsService {
    /**
     * Fetch all alerts from multiple Microsoft Graph API endpoints
     * Combines security alerts, risky sign-ins, audit logs, and device compliance
     */
    async getAllAlerts(client) {
        try {
            // Note: riskySignIns requires Identity Protection license - removed to prevent 403 errors
            const [securityAlerts, auditLogs, deviceCompliance] = await Promise.all([
                this.getSecurityAlerts(client).catch(() => []),
                this.getAuditLogs(client).catch(() => []),
                this.getDeviceComplianceFailures(client).catch(() => [])
            ]);

            // Combine all alerts
            const allAlerts = [
                ...securityAlerts,
                ...auditLogs,
                ...deviceCompliance
            ];

            // Sort by timestamp (most recent first)
            return allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
    }

    /**
     * Fetch security alerts from Microsoft Graph
     */
    async getSecurityAlerts(client) {
        try {
            const response = await client
                .api('/security/alerts_v2')
                .top(50)
                .filter("createdDateTime ge " + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .get();

            return (response.value || []).map((alert, index) => ({
                id: alert.id || `SEC-${Date.now()}-${index}`,
                title: alert.title || 'Security Alert',
                severity: this.mapSeverity(alert.severity),
                category: 'Security',
                service: 'Microsoft Defender',
                timestamp: this.formatTimestamp(alert.createdDateTime),
                status: alert.status === 'resolved' ? 'resolved' : 'unresolved',
                message: alert.description || 'Security incident detected'
            }));
        } catch (error) {
            console.error('Error fetching security alerts:', error);
            return [];
        }
    }

    /**
     * Fetch risky sign-ins from Entra ID Protection
     */
    async getRiskySignIns(client) {
        try {
            const response = await client
                .api('/identityProtection/riskyUsers')
                .top(20)
                .filter("riskState eq 'atRisk' or riskState eq 'confirmedCompromised'")
                .get();

            return (response.value || []).map((user, index) => ({
                id: user.id || `RISK-${Date.now()}-${index}`,
                title: 'Risky User Detected',
                severity: user.riskLevel === 'high' ? 'high' : 'medium',
                category: 'Security',
                service: 'Entra ID',
                timestamp: this.formatTimestamp(user.riskLastUpdatedDateTime),
                status: 'unresolved',
                message: `User "${user.userDisplayName || user.userPrincipalName}" flagged as ${user.riskState}`
            }));
        } catch (error) {
            // Silently handle permission errors (403) - Identity Protection requires special licenses/permissions
            if (error.statusCode !== 403 && error.status !== 403) {
                console.error('Error fetching risky sign-ins:', error);
            }
            return [];
        }
    }

    /**
     * Fetch critical audit log events
     */
    async getAuditLogs(client) {
        try {
            const response = await client
                .api('/auditLogs/directoryAudits')
                .top(20)
                .filter("activityDateTime ge " + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .get();

            return (response.value || [])
                .filter(log => this.isCriticalAuditEvent(log))
                .map((log, index) => {
                    const initiatedBy = log.initiatedBy?.user?.userPrincipalName ||
                        log.initiatedBy?.app?.displayName ||
                        'System';
                    const targetResources = log.targetResources?.map(t => t.displayName || t.userPrincipalName).filter(Boolean).join(', ') || 'N/A';
                    const result = log.result || 'N/A';

                    return {
                        id: log.id || `AUD-${Date.now()}-${index}`,
                        title: log.activityDisplayName || 'Policy Changed',
                        severity: this.getAuditSeverity(log),
                        category: 'Governance',
                        service: 'Entra ID',
                        timestamp: this.formatTimestamp(log.activityDateTime),
                        status: 'unresolved',
                        message: `${log.activityDisplayName} by ${initiatedBy}${targetResources !== 'N/A' ? ` | Target: ${targetResources}` : ''}${result !== 'N/A' ? ` | Result: ${result}` : ''}`
                    };
                });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    }

    /**
     * Fetch device compliance failures from Intune
     */
    async getDeviceComplianceFailures(client) {
        try {
            // Use the correct managed devices endpoint with compliance status filter
            const response = await client
                .api('/deviceManagement/managedDevices')
                .filter("complianceState eq 'noncompliant'")
                .select('id,deviceName,complianceState,lastSyncDateTime,userPrincipalName')
                .top(20)
                .get();

            return (response.value || []).map((device, index) => ({
                id: device.id || `DEV-${Date.now()}-${index}`,
                title: 'Device Compliance Failure',
                severity: 'medium',
                category: 'Device',
                service: 'Intune',
                timestamp: this.formatTimestamp(device.lastSyncDateTime),
                status: 'unresolved',
                message: `Device "${device.deviceName || 'Unknown'}" is not compliant with policy requirements`
            }));
        } catch (error) {
            // Silently handle resource not found errors (400) - endpoint may not be available
            if (error.statusCode !== 400 && error.statusCode !== 404) {
                console.error('Error fetching device compliance:', error);
            }
            return [];
        }
    }

    /**
     * Calculate alert statistics
     */
    getAlertStats(alerts) {
        return {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            unresolved: alerts.filter(a => a.status === 'unresolved').length,
            resolved: alerts.filter(a => a.status === 'resolved').length
        };
    }

    /**
     * Helper: Map Microsoft severity to our format
     */
    mapSeverity(severity) {
        const severityMap = {
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low',
            'informational': 'low'
        };
        return severityMap[severity?.toLowerCase()] || 'medium';
    }

    /**
     * Helper: Format timestamp to relative time
     */
    formatTimestamp(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    }

    /**
     * Helper: Determine if audit event is critical
     */
    isCriticalAuditEvent(log) {
        const criticalActivities = [
            'Add member to role',
            'Update policy',
            'Delete user',
            'Add application',
            'Update application',
            'Change password',
            'Reset password'
        ];

        return criticalActivities.some(activity =>
            log.activityDisplayName?.toLowerCase().includes(activity.toLowerCase())
        );
    }

    /**
     * Helper: Get severity for audit events
     */
    getAuditSeverity(log) {
        const highSeverityActivities = ['delete', 'remove', 'disable'];
        const activity = log.activityDisplayName?.toLowerCase() || '';

        if (highSeverityActivities.some(word => activity.includes(word))) {
            return 'high';
        }
        return 'medium';
    }
}

export default new AlertsService();
