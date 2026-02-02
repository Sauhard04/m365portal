// Governance Service - Microsoft Graph API calls for Identity Governance

export const GovernanceService = {
    /**
     * Get Conditional Access policies
     * @param {Client} client - Microsoft Graph client
     */
    async getConditionalAccessPolicies(client) {
        try {
            const response = await client.api('/identity/conditionalAccess/policies')
                .select('id,displayName,state,createdDateTime,modifiedDateTime,conditions,grantControls')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Conditional Access policies fetch failed:', error);
            return [];
        }
    },

    /**
     * Get role definitions from directory
     * @param {Client} client - Microsoft Graph client
     */
    async getRoleDefinitions(client) {
        try {
            const response = await client.api('/roleManagement/directory/roleDefinitions')
                .select('id,displayName,description,isBuiltIn,isEnabled')
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Role definitions fetch failed:', error);
            return [];
        }
    },

    /**
     * Get active role assignments
     * @param {Client} client - Microsoft Graph client
     */
    async getRoleAssignments(client) {
        try {
            const response = await client.api('/roleManagement/directory/roleAssignments')
                .expand('roleDefinition')
                .top(200)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Role assignments fetch failed:', error);
            return [];
        }
    },

    /**
     * Get eligible role assignments (PIM)
     * @param {Client} client - Microsoft Graph client
     */
    async getEligibleRoleAssignments(client) {
        try {
            const response = await client.api('/roleManagement/directory/roleEligibilitySchedules')
                .expand('roleDefinition')
                .top(200)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Eligible role assignments fetch failed:', error);
            return [];
        }
    },

    /**
     * Get active role assignment schedules (PIM)
     * @param {Client} client - Microsoft Graph client
     */
    async getActiveRoleAssignments(client) {
        try {
            const response = await client.api('/roleManagement/directory/roleAssignmentSchedules')
                .expand('roleDefinition')
                .top(200)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Active role assignment schedules fetch failed:', error);
            return [];
        }
    },

    /**
     * Get access reviews
     * @param {Client} client - Microsoft Graph client
     */
    async getAccessReviews(client) {
        try {
            const response = await client.api('/identityGovernance/accessReviews/definitions')
                .select('id,displayName,status,createdDateTime,scope')
                .top(50)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Access reviews fetch failed:', error);
            return [];
        }
    },

    /**
     * Get entitlement management catalogs
     * @param {Client} client - Microsoft Graph client
     */
    async getEntitlementCatalogs(client) {
        try {
            const response = await client.api('/identityGovernance/entitlementManagement/catalogs')
                .select('id,displayName,description,createdDateTime,state')
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Entitlement catalogs fetch failed:', error);
            return [];
        }
    },

    /**
     * Get access packages
     * @param {Client} client - Microsoft Graph client
     */
    async getAccessPackages(client) {
        try {
            const response = await client.api('/identityGovernance/entitlementManagement/accessPackages')
                .select('id,displayName,description,createdDateTime,isHidden')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Access packages fetch failed:', error);
            return [];
        }
    },

    /**
     * Get governance dashboard summary
     * @param {Client} client - Microsoft Graph client
     */
    async getDashboardSummary(client) {
        try {
            const [
                caPolicies,
                roleDefinitions,
                roleAssignments,
                eligibleRoles,
                accessReviews,
                catalogs
            ] = await Promise.all([
                this.getConditionalAccessPolicies(client),
                this.getRoleDefinitions(client),
                this.getRoleAssignments(client),
                this.getEligibleRoleAssignments(client),
                this.getAccessReviews(client),
                this.getEntitlementCatalogs(client)
            ]);

            // CA Policy breakdown by state
            const policyByState = caPolicies.reduce((acc, policy) => {
                const state = policy.state || 'disabled';
                acc[state] = (acc[state] || 0) + 1;
                return acc;
            }, {});

            // Role assignments analysis
            const standaloneRoles = roleAssignments.filter(ra =>
                ra.roleDefinition?.displayName &&
                !ra.roleDefinition.displayName.toLowerCase().includes('user')
            );

            // Privileged roles (Global Admin, Privileged Role Admin, etc.)
            const privilegedRoleIds = [
                '62e90394-69f5-4237-9190-012177145e10', // Global Administrator
                'e8611ab8-c189-46e8-94e1-60213ab1f814', // Privileged Role Administrator
                '194ae4cb-b126-40b2-bd5b-6091b380977d', // Security Administrator
                '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', // Application Administrator
            ];

            const privilegedAssignments = roleAssignments.filter(ra =>
                privilegedRoleIds.includes(ra.roleDefinition?.templateId)
            );

            return {
                conditionalAccess: {
                    total: caPolicies.length,
                    byState: policyByState,
                    enabled: policyByState.enabled || 0,
                    enabledForReportingButNotEnforced: policyByState.enabledForReportingButNotEnforced || 0,
                    disabled: policyByState.disabled || 0,
                    policies: caPolicies.slice(0, 10)
                },
                roles: {
                    definitions: roleDefinitions.length,
                    assignments: roleAssignments.length,
                    eligibleAssignments: eligibleRoles.length,
                    privilegedAssignments: privilegedAssignments.length
                },
                accessReviews: {
                    total: accessReviews.length,
                    active: accessReviews.filter(r => r.status === 'InProgress').length,
                    reviews: accessReviews.slice(0, 5)
                },
                entitlementManagement: {
                    catalogs: catalogs.length,
                    catalogs: catalogs.slice(0, 5)
                }
            };
        } catch (error) {
            console.error('Governance dashboard summary fetch failed:', error);
            return {
                conditionalAccess: { total: 0, byState: {}, enabled: 0, disabled: 0, policies: [] },
                roles: { definitions: 0, assignments: 0, eligibleAssignments: 0, privilegedAssignments: 0 },
                accessReviews: { total: 0, active: 0, reviews: [] },
                entitlementManagement: { catalogs: 0, catalogs: [] }
            };
        }
    }
};

export default GovernanceService;
