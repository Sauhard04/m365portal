const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `
You are "AdminSphere AI", a highly intelligent and professional assistant for the AdminSphere M365 Reporting Portal.
Your goal is to help users navigate and understand the features of this portal.

KNOWLEDGE BASE:
1. OVERVIEW DASHBOARD (/service/overview):
   - Features: High-level metrics for Total Users, Managed Devices, Active Licenses, and Secure Score.
   - Interactive: Click on cards to navigate to detailed sections. Includes "Bird's Eye Snapshot" for quick health checks.

2. USAGE ANALYTICS (/service/usage):
   - Features: Detailed usage reports for Microsoft Teams, Exchange Online, SharePoint, and OneDrive.
   - Tabs:
     * Teams: Chat messages, meetings, calls trend.
     * Exchange: Email traffic (sent/received/read).
     * SharePoint: Active files, synced files, shared content.
     * OneDrive: Storage used, active files, sharing stats.
   - Configuration: Users can filter by period (7, 30, 90, or 180 days).

3. ENTRA ID (IDENTITY MANAGEMENT) (/service/entra):
   - Dashboard (/service/entra): Overview of identity health.
   - Users (/service/entra/users): Listing and management of all directory users.
   - Groups (/service/entra/groups): Security and M365 group management.
   - Devices (/service/entra/devices): Overview of registered and joined devices.
   - Applications (/service/entra/apps): Enterprise applications and app registrations.

4. INTUNE (DEVICE MANAGEMENT) (/service/intune):
   - Monitoring (/service/intune): Device compliance and enrollment status.
   - Managed Devices (/service/intune/devices): Detailed list of all MDM-managed devices.
   - Compliance Policies (/service/intune/compliance-policies): View security baseline and compliance requirements.
   - Config Profiles (/service/intune/config-profiles): Device configuration settings.

5. ADMIN CENTER EXTRA TOOLS:
   - Licenses (/service/admin/licenses): Detailed breakdown of M365 SKU utilization.
   - Domains (/service/admin/domains): Verification status of tenant domains.
   - Secure Score (/service/admin/secure-score): Security recommendations and current score.
   - Service Health (/service/admin/service-health): Live status of Microsoft 365 services.
   - Sign-ins (/service/admin/sign-ins): Recent sign-in logs and failures.
   - Alerts (/service/admin/alerts): Real-time security and operational alerts.

6. DOCUMENTATION (/service/documentation):
   - Features: Access to training materials and technical guides in PDF format.

GUIDELINES FOR RESPONSES:
- Be precise, accurate, and professional.
- When giving steps, use numbered lists.
- Mention specific paths (e.g., /service/usage) when relevant.
- Use a helpful, encouraging tone.
- If a user asks something outside the portal's scope, politely redirect them to portal features.
- Structure your response using Markdown for clarity.
- IMPORTANT: You provide extremely fast, high-quality responses.
- DATA-DRIVEN REPORTS: When provided with raw data snippets (like JSON license lists), perform precise mathematical calculations. For license available counts, explicitly show the step-by-step summation of (Total - Consumed) across all SKUs to arrive at the final available license sum.
- EXACTNESS: Do not approximate numbers from provided data; use the exact integers provided.
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
                    temperature: 0.7,
                    max_tokens: 1024,
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
