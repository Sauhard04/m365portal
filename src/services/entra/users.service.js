export const UsersService = {
    // Get summary counts for the Users Tile
    getUserCounts: async (client) => {
        try {
            // Fetch actual users and count instead of using count API for accuracy
            const [allUsers, enabledUsers, licensedUsers, guestUsers] = await Promise.all([
                client.api('/users').select('id').top(999).get().catch(() => ({ value: [] })),
                client.api('/users').select('id').filter("accountEnabled eq true").top(999).get().catch(() => ({ value: [] })),
                client.api('/users').select('id,assignedLicenses').top(999).get().catch(() => ({ value: [] })),
                client.api('/users').select('id').filter("userType eq 'Guest'").top(999).get().catch(() => ({ value: [] }))
            ]);

            const total = allUsers.value ? allUsers.value.length : 0;
            const enabled = enabledUsers.value ? enabledUsers.value.length : 0;
            const licensed = licensedUsers.value ? licensedUsers.value.filter(u => u.assignedLicenses && u.assignedLicenses.length > 0).length : 0;
            const guests = guestUsers.value ? guestUsers.value.length : 0;

            return {
                total,
                enabled,
                licensed,
                guests
            };
        } catch (error) {
            console.error("Error fetching user counts:", error);
            return { total: 0, enabled: 0, licensed: 0, guests: 0 };
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
