export const UsersService = {
    // Get summary counts for the Users Tile
    getUserCounts: async (client) => {
        try {
            // Parallel requests for counts
            // Parallel requests for counts
            const [total, enabled, licensed, guest] = await Promise.all([
                client.api('/users').header('ConsistencyLevel', 'eventual').count(true).get().then(res => res['@odata.count'] || 0),
                client.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter("accountEnabled eq true").get().then(res => res['@odata.count'] || 0),
                client.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter("assignedLicenses/$count ne 0").get().then(res => res['@odata.count'] || 0),
                client.api('/users').header('ConsistencyLevel', 'eventual').count(true).filter("userType eq 'Guest'").get().then(res => res['@odata.count'] || 0)
            ]);

            return {
                total,
                enabled,
                licensed,
                guests: guest
            };
        } catch (error) {
            console.error("Error fetching user counts:", error);
            return { total: 0, enabled: 0, licensed: 0, lists: 0 };
        }
    },

    // Get List of users with specific fields
    getAllUsers: async (client, top = 50) => {
        try {
            const response = await client.api('/users')
                .select('id,displayName,userPrincipalName,userType,accountEnabled,assignedLicenses,city,country,department,jobTitle')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }
};
