export const SubscriptionsService = {
    getSubscriptionCounts: async (client) => {
        try {
            const response = await client.api('/subscribedSkus').get();
            const skus = response.value || [];

            let totalConsumed = 0;
            let totalEnabled = 0;

            skus.forEach(sku => {
                totalConsumed += (sku.consumedUnits || 0);
                totalEnabled += (sku.prepaidUnits?.enabled || 0);
            });

            const usagePercentage = totalEnabled > 0 ? Math.round((totalConsumed / totalEnabled) * 100) : 0;

            const total = skus.length;
            const active = skus.filter(s => s.capabilityStatus === 'Enabled').length;

            return {
                total,
                active,
                usagePercentage,
                details: skus.reduce((acc, sku) => {
                    const status = sku.capabilityStatus;
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error("Error fetching subscription counts:", error);
            return { total: 0, active: 0, usagePercentage: 0 };
        }
    },

    getSubscriptions: async (client) => {
        try {
            const response = await client.api('/subscribedSkus').get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            return [];
        }
    }
};
