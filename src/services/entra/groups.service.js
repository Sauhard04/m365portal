export const GroupsService = {
    getGroupCounts: async (client) => {
        try {
            // Fetch actual groups and count instead of using count API for accuracy
            const [allGroups, securityGroups, distributionGroups] = await Promise.all([
                client.api('/groups').select('id').top(999).get().catch(() => ({ value: [] })),
                client.api('/groups').select('id').filter("securityEnabled eq true").top(999).get().catch(() => ({ value: [] })),
                client.api('/groups').select('id').filter("mailEnabled eq true and securityEnabled eq false").top(999).get().catch(() => ({ value: [] }))
            ]);

            const total = allGroups.value ? allGroups.value.length : 0;
            const security = securityGroups.value ? securityGroups.value.length : 0;
            const distribution = distributionGroups.value ? distributionGroups.value.length : 0;

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
