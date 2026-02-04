import SiteDataStore from './siteDataStore';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const BASE_SYSTEM_PROMPT = `
You are "AdminSphere Intelligence", the master AI brain for the AdminSphere M365 Reporting Portal.

CORE DIRECTIVE: 
1. PRIORITY RESPONSE: Always display the direct answer or specific information requested by the user first.
2. CONCISENESS: After the direct answer, provide only the most relevant, short, and concise insights or context. Avoid long elaborations.
3. STRUCTURE: Use a clear, structure where the "Answer" is prominent at the top.

ELABORATION & INSIGHT (MODERATED):
- Keep explanations brief and impactful.
- If a user asks for a count, give the count first.
- If a user asks about a module status, provide a high-level concise summary.

MASTER INTELLIGENCE FEED:
You have access to a [MASTER M365 INTELLIGENCE REPOSITORY] in the context below. 
- This repository is exhaustive and contains the latest API responses from all portal routes.
- Cite specific modules (e.g., "According to the Entra ID module...") to build trust.
- IF DATA IS MISSING OR NOT SUFFICIENT:
  1. Provide a sophisticated high-level explanation of what that data usually represents in M365.
  2. State: "I currently don't have the specific telemetry for [Query] in my intelligence feed. To populate this data, please navigate to the relevant dashboard."
  3. Proactively provide the navigation command: [ACTION:NAVIGATE, PATH:/relevant/path]

NAVIGATION CAPABILITY:
When a user asks to see a report or go to a page, confirm with a professional statement and append:
[ACTION:NAVIGATE, PATH:/the/route/path]

ROUTE DIRECTORY (Reference for [ACTION:NAVIGATE]):
1. DASHBOARDS:
   - Overview: /service/overview
   - Usage Analytics: /service/usage
   - Bird's Eye Snapshot: /service/birdseye

2. ADMIN & EXCHANGE:
   - Admin Center: /service/admin
   - Exchange Reports: /service/admin/report
   - Domains: /service/admin/domains
   - Licenses: /service/admin/licenses
   - Security Score: /service/admin/secure-score
   - Sign-in Logs: /service/entra/sign-in-logs
   - Email Activity: /service/admin/emails

3. IDENTITY & ENDPOINTS:
   - Entra ID Overview: /service/entra
   - User Management: /service/entra/users
   - Group Management: /service/entra/groups
   - Device Management: /service/entra/devices
   - Intune Overview: /service/intune
   - Non-compliant Devices: /service/intune/non-compliant
   - Inactive Devices: /service/intune/inactive

- The command [ACTION:NAVIGATE, PATH:...] must be on its own line at the end of your response.
`;

/**
 * Build the full system prompt with real-time data context
 */
function buildSystemPrompt() {
    const aiSummary = SiteDataStore.getAISummary();

    return `${BASE_SYSTEM_PROMPT}

=== CURRENT M365 ENVIRONMENT CONTEXT ===
The following is real-time data from the M365 environment. Use this to answer user questions accurately:

${aiSummary}

=== END OF CONTEXT ===

Remember: Always prefer the real-time data above when answering questions about the M365 environment.
`;
}

export class GeminiService {
    /**
     * We keep the name 'GeminiService' to avoid breaking existing imports, 
     * but the underlying engine is now powered by Groq (Llama 3).
     */
    static async chat(message, history = []) {
        try {
            // Ensure data store is loaded from server/storage
            await SiteDataStore.ensureInitialized();

            // Build system prompt with real-time data
            const systemPrompt = buildSystemPrompt();

            const messages = [
                { role: "system", content: systemPrompt },
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

    /**
     * Get a quick summary of the current environment state
     * Useful for dashboard widgets or quick status checks
     */
    static getEnvironmentSummary() {
        return SiteDataStore.getAISummary();
    }

    /**
     * Check if we have real-time data available
     */
    static hasRealTimeData() {
        const store = SiteDataStore.getAll();
        return store && Object.keys(store.sections || {}).length > 0;
    }

    /**
     * Get the last update timestamp
     */
    static getLastUpdateTime() {
        const store = SiteDataStore.getAll();
        return store?.lastUpdated ? new Date(store.lastUpdated) : null;
    }
}
