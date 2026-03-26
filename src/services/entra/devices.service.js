export const DevicesService = {
    getDeviceCounts: async (client) => {
        try {
            // Fetch actual devices and count instead of using count API for accuracy
            // Need Device.Read.All
            const [allDevices, enabledDevices, managedDevices] = await Promise.all([
                client.api('/devices').select('id').top(999).get().catch(() => ({ value: [] })),
                client.api('/devices').select('id').filter("accountEnabled eq true").top(999).get().catch(() => ({ value: [] })),
                client.api('/devices').select('id').filter("isManaged eq true").top(999).get().catch(() => ({ value: [] }))
            ]);

            const total = allDevices.value ? allDevices.value.length : 0;
            const enabled = enabledDevices.value ? enabledDevices.value.length : 0;
            const managed = managedDevices.value ? managedDevices.value.length : 0;

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
                .select('id,displayName,operatingSystem,operatingSystemVersion,accountEnabled,isManaged,approximateLastSignInDateTime,complianceState,trustType,mdmAppId,profileType')
                .expand('registeredOwners($select=id,displayName,userPrincipalName)')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error("Error fetching devices:", error);
            return [];
        }
    }
};
