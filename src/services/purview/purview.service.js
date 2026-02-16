// Microsoft Purview Service - REST API calls for data governance
// Base URL: https://{purview-account}.purview.azure.com/

import RuntimeConfig from '../../config';

export const PurviewService = {
    // Configuration
    isConfigured() {
        return !!(RuntimeConfig.get('VITE_PURVIEW_ACCOUNT_NAME') || RuntimeConfig.get('VITE_PURVIEW_ENDPOINT'));
    },

    getPurviewEndpoint() {
        const accountName = RuntimeConfig.get('VITE_PURVIEW_ACCOUNT_NAME');
        const endpoint = RuntimeConfig.get('VITE_PURVIEW_ENDPOINT');

        if (endpoint) return endpoint;
        if (accountName && accountName !== 'your-purview-account') return `https://${accountName}.purview.azure.com`;

        // Fallback - return placeholder that will fail gracefully
        return 'https://your-purview-account.purview.azure.com';
    },

    // Helper to make authenticated requests to Purview API
    async makePurviewRequest(accessToken, endpoint, options = {}) {
        const baseUrl = this.getPurviewEndpoint();
        const url = `${baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`Purview API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Purview API request failed:', error);
            throw error;
        }
    },

    // ========================================
    // 1. DATA CATALOG / DATA MAP APIs
    // ========================================

    // Search catalog for assets
    async searchCatalog(accessToken, query = {}) {
        try {
            const searchPayload = {
                keywords: query.keywords || '*',
                limit: query.limit || 50,
                offset: query.offset || 0,
                filter: query.filter || {}
            };

            const data = await this.makePurviewRequest(
                accessToken,
                '/catalog/api/search/query',
                {
                    method: 'POST',
                    body: JSON.stringify(searchPayload)
                }
            );

            return data.value || [];
        } catch (error) {
            console.error('Error searching catalog:', error);
            return [];
        }
    },

    // Get asset by GUID
    async getAssetByGuid(accessToken, guid) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/atlas/v2/entity/guid/${guid}`
            );
            return data.entity || null;
        } catch (error) {
            console.error('Error fetching asset:', error);
            return null;
        }
    },

    // Get asset by type and attribute
    async getAssetByTypeAndAttribute(accessToken, typeName, attrName, attrValue) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/atlas/v2/entity/uniqueAttribute/type/${typeName}?attr:${attrName}=${attrValue}`
            );
            return data.entity || null;
        } catch (error) {
            console.error('Error fetching asset by type:', error);
            return null;
        }
    },

    // List all asset types
    async getAssetTypes(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/catalog/api/atlas/v2/types/typedefs'
            );
            return data.entityDefs || [];
        } catch (error) {
            console.error('Error fetching asset types:', error);
            return [];
        }
    },

    // ========================================
    // 2. LINEAGE APIs
    // ========================================

    // Get lineage for asset
    async getLineage(accessToken, guid, direction = 'BOTH', depth = 3) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/atlas/v2/lineage/${guid}?direction=${direction}&depth=${depth}`
            );
            return data;
        } catch (error) {
            console.error('Error fetching lineage:', error);
            return { guidEntityMap: {}, relations: [] };
        }
    },

    // Get lineage graph (extended)
    async getLineageGraph(accessToken, guid) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/atlas/v2/lineage/${guid}/graph`
            );
            return data;
        } catch (error) {
            console.error('Error fetching lineage graph:', error);
            return { nodes: [], edges: [] };
        }
    },

    // ========================================
    // 3. CLASSIFICATION & LABEL APIs
    // ========================================

    // Get all classifications
    async getClassifications(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/catalog/api/atlas/v2/types/classificationdef'
            );
            return data.classificationDefs || [];
        } catch (error) {
            console.error('Error fetching classifications:', error);
            return [];
        }
    },

    // Get classifications for specific entity
    async getEntityClassifications(accessToken, guid) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/atlas/v2/entity/guid/${guid}/classifications`
            );
            return data || [];
        } catch (error) {
            console.error('Error fetching entity classifications:', error);
            return [];
        }
    },

    // ========================================
    // 4. BUSINESS GLOSSARY APIs
    // ========================================

    // Get all glossary terms
    async getGlossaryTerms(accessToken, limit = 100, offset = 0) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/glossary/terms?limit=${limit}&offset=${offset}`
            );
            return data || [];
        } catch (error) {
            console.error('Error fetching glossary terms:', error);
            return [];
        }
    },

    // Get glossary term by GUID
    async getGlossaryTerm(accessToken, guid) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/glossary/terms/${guid}`
            );
            return data;
        } catch (error) {
            console.error('Error fetching glossary term:', error);
            return null;
        }
    },

    // Get glossary categories
    async getGlossaryCategories(accessToken, limit = 100, offset = 0) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/catalog/api/glossary/categories?limit=${limit}&offset=${offset}`
            );
            return data || [];
        } catch (error) {
            console.error('Error fetching glossary categories:', error);
            return [];
        }
    },

    // ========================================
    // 5. SCANNING APIs
    // ========================================

    // List all data sources
    async getDataSources(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/scan/api/datasources'
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching data sources:', error);
            return [];
        }
    },

    // Get scan history
    async getScanHistory(accessToken, dataSourceName, scanName) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/scan/api/scan/${dataSourceName}/${scanName}/history`
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching scan history:', error);
            return [];
        }
    },

    // List all scan rulesets
    async getScanRulesets(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/scan/api/scanRulesets'
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching scan rulesets:', error);
            return [];
        }
    },

    // Get scan run status
    async getScanRunStatus(accessToken, source, scanName, runId) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/scan/api/scan/${source}/${scanName}/runid/${runId}`
            );
            return data;
        } catch (error) {
            console.error('Error fetching scan run status:', error);
            return null;
        }
    },

    // List custom classifiers
    async getCustomClassifiers(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/scan/api/classificationrulesets'
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching custom classifiers:', error);
            return [];
        }
    },

    // ========================================
    // 6. ACCESS CONTROL (RBAC) APIs
    // ========================================

    // Get Purview collections
    async getCollections(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/account/api/collections'
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching collections:', error);
            return [];
        }
    },

    // Get role assignments
    async getRoleAssignments(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/account/api/roleAssignments'
            );
            return data.value || [];
        } catch (error) {
            console.error('Error fetching role assignments:', error);
            return [];
        }
    },

    // Get collection details
    async getCollection(accessToken, collectionName) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/account/api/collections/${collectionName}`
            );
            return data;
        } catch (error) {
            console.error('Error fetching collection:', error);
            return null;
        }
    },

    // ========================================
    // 7. POLICY STORE APIs
    // ========================================

    // Get all policies
    async getPolicies(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/policystore/policies'
            );
            return data.values || [];
        } catch (error) {
            console.error('Error fetching policies:', error);
            return [];
        }
    },

    // Get policy by name
    async getPolicy(accessToken, policyName) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                `/policystore/policies/${policyName}`
            );
            return data;
        } catch (error) {
            console.error('Error fetching policy:', error);
            return null;
        }
    },

    // ========================================
    // 8. INSIGHTS APIs
    // ========================================

    // Get sensitivity insights
    async getSensitivityInsights(accessToken) {
        try {
            const data = await this.makePurviewRequest(
                accessToken,
                '/account/api/insights/sensitivity'
            );
            return data;
        } catch (error) {
            console.error('Error fetching sensitivity insights:', error);
            return { distribution: [], totalAssets: 0 };
        }
    },

    // ========================================
    // 9. DASHBOARD AGGREGATION
    // ========================================

    // Get comprehensive dashboard data
    // Get comprehensive dashboard data
    async getDashboardData(accessToken) {
        if (!this.isConfigured()) {
            console.warn('Purview not configured - returning empty state');
            return {
                totalAssets: 0,
                assetDistribution: [],
                assetTypes: 0,
                classifications: 0,
                classificationDistribution: [],
                glossaryTermsCount: 0,
                glossaryCategoriesCount: 0,
                dataSources: 0,
                scanStats: {
                    totalSources: 0,
                    activeSources: 0,
                    inactiveSources: 0,
                    pendingSources: 0
                },
                collections: 0,
                policies: 0,
                assetsWithLineage: 0,
                sensitiveAssets: 0,
                lastUpdated: new Date().toISOString(),
                isConfigured: false
            };
        }

        try {
            // Fetch all dashboard metrics in parallel
            const [
                searchResults,
                assetTypes,
                classifications,
                glossaryTerms,
                glossaryCategories,
                dataSources,
                collections,
                policies
            ] = await Promise.all([
                this.searchCatalog(accessToken, { limit: 1000 }),
                this.getAssetTypes(accessToken),
                this.getClassifications(accessToken),
                this.getGlossaryTerms(accessToken, 1000),
                this.getGlossaryCategories(accessToken, 1000),
                this.getDataSources(accessToken),
                this.getCollections(accessToken),
                this.getPolicies(accessToken)
            ]);

            // Calculate asset distribution by type
            const assetDistObj = {};
            searchResults.forEach(asset => {
                const type = asset.entityType || asset['@type'] || 'Unknown';
                assetDistObj[type] = (assetDistObj[type] || 0) + 1;
            });
            const assetDistribution = Object.entries(assetDistObj).map(([name, value]) => ({ name, value }));

            // Calculate classification distribution
            const classDistObj = {};
            searchResults.forEach(asset => {
                if (asset.classifications) {
                    asset.classifications.forEach(cls => {
                        const name = cls.typeName || cls.displayName || 'Unknown';
                        classDistObj[name] = (classDistObj[name] || 0) + 1;
                    });
                }
            });
            const classificationDistribution = Object.entries(classDistObj).map(([name, count]) => ({ name, count }));

            // Calculate scan statistics
            const scanStats = {
                totalSources: dataSources.length,
                activeSources: dataSources.filter(ds => ds.status === 'active' || ds.status === 'online').length,
                inactiveSources: dataSources.filter(ds => ds.status === 'inactive' || ds.status === 'offline').length
            };

            return {
                totalAssets: searchResults.length,
                assetDistribution,
                assetTypes: assetTypes.length,
                classifications: classifications.length,
                classificationDistribution,
                glossaryTermsCount: glossaryTerms.length,
                glossaryCategoriesCount: glossaryCategories.length,
                dataSources: dataSources.length,
                scanStats,
                collections: collections.length,
                policies: policies.length,
                assetsWithLineage: searchResults.filter(a => a.hasLineage).length || 0,
                sensitiveAssets: searchResults.filter(a => a.classifications && a.classifications.length > 0).length || 0,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return {
                totalAssets: 0,
                assetDistribution: {},
                assetTypes: 0,
                classifications: 0,
                classificationDistribution: {},
                glossaryTermsCount: 0,
                glossaryCategoriesCount: 0,
                dataSources: 0,
                scanStats: { totalSources: 0, activeSources: 0, inactiveSources: 0 },
                collections: 0,
                policies: 0,
                lastUpdated: new Date().toISOString(),
                isConfigured: false
            };
        }
    }
};

export default PurviewService;
