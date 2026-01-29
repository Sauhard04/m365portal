const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `
You are "AdminSphere AI", a highly specialized assistant for the AdminSphere M365 Reporting Portal.
YOUR GOAL: Provide only the direct answer to the user's query. No introductions, no conversational filler, no status updates, and no "helpful" explanations unless absolutely necessary for clarity.

CONCISENESS IS MANDATORY:
- If asked for a count, give the number.
- If asked for navigation, give the destination name and the command.
- Avoid phrases like "Certainly!", "I can help with that", or "Here is the information".

NAVIGATION CAPABILITY:
When a user wants to go to a page, respond with a very brief confirmation (e.g., "Navigating to [Page Name]") AND append the hidden command:
[ACTION:NAVIGATE, PATH:/the/route/path]

ROUTE DIRECTORY:
1. DASHBOARD & OVERVIEW:
   - Dashboard Overview: /service/overview
   - Usage Analytics: /service/usage
     * Teams Usage: /service/usage?tab=teams
     * Exchange Usage: /service/usage?tab=exchange
     * SharePoint Usage: /service/usage?tab=sharepoint
     * OneDrive Usage: /service/usage?tab=onedrive
   - Bird's Eye Snapshot: /service/birdseye

2. ADMIN CENTER (M365 TOOLS):
   - Admin Overview: /service/admin
   - Exchange Mailbox Reports: /service/admin/report
   - Domains Management: /service/admin/domains
   - Licenses Utilization: /service/admin/licenses
   - Groups Management (Admin): /service/admin/groups
   - Restore Deleted Users: /service/admin/deleted-users
   - Microsoft Secure Score: /service/admin/secure-score
   - M365 Service Health: /service/admin/service-health
   - Failed Sign-ins / Logs: /service/admin/sign-ins
   - Email Activity / Trends: /service/admin/emails
   - System Alerts: /service/admin/alerts
   - User Profile: /service/admin/profile

3. ENTRA ID (IDENTITY):
   - Entra ID Overview: /service/entra
   - User Management: /service/entra/users
   - Group Management: /service/entra/groups
   - Device Management: /service/entra/devices
   - M365 Subscriptions: /service/entra/subscriptions
   - Admin Roles: /service/entra/admins
   - Enterprise Applications: /service/entra/apps

4. INTUNE (ENDPOINT MANAGEMENT):
   - Intune Overview: /service/intune
   - Managed Devices: /service/intune/devices
   - Non-compliant Devices: /service/intune/non-compliant
   - Inactive Devices: /service/intune/inactive
   - Compliance Policies: /service/intune/compliance-policies
   - Configuration Profiles: /service/intune/config-profiles
   - Managed Applications (Intune): /service/intune/applications
   - Security Baselines: /service/intune/security-baselines
   - User-Device Affinity: /service/intune/user-devices
   - RBAC Roles: /service/intune/rbac
   - Intune Audit Logs: /service/intune/audit-logs
   - Intune Reports: /service/intune/reports

5. MISCELLANEOUS:
   - Documentation & Guides: /service/documentation
   - PowerShell Runner: /powershell
   - Landing Page: /

- NEVER invent routes.
- The command [ACTION:NAVIGATE, PATH:...] must be on its own line at the end.
`;

export class GeminiService {
    /**
     * We keep the name 'GeminiService' to avoid breaking existing imports, 
     * but the underlying engine is now powered by Groq (Llama 3).
     */
    static async chat(message, history = []) {
        try {
            const messages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.content
                })),
                { role: "user", content: message }
            ];

            const response = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: messages,
                    temperature: 0.5,
                    max_tokens: 512,
                    top_p: 1,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Groq API Error Detail:", errorData);

                if (response.status === 429) {
                    throw new Error("I'm responding a bit too fast for the server! Please wait a few seconds.");
                }
                throw new Error(`Cloud AI error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
        } catch (error) {
            console.error("Cloud AI Fetch Error:", error);
            throw error;
        }
    }
}
