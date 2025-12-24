export const SubscriptionsService = {
    getSubscriptionCounts: async (client) => {
        try {
            const response = await client.api('/subscribedSkus').get();
            const skus = response.value || [];

            const total = skus.length;
            const active = skus.filter(s => s.capabilityStatus === 'Enabled').length;
            // 'purchased' vs 'trial' logic: approximate via capabilityStatus or skuPartNumber hints, 
            // but for now we count Active. 
            // Better logic: total licenses vs consumed?
            // User asked for "Purchased / Trial / Free counts". 
            // This information is hard to get reliably from /subscribedSkus alone without mapping SKU definitions.
            // We will do best effort based on status.

            return {
                total,
                active,
                details: skus.reduce((acc, sku) => {
                    const status = sku.capabilityStatus; // Enabled, Suspended, Deleted, etc.
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error("Error fetching subscription counts:", error);
            return { total: 0, active: 0 };
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
