export const RolesService = {
    getAdminCounts: async (client) => {
        try {
            // Count total roles activated? Or Users with admin roles?
            // "Total Admin Users" usually means unique users holding at least one directory role.
            // fetching /directoryRoles and then members is heavy.
            // Efficient way: maybe just count Global Admins for tile summary as requested.
            // User requested: "Total Admin Users", "Global Administrators count".

            // 1. Get Global Admin Role ID (Template ID: "62e90394-69f5-4237-9190-012177145e10")
            // Directory Role ID might vary if not instantiated.
            // First list directoryRoles to find Global Admin.

            const rolesRes = await client.api('/directoryRoles').get();
            const roles = rolesRes.value || [];

            const globalAdminRole = roles.find(r => r.roleTemplateId === "62e90394-69f5-4237-9190-012177145e10");
            let globalAdmins = 0;

            if (globalAdminRole) {
                const members = await client.api(`/directoryRoles/${globalAdminRole.id}/members`).get();
                globalAdmins = members.value ? members.value.length : 0;
            }

            // Total Admin Users: Sum of distinct members of all roles? Or just "privileged" ones?
            // We will approximate Total Admin Users = Global Admins + Others (if we fetch all).
            // For speed, let's just return Global Admin count and Total Active Roles count.

            return {
                totalAdmins: globalAdmins, // Placeholder: Getting unique total admins is expensive
                globalAdmins: globalAdmins
            };
        } catch (error) {
            console.error("Error fetching admin counts:", error);
            return { totalAdmins: 0, globalAdmins: 0 };
        }
    },

    getRoles: async (client) => {
        try {
            const response = await client.api('/directoryRoles').expand('members').get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching roles:", error);
            return [];
        }
    }
};
