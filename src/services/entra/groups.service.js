export const GroupsService = {
    getGroupCounts: async (client) => {
        try {
            const [total, security, distribution] = await Promise.all([
                client.api('/groups').header('ConsistencyLevel', 'eventual').count(true).get().then(res => res['@odata.count'] || 0),
                client.api('/groups').header('ConsistencyLevel', 'eventual').count(true).filter("securityEnabled eq true").get().then(res => res['@odata.count'] || 0),
                client.api('/groups').header('ConsistencyLevel', 'eventual').count(true).filter("mailEnabled eq true and securityEnabled eq false").get().then(res => res['@odata.count'] || 0)
            ]);
            return { total, security, distribution };
        } catch (error) {
            console.error("Error fetching group counts:", error);
            return { total: 0, security: 0, distribution: 0 };
        }
    },

    getAllGroups: async (client, top = 50) => {
        try {
            const response = await client.api('/groups')
                .select('id,displayName,groupTypes,mail,securityEnabled,mailEnabled,description')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching groups:", error);
            return [];
        }
    }
};
