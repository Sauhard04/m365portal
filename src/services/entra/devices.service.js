export const DevicesService = {
    getDeviceCounts: async (client) => {
        try {
            // Need Device.Read.All
            const [total, enabled, managed] = await Promise.all([
                client.api('/devices').header('ConsistencyLevel', 'eventual').count(true).get().then(res => res['@odata.count'] || 0),
                client.api('/devices').header('ConsistencyLevel', 'eventual').count(true).filter("accountEnabled eq true").get().then(res => res['@odata.count'] || 0),
                client.api('/devices').header('ConsistencyLevel', 'eventual').count(true).filter("isManaged eq true").get().then(res => res['@odata.count'] || 0)
            ]);

            return {
                total,
                enabled,
                managed,
                unmanaged: total - managed
            };
        } catch (error) {
            console.error("Error fetching device counts:", error);
            return { total: 0, enabled: 0, managed: 0, unmanaged: 0 };
        }
    },

    getAllDevices: async (client, top = 50) => {
        try {
            const response = await client.api('/devices')
                .select('id,displayName,operatingSystem,accountEnabled,isManaged,approximateLastSignInDateTime,complianceState')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching devices:", error);
            return [];
        }
    }
};
