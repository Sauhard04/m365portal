import { Client } from '@microsoft/microsoft-graph-client';

export class AggregationService {
    static async getOverviewData(graphService, accessToken = null) {
        try {
            // Fetch data from multiple endpoints in parallel
            const [
                users,
                devices,
                licenses,
                serviceHealth,
                secureScore,
                signIns,
                mfaStats,
                roles,
                userTrends,
                signInTrends
            ] = await Promise.all([
                graphService.client.api('/users').select('id,displayName,userPrincipalName,accountEnabled').top(999).get().catch(() => ({ value: [] })),
                graphService.client.api('/deviceManagement/managedDevices').select('id,deviceName,complianceState,operatingSystem').top(999).get().catch(() => ({ value: [] })),
                graphService.client.api('/subscribedSkus').get().catch(() => ({ value: [] })),
                graphService.client.api('/admin/serviceAnnouncement/healthOverviews').get().catch(() => ({ value: [] })),
                graphService.client.api('/security/secureScores').top(1).get().catch(() => ({ value: [] })),
                graphService.client.api('/auditLogs/signIns').filter(`createdDateTime ge ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`).top(100).get().catch(() => ({ value: [] })),
                graphService.client.api('/reports/getCredentialUserRegistrationCount').version('beta').get().catch(() => ({ value: [] })),
                graphService.client.api('/directoryRoles').select('id,displayName').get().catch(() => ({ value: [] })),
                graphService.getActiveUserTrends('D7').catch(() => []),
                graphService.getSignInTrends(7).catch(() => [])
            ]);

            // Process Quick Stats
            const totalUsers = users.value?.length || 0;
            const activeUsers = users.value?.filter(u => u.accountEnabled).length || 0;
            const totalDevices = devices.value?.length || 0;
            const totalLicenses = licenses.value?.reduce((acc, sku) => acc + (sku.consumedUnits || 0), 0) || 0;
            const currentSecureScore = secureScore.value?.[0]?.currentScore || 0;
            const maxSecureScore = secureScore.value?.[0]?.maxScore || 100;

            // Process MFA & Roles
            const mfaData = mfaStats.value || [];
            const mfaRegistered = mfaData.reduce((acc, curr) => acc + (curr.userRegistrationCount || 0), 0);
            const mfaTotal = mfaData.reduce((acc, curr) => acc + (curr.totalUserCount || 0), totalUsers); // Fallback to totalUsers

            const activeRoles = roles.value?.length || 0;

            // Service Health Chart Data
            const serviceHealthData = [{
                name: 'Operational',
                value: serviceHealth.value?.filter(s => s.status === 'serviceOperational').length || 0,
                color: 'var(--accent-success)'
            }, {
                name: 'Issues',
                value: serviceHealth.value?.filter(s => s.status !== 'serviceOperational').length || 0,
                color: 'var(--accent-error)'
            }];

            // User Distribution Chart Data
            const userDistributionData = [{
                name: 'Active',
                value: activeUsers,
                color: 'var(--accent-success)'
            }, {
                name: 'Inactive',
                value: totalUsers - activeUsers,
                color: 'var(--accent-warning)'
            }];

            // Device Compliance Chart Data
            const compliantDevices = devices.value?.filter(d => d.complianceState === 'compliant').length || 0;
            const nonCompliantDevices = devices.value?.filter(d => d.complianceState === 'noncompliant').length || 0;
            const notEvaluatedDevices = totalDevices - compliantDevices - nonCompliantDevices;

            const deviceComplianceData = [{
                name: 'Compliant',
                value: compliantDevices,
                color: 'var(--accent-success)'
            }, {
                name: 'Non-Compliant',
                value: nonCompliantDevices,
                color: 'var(--accent-error)'
            }, {
                name: 'Not Evaluated',
                value: notEvaluatedDevices,
                color: 'var(--accent-warning)'
            }];

            // Device by Platform Chart Data
            const platformCounts = devices.value?.reduce((acc, device) => {
                const os = device.operatingSystem || 'Unknown';
                acc[os] = (acc[os] || 0) + 1;
                return acc;
            }, {}) || {};

            const deviceByPlatformData = Object.entries(platformCounts).map(([name, value]) => ({
                name,
                value
            }));

            // License Utilization Chart Data - Real data only
            const licenseData = licenses.value?.map(sku => ({
                name: sku.skuPartNumber?.replace(/_/g, ' ').substring(0, 20) || 'Unknown',
                assigned: sku.consumedUnits || 0,
                available: Math.max(0, (sku.prepaidUnits?.enabled || 0) - (sku.consumedUnits || 0))
            })).filter(l => l.assigned > 0 || l.available > 0).slice(0, 5) || [];

            // Failed Sign-ins Chart Data
            const failedSignIns = signIns.value?.filter(s => s.status?.errorCode !== 0) || [];
            const failedSignInsData = signInTrends && signInTrends.length > 0
                ? signInTrends.map(t => ({
                    name: t.date,
                    failed: t.failure,
                    successful: t.success
                }))
                : [{
                    name: 'Last 24h',
                    failed: failedSignIns.length,
                    successful: (signIns.value?.length || 0) - failedSignIns.length
                }];

            // Email Activity Trend - Using GraphService proxy method
            let emailTrendData = [];
            try {
                const rawEmailData = await graphService.getMailboxActivityTrend('D7');

                if (rawEmailData && rawEmailData.length > 0) {
                    emailTrendData = rawEmailData.map((item, index, array) => {
                        // Force Date Synthesis: API often returns the same reportDate for all D7 items.
                        const refreshDateStr = item.reportRefreshDate || new Date().toISOString().split('T')[0];
                        const d = new Date(refreshDateStr);

                        const offsetFromEnd = array.length - 1 - index;
                        d.setDate(d.getDate() - offsetFromEnd);

                        const dateName = d.toISOString().split('T')[0];

                        return {
                            name: dateName,
                            sent: parseInt(item.send || item.sendCount) || 0,
                            received: parseInt(item.receive || item.receiveCount) || 0
                        };
                    });
                }
            } catch (e) {
                console.warn("Could not fetch real email trend:", e);
            }

            if (emailTrendData.length === 0) {
                emailTrendData = [];
            }

            // Security Posture Radar Chart Data - Refined logic to ignore unlimited/free SKU dilution
            const activeSkus = licenses.value?.filter(sku => (sku.prepaidUnits?.enabled || 0) < 5000) || [];
            const activeEnabled = activeSkus.reduce((acc, sku) => acc + (sku.prepaidUnits?.enabled || 0), 0);
            const activeConsumed = activeSkus.reduce((acc, sku) => acc + (sku.consumedUnits || 0), 0);

            const securityRadarData = [
                { subject: 'Secure Score', value: maxSecureScore > 0 ? Math.round((currentSecureScore / maxSecureScore) * 100) : 0, fullMark: 100 },
                { subject: 'Compliance', value: totalDevices > 0 ? Math.round((compliantDevices / totalDevices) * 100) : 100, fullMark: 100 },
                { subject: 'Active Users', value: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0, fullMark: 100 },
                { subject: 'License Usage', value: activeEnabled > 0 ? Math.round((activeConsumed / activeEnabled) * 100) : 0, fullMark: 100 },
                { subject: 'Sign-in Success', value: (signIns.value && signIns.value.length > 0) ? Math.round(((signIns.value.length - failedSignIns.length) / signIns.value.length) * 100) : 100, fullMark: 100 }
            ];

            // License Distribution Treemap Data - Vibrant, high-contrast palette
            const treemapData = licenses.value?.map((sku, idx) => ({
                name: sku.skuPartNumber?.replace(/_/g, ' ').substring(0, 25) || `License ${idx + 1}`,
                size: (sku.consumedUnits || 0) > 0 ? sku.consumedUnits : 0,
                fill: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#d946ef', '#14b8a6'][idx % 8]
            })).filter(d => d.size > 0).slice(0, 8) || [];

            // Growth and Trend - Using real userTrends if available
            const weeklyUserGrowth = userTrends && userTrends.length > 0
                ? userTrends.map(t => ({
                    week: t.reportRefreshDate,
                    active: parseInt(t.office365Active) || 0
                }))
                : [];

            const enrollmentFunnel = [];
            const licenseTrendData = [];

            return {
                quickStats: {
                    totalUsers,
                    totalDevices,
                    totalLicenses,
                    secureScore: currentSecureScore,
                    maxSecureScore,
                    mfaRegistered,
                    mfaTotal,
                    activeRoles
                },
                charts: {
                    serviceHealth: serviceHealthData,
                    userDistribution: userDistributionData,
                    deviceCompliance: deviceComplianceData,
                    deviceByPlatform: deviceByPlatformData,
                    licenseUsage: licenseData,
                    signIns: failedSignInsData,
                    emailTrend: emailTrendData,
                    securityRadar: securityRadarData,
                    licenseTreemap: treemapData,
                    userGrowthTrend: weeklyUserGrowth,
                    enrollmentFunnel: enrollmentFunnel,
                    licenseTrendComposed: licenseTrendData
                }
            };
        } catch (error) {
            console.error('Error fetching overview data:', error);
            throw error;
        }
    }
}
