// Intune Service - Microsoft Graph API calls for device management

export const IntuneService = {
    // Get dashboard statistics
    async getDashboardStats(client) {
        try {
            // Fetch actual data and count instead of using count API for accuracy
            const [
                managedDevicesResponse,
                compliancePoliciesResponse,
                configProfilesResponse,
                mobileAppsResponse
            ] = await Promise.all([
                client.api('/deviceManagement/managedDevices').select('id,operatingSystem,complianceState').top(999).get().catch((err) => { console.debug('Managed devices fetch failed:', err.statusCode); return { value: [] }; }),
                client.api('/deviceManagement/deviceCompliancePolicies').select('id').top(999).get().catch((err) => { console.debug('Compliance policies fetch failed:', err.statusCode); return { value: [] }; }),
                client.api('/deviceManagement/deviceConfigurations').select('id').top(999).get().catch((err) => { console.debug('Device configurations fetch failed:', err.statusCode); return { value: [] }; }),
                client.api('/deviceAppManagement/mobileApps').select('id').top(999).get().catch((err) => { console.debug('Mobile apps fetch failed:', err.statusCode); return { value: [] }; })
            ]);

            const managedDevices = managedDevicesResponse.value ? managedDevicesResponse.value.length : 0;
            const compliancePolicies = compliancePoliciesResponse.value ? compliancePoliciesResponse.value.length : 0;
            const configProfiles = configProfilesResponse.value ? configProfilesResponse.value.length : 0;
            const mobileApps = mobileAppsResponse.value ? mobileAppsResponse.value.length : 0;

            // Compute OS Distribution and Compliance Distribution
            const osDistribution = {};
            let compliantCount = 0;
            let inGracePeriodCount = 0;
            let unknownCount = 0;
            let configManagerCount = 0;

            if (managedDevicesResponse.value) {
                managedDevicesResponse.value.forEach(device => {
                    const os = device.operatingSystem || 'Unknown';
                    osDistribution[os] = (osDistribution[os] || 0) + 1;

                    // Compliance State
                    const state = (device.complianceState || 'unknown').toLowerCase();
                    if (state === 'compliant') compliantCount++;
                    else if (state === 'ingraceperiod') inGracePeriodCount++;
                    else if (state === 'unknown') unknownCount++;
                    else if (state === 'configmanager') configManagerCount++;
                });
            }

            // Get non-compliant devices count - fetch actual devices to get accurate count
            const nonCompliantResponse = await client.api('/deviceManagement/managedDevices')
                .header('ConsistencyLevel', 'eventual')
                .filter('complianceState eq \'noncompliant\'')
                .select('id')
                .top(999)
                .get()
                .catch(() => ({ value: [] }));
            const nonCompliantDevices = nonCompliantResponse.value ? nonCompliantResponse.value.length : 0;

            // Get inactive devices (last sync > 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const inactiveResponse = await client.api('/deviceManagement/managedDevices')
                .header('ConsistencyLevel', 'eventual')
                .filter(`lastSyncDateTime lt ${thirtyDaysAgo.toISOString()}`)
                .select('id')
                .top(999)
                .get()
                .catch(() => ({ value: [] }));
            const inactiveDevices = inactiveResponse.value ? inactiveResponse.value.length : 0;

            // Fetch security baselines count
            const securityBaselinesResponse = await client.api('/deviceManagement/templates')
                .version('beta')
                .select('id,displayName,templateType')
                .get()
                .catch(() => ({ value: [] }));

            // Filter for security baseline templates (same logic as getSecurityBaselines)
            const securityBaselinesCount = (securityBaselinesResponse.value || []).filter(template => {
                const displayName = template.displayName?.toLowerCase() || '';
                const templateType = template.templateType?.toLowerCase() || '';

                if (templateType === 'securitybaseline') return true;

                const isSecurityBaseline =
                    displayName.includes('baseline') ||
                    displayName.includes('defender') ||
                    displayName.includes('security') && (
                        displayName.includes('windows') ||
                        displayName.includes('edge') ||
                        displayName.includes('hololens') ||
                        displayName.includes('365') ||
                        displayName.includes('m365')
                    );

                return isSecurityBaseline;
            }).length;

            // Fetch admin roles count
            const adminRolesResponse = await client.api('/deviceManagement/roleDefinitions')
                .select('id')
                .top(100)
                .get()
                .catch(() => ({ value: [] }));
            const adminRolesCount = adminRolesResponse.value ? adminRolesResponse.value.length : 0;

            return {
                totalDevices: managedDevices,
                osDistribution,
                nonCompliantDevices,
                inactiveDevices,
                compliantDevices: compliantCount,
                inGracePeriodDevices: inGracePeriodCount,
                unknownComplianceDevices: unknownCount,
                compliancePolicies,
                configProfiles,
                mobileApps,
                securityBaselines: securityBaselinesCount,
                adminRoles: adminRolesCount
            };
        } catch (error) {
            console.error('Error fetching Intune dashboard stats:', error);
            return {
                totalDevices: 0,
                nonCompliantDevices: 0,
                inactiveDevices: 0,
                compliancePolicies: 0,
                configProfiles: 0,
                mobileApps: 0,
                securityBaselines: 0,
                adminRoles: 0
            };
        }
    },

    // Get all managed devices
    async getManagedDevices(client, top = 100) {
        try {
            const response = await client.api('/deviceManagement/managedDevices')
                .top(top)
                .select('id,deviceName,operatingSystem,osVersion,complianceState,managedDeviceOwnerType,lastSyncDateTime,userPrincipalName,manufacturer,model')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching managed devices:', error);
            return [];
        }
    },

    // Get device counts by category
    async getDeviceCounts(client) {
        try {
            const devices = await this.getManagedDevices(client, 999);

            const osDistribution = devices.reduce((acc, device) => {
                const os = device.operatingSystem || 'Unknown';
                acc[os] = (acc[os] || 0) + 1;
                return acc;
            }, {});

            const ownershipDistribution = devices.reduce((acc, device) => {
                const ownership = device.managedDeviceOwnerType || 'Unknown';
                acc[ownership] = (acc[ownership] || 0) + 1;
                return acc;
            }, {});

            const complianceDistribution = devices.reduce((acc, device) => {
                const compliance = device.complianceState || 'Unknown';
                acc[compliance] = (acc[compliance] || 0) + 1;
                return acc;
            }, {});

            return {
                total: devices.length,
                osDistribution,
                ownershipDistribution,
                complianceDistribution
            };
        } catch (error) {
            console.error('Error getting device counts:', error);
            return {
                total: 0,
                osDistribution: {},
                ownershipDistribution: {},
                complianceDistribution: {}
            };
        }
    },

    // Get non-compliant devices
    async getNonCompliantDevices(client, top = 100) {
        try {
            const response = await client.api('/deviceManagement/managedDevices')
                .header('ConsistencyLevel', 'eventual')
                .filter('complianceState eq \'noncompliant\'')
                .top(top)
                .select('id,deviceName,operatingSystem,complianceState,lastSyncDateTime,userPrincipalName')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching non-compliant devices:', error);
            return [];
        }
    },

    // Get inactive devices
    async getInactiveDevices(client, days = 30, top = 100) {
        try {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - days);

            const response = await client.api('/deviceManagement/managedDevices')
                .header('ConsistencyLevel', 'eventual')
                .filter(`lastSyncDateTime lt ${daysAgo.toISOString()}`)
                .top(top)
                .select('id,deviceName,operatingSystem,lastSyncDateTime,userPrincipalName,complianceState')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching inactive devices:', error);
            return [];
        }
    },

    // Get compliance policies
    async getCompliancePolicies(client) {
        try {
            const response = await client.api('/deviceManagement/deviceCompliancePolicies')
                .select('id,displayName,description,createdDateTime,lastModifiedDateTime')
                .expand('assignments')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching compliance policies:', error);
            return [];
        }
    },

    // Get configuration profiles
    async getConfigurationProfiles(client) {
        try {
            const response = await client.api('/deviceManagement/deviceConfigurations')
                .select('id,displayName,description,createdDateTime,lastModifiedDateTime')
                .expand('assignments')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching configuration profiles:', error);
            return [];
        }
    },

    // Get mobile applications
    async getMobileApps(client, top = 100) {
        try {
            const response = await client.api('/deviceAppManagement/mobileApps')
                .top(top)
                .select('id,displayName,publisher,createdDateTime,lastModifiedDateTime')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching mobile apps:', error);
            return [];
        }
    },

    // Get app install status
    async getAppInstallStatus(client, appId) {
        try {
            const response = await client.api(`/deviceAppManagement/mobileApps/${appId}/deviceStatuses`)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching app install status:', error);
            return [];
        }
    },



    // Get user's devices
    async getUserDevices(client, userPrincipalName) {
        try {
            const response = await client.api('/deviceManagement/managedDevices')
                .header('ConsistencyLevel', 'eventual')
                .filter(`userPrincipalName eq '${userPrincipalName}'`)
                .select('id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching user devices:', error);
            return [];
        }
    },

    // Get audit events (admin activity logs)
    async getAuditEvents(client, top = 50) {
        try {
            const response = await client.api('/deviceManagement/auditEvents')
                .top(top)
                .select('id,displayName,activityType,activityDateTime,actor,category,componentName,resources')
                .orderby('activityDateTime desc')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching audit events:', error);
            return [];
        }
    },

    // Get users list
    async getUsers(client, top = 50) {
        try {
            const response = await client.api('/users')
                .top(top)
                .select('id,displayName,userPrincipalName,mail')
                .orderby('displayName')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    // Search users for user-devices view
    async searchUsers(client, searchText) {
        try {
            const response = await client.api('/users')
                .filter(`startswith(displayName,'${searchText}') or startswith(userPrincipalName,'${searchText}')`)
                .top(20)
                .select('id,displayName,userPrincipalName,mail')
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    },

    // Get security baselines (templates)
    async getSecurityBaselines(client) {
        try {
            // Fetch all templates
            const templatesResponse = await client.api('/deviceManagement/templates')
                .version('beta')
                .select('id,displayName,description,templateType,templateSubtype,publishedDateTime,versionInfo')
                .get();


            // Filter for security baseline templates
            const securityBaselines = (templatesResponse.value || []).filter(template => {
                const displayName = template.displayName?.toLowerCase() || '';
                const templateType = template.templateType?.toLowerCase() || '';

                // Primary filter: templateType
                if (templateType === 'securitybaseline') return true;

                // Secondary filters: name-based
                const isSecurityBaseline =
                    displayName.includes('baseline') ||
                    displayName.includes('defender') ||
                    displayName.includes('security') && (
                        displayName.includes('windows') ||
                        displayName.includes('edge') ||
                        displayName.includes('hololens') ||
                        displayName.includes('365') ||
                        displayName.includes('m365')
                    );

                return isSecurityBaseline;
            });



            // For each baseline template, check if there are any deployed instances
            const baselinesWithStatus = await Promise.all(
                securityBaselines.map(async (template) => {
                    try {
                        const intentsResponse = await client.api('/deviceManagement/intents')
                            .version('beta')
                            .filter(`templateId eq '${template.id}'`)
                            .select('id,displayName,isAssigned')
                            .top(10)
                            .get()
                            .catch(() => ({ value: [] }));

                        const deployedInstances = intentsResponse.value || [];

                        return {
                            id: template.id,
                            displayName: template.displayName,
                            description: template.description,
                            baselineType: template.templateType || 'Security Baseline',
                            templateSubtype: template.templateSubtype,
                            versionInfo: template.versionInfo,
                            lastModifiedDateTime: template.publishedDateTime,
                            isDeployed: deployedInstances.length > 0,
                            deployedCount: deployedInstances.length,
                            deployedInstances: deployedInstances
                        };
                    } catch (err) {
                        console.error(`Error checking instances for template ${template.id}:`, err);
                        return {
                            id: template.id,
                            displayName: template.displayName,
                            description: template.description,
                            baselineType: template.templateType || 'Security Baseline',
                            templateSubtype: template.templateSubtype,
                            versionInfo: template.versionInfo,
                            lastModifiedDateTime: template.publishedDateTime,
                            isDeployed: false,
                            deployedCount: 0,
                            deployedInstances: []
                        };
                    }
                })
            );



            return baselinesWithStatus;
        } catch (error) {
            console.error('Error fetching security baselines:', error);
            return [];
        }
    },

    // Get security baseline device states for a deployed instance
    async getSecurityBaselineDeviceStates(client, intentId) {
        try {
            const response = await client.api(`/deviceManagement/intents/${intentId}/deviceStates`)
                .version('beta')
                .select('id,deviceId,deviceDisplayName,userName,state,lastReportedDateTime')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Error fetching security baseline device states:', error);
            return [];
        }
    },

    // Get security baseline summary statistics for a deployed instance
    async getSecurityBaselineStats(client, intentId) {
        try {
            const deviceStates = await this.getSecurityBaselineDeviceStates(client, intentId);

            const stats = {
                totalDevices: deviceStates.length,
                compliant: 0,
                nonCompliant: 0,
                error: 0,
                conflict: 0,
                notApplicable: 0
            };

            deviceStates.forEach(device => {
                const state = (device.state || 'unknown').toLowerCase();
                if (state === 'compliant' || state === 'success') stats.compliant++;
                else if (state === 'noncompliant' || state === 'failed') stats.nonCompliant++;
                else if (state === 'error') stats.error++;
                else if (state === 'conflict') stats.conflict++;
                else if (state === 'notapplicable') stats.notApplicable++;
            });

            return stats;
        } catch (error) {
            console.error('Error fetching security baseline stats:', error);
            return {
                totalDevices: 0,
                compliant: 0,
                nonCompliant: 0,
                error: 0,
                conflict: 0,
                notApplicable: 0
            };
        }
    },

    // Get Intune role definitions
    async getRoleDefinitions(client) {
        try {
            const response = await client.api('/deviceManagement/roleDefinitions')
                .select('id,displayName,description,isBuiltIn,rolePermissions')
                .top(100)
                .get();

            return response.value || [];
        } catch (error) {
            // Don't log permission errors - these are expected when DeviceManagementRBAC scope is not granted
            if (!error.message?.includes('DeviceManagementRBAC') && !error.message?.includes('not authorized')) {
                console.error('Error fetching role definitions:', error);
            }
            return [];
        }
    },

    // Get Intune role assignments
    async getRoleAssignments(client) {
        try {
            const response = await client.api('/deviceManagement/roleAssignments')
                .select('id,displayName,description,resourceScopes,members')
                .top(100)
                .get();

            return response.value || [];
        } catch (error) {
            // Don't log permission errors - these are expected when DeviceManagementRBAC scope is not granted
            if (!error.message?.includes('DeviceManagementRBAC') && !error.message?.includes('not authorized')) {
                console.error('Error fetching role assignments:', error);
            }
            return [];
        }
    },

    // Get combined RBAC data with assignments mapped to roles
    async getRBACData(client) {
        try {
            const [roleDefinitions, roleAssignments] = await Promise.all([
                this.getRoleDefinitions(client),
                this.getRoleAssignments(client)
            ]);

            // Map assignments to their role definitions
            const rolesWithAssignments = roleDefinitions.map(role => {
                const assignments = roleAssignments.filter(assignment =>
                    assignment.displayName?.toLowerCase().includes(role.displayName?.toLowerCase()) ||
                    assignment.description?.toLowerCase().includes(role.displayName?.toLowerCase())
                );

                return {
                    ...role,
                    assignmentCount: assignments.length,
                    assignments: assignments,
                    permissions: role.rolePermissions?.[0]?.resourceActions?.[0]?.allowedResourceActions?.length || 0
                };
            });

            return rolesWithAssignments;
        } catch (error) {
            console.error('Error fetching RBAC data:', error);
            return [];
        }
    }
};
