// Teams & Collaboration Service - Microsoft Graph API calls

export const TeamsService = {
    /**
     * Get all teams in the organization
     * @param {Client} client - Microsoft Graph client
     */
    async getTeams(client, top = 100) {
        try {
            const response = await client.api('/groups')
                .filter("resourceProvisioningOptions/Any(x:x eq 'Team')")
                .select('id,displayName,description,mail,createdDateTime,visibility')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Teams fetch failed:', error);
            return [];
        }
    },

    /**
     * Get team details by ID
     * @param {Client} client - Microsoft Graph client
     * @param {string} teamId - Team ID
     */
    async getTeamById(client, teamId) {
        try {
            const response = await client.api(`/teams/${teamId}`)
                .select('id,displayName,description,isArchived,visibility,webUrl')
                .get();
            return response;
        } catch (error) {
            console.warn('Team details fetch failed:', error);
            return null;
        }
    },

    /**
     * Get team channels
     * @param {Client} client - Microsoft Graph client
     * @param {string} teamId - Team ID
     */
    async getTeamChannels(client, teamId) {
        try {
            const response = await client.api(`/teams/${teamId}/channels`)
                .select('id,displayName,description,membershipType,createdDateTime')
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Team channels fetch failed:', error);
            return [];
        }
    },

    /**
     * Get team members
     * @param {Client} client - Microsoft Graph client
     * @param {string} teamId - Team ID
     */
    async getTeamMembers(client, teamId) {
        try {
            const response = await client.api(`/teams/${teamId}/members`)
                .select('id,displayName,roles,email')
                .top(100)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Team members fetch failed:', error);
            return [];
        }
    },

    /**
     * Get Teams activity report (users summary)
     * @param {Client} client - Microsoft Graph client
     */
    async getTeamsUserActivity(client) {
        try {
            const response = await client.api('/reports/getTeamsUserActivityUserDetail(period=\'D7\')')
                .get();
            return response;
        } catch (error) {
            console.warn('Teams user activity report failed:', error);
            return null;
        }
    },

    /**
     * Get Teams device usage
     * @param {Client} client - Microsoft Graph client
     */
    async getTeamsDeviceUsage(client) {
        try {
            const response = await client.api('/reports/getTeamsDeviceUsageUserDetail(period=\'D7\')')
                .get();
            return response;
        } catch (error) {
            console.warn('Teams device usage report failed:', error);
            return null;
        }
    },

    /**
     * Get all chats for current user
     * @param {Client} client - Microsoft Graph client
     */
    async getMyChats(client, top = 50) {
        try {
            const response = await client.api('/me/chats')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Chats fetch failed:', error);
            return [];
        }
    },

    /**
     * Get joined teams for current user
     * @param {Client} client - Microsoft Graph client
     */
    async getMyJoinedTeams(client) {
        try {
            const response = await client.api('/me/joinedTeams')
                .select('id,displayName,description,isArchived,visibility')
                .get();
            return response.value || [];
        } catch (error) {
            console.warn('Joined teams fetch failed:', error);
            return [];
        }
    },

    /**
     * Get dashboard summary for Teams
     * @param {Client} client - Microsoft Graph client
     */
    async getDashboardSummary(client) {
        try {
            const [allTeams, myTeams, myChats] = await Promise.all([
                this.getTeams(client, 100),
                this.getMyJoinedTeams(client),
                this.getMyChats(client, 50)
            ]);

            // Group teams by visibility
            const teamsByVisibility = allTeams.reduce((acc, team) => {
                const vis = team.visibility || 'unknown';
                acc[vis] = (acc[vis] || 0) + 1;
                return acc;
            }, {});

            // Count archived teams
            const archivedTeams = allTeams.filter(t => t.isArchived).length;

            // Recent teams (created in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentTeams = allTeams.filter(t =>
                t.createdDateTime && new Date(t.createdDateTime) > thirtyDaysAgo
            ).length;

            return {
                teams: {
                    total: allTeams.length,
                    byVisibility: teamsByVisibility,
                    archived: archivedTeams,
                    recentlyCreated: recentTeams,
                    topTeams: allTeams.slice(0, 5)
                },
                myTeams: {
                    total: myTeams.length,
                    teams: myTeams.slice(0, 5)
                },
                chats: {
                    total: myChats.length
                },
                activity: {
                    // These would be populated from report data in a full implementation
                    activeCalls: 0,
                    activeMessages: 0
                }
            };
        } catch (error) {
            console.error('Teams dashboard summary fetch failed:', error);
            return {
                teams: { total: 0, byVisibility: {}, archived: 0, recentlyCreated: 0, topTeams: [] },
                myTeams: { total: 0, teams: [] },
                chats: { total: 0 },
                activity: { activeCalls: 0, activeMessages: 0 }
            };
        }
    }
};

export default TeamsService;
