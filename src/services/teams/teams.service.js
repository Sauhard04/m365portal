// Teams & Collaboration Service - Microsoft Graph API calls

export const TeamsService = {
    /**
     * Get all teams in the organization
     * @param {Client} client - Microsoft Graph client
     */
    async getTeams(client, top = 999) {
        try {
            const response = await client.api('/groups')
                .filter("resourceProvisioningOptions/Any(x:x eq 'Team')")
                .select('id,displayName,description,mail,createdDateTime,visibility')
                .top(top)
                .get();
            return response.value || [];
        } catch (error) {
            console.error('Teams fetch failed:', error);
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
            console.error('Team details fetch failed:', error);
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
            console.error('Team channels fetch failed:', error);
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
            console.error('Team members fetch failed:', error);
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
            console.error('Teams user activity report failed:', error);
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
            console.error('Teams device usage report failed:', error);
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
            console.error('Chats fetch failed:', error);
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
            console.error('Joined teams fetch failed:', error);
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
                this.getTeams(client, 999),
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
    },

    /**
     * Get recent active users in Teams
     * @param {Client} client - Microsoft Graph client
     * @param {string} period - Report period (D7, D30)
     */
    async getRecentActivity(client, period = 'D7') {
        try {
            // Using beta endpoint via the client for JSON format
            const response = await client.api(`/reports/getTeamsUserActivityUserDetail(period='${period}')`)
                .version('beta')
                .get();

            if (response && response.value) {
                return response.value.map(item => ({
                    userPrincipalName: item.userPrincipalName,
                    displayName: item.displayName || item.userPrincipalName?.split('@')[0] || 'Unknown User',
                    lastActivityDate: item.lastActivityDate,
                    teamChatMessages: parseInt(item.teamChatMessageCount) || 0,
                    privateChatMessages: parseInt(item.privateChatMessageCount) || 0,
                    calls: parseInt(item.callCount) || 0,
                    meetings: parseInt(item.meetingCount) || 0,
                    hasActivity: !!item.lastActivityDate
                }))
                    .filter(u => u.hasActivity)
                    .sort((a, b) => new Date(b.lastActivityDate) - new Date(a.lastActivityDate));
            }
            return [];
        } catch (error) {
            console.error('Teams recent activity fetch failed:', error);
            return [];
        }
    }
};

export default TeamsService;
