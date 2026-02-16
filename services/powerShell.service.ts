import { v4 as uuidv4 } from 'uuid';

// dotenv is handled in index.ts

export interface ScriptResult {
    success: boolean;
    stdout: string;
    stderr: string;
    code: number | null;
    error?: string;
    jobId: string;
    workflowUrl?: string;
    data?: any;
}

export class PowerShellService {
    private static GITHUB_PAT = process.env.GITHUB_PAT;
    private static GITHUB_REPO = process.env.GITHUB_REPO; // owner/repo
    private static WORKFLOW_FILENAME = 'terminal.yml';

    private static isBusy = false;
    private static lastStatus = 'Idle';

    static getLiveOutput() {
        return {
            stdout: `Status: ${this.lastStatus}`,
            stderr: '',
            isBusy: this.isBusy
        };
    }

    static resetSession() {
        this.isBusy = false;
        this.lastStatus = 'Session reset';
    }

    static async runScript(command: string, token?: string, tokenType?: string, organization?: string, userUpn?: string): Promise<ScriptResult> {
        if (this.isBusy) {
            return {
                success: false,
                stdout: '',
                stderr: 'Busy: Another workflow is currently running.',
                code: -1,
                jobId: uuidv4()
            };
        }

        if (!this.GITHUB_PAT || !this.GITHUB_REPO) {
            return {
                success: false,
                stdout: '',
                stderr: 'GitHub credentials (GITHUB_PAT, GITHUB_REPO) not configured in .env',
                code: -1,
                jobId: uuidv4()
            };
        }

        this.isBusy = true;
        this.lastStatus = 'Triggering GitHub Action...';
        const trackingJobId = uuidv4();

        try {
            // 1. Trigger the workflow
            const inputs: any = { command };
            if (token && (tokenType === 'scc' || tokenType === 'exo')) {
                inputs.scc_token = token;
                if (organization) inputs.organization = organization;
                if (userUpn) inputs.user_upn = userUpn;
                this.lastStatus = `Triggering ${tokenType.toUpperCase()}-authenticated workflow...`;
            }

            console.log(`[PS Remote] Triggering workflow with inputs: ${Object.keys(inputs).join(', ')}`);

            const triggerRes = await fetch(
                `https://api.github.com/repos/${this.GITHUB_REPO}/actions/workflows/${this.WORKFLOW_FILENAME}/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${this.GITHUB_PAT}`,
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify({
                        ref: 'main',
                        inputs
                    })
                }
            );

            if (!triggerRes.ok) {
                const errorText = await triggerRes.text();
                console.error(`[PS Remote] Trigger failed: ${triggerRes.status} ${errorText}`);
                throw new Error(`GitHub trigger failed: ${errorText}`);
            }

            console.log(`[PS Remote] Workflow dispatch successful.`);

            this.lastStatus = 'Workflow triggered. Waiting for run to start...';

            // 2. Poll for the latest run
            let runId = null;
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const runsRes = await fetch(
                    `https://api.github.com/repos/${this.GITHUB_REPO}/actions/runs?event=workflow_dispatch&per_page=5`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.GITHUB_PAT}`,
                        }
                    }
                );
                const runsData = await runsRes.json();
                if (runsData.workflow_runs) {
                    const latestRun = runsData.workflow_runs.find((r: any) =>
                        r.status !== 'completed' && (Date.now() - new Date(r.created_at).getTime() < 120000)
                    );
                    if (latestRun) {
                        runId = latestRun.id;
                        this.lastStatus = `Workflow running (ID: ${runId})...`;
                        break;
                    }
                }
            }

            if (!runId) {
                this.isBusy = false;
                return {
                    success: false,
                    stdout: 'Workflow triggered but could not track execution.',
                    stderr: 'Run ID not found after 30s. Check GitHub Actions tab manually.',
                    code: -1,
                    jobId: trackingJobId
                };
            }

            // 3. Wait for completion
            let finalStatus = 'in_progress';
            let conclusion = null;
            const startTime = Date.now();
            while (finalStatus !== 'completed' && (Date.now() - startTime < 600000)) { // 10 min timeout
                await new Promise(r => setTimeout(r, 5000));
                const statusRes = await fetch(
                    `https://api.github.com/repos/${this.GITHUB_REPO}/actions/runs/${runId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.GITHUB_PAT}`,
                        }
                    }
                );
                const statusData = await statusRes.json();
                finalStatus = statusData.status;
                conclusion = statusData.conclusion;
                this.lastStatus = `Workflow status: ${finalStatus}... (${Math.round((Date.now() - startTime) / 1000)}s)`;
            }

            // 4. Fetch Logs and Result
            this.lastStatus = 'Run completed. Fetching logs...';
            const jobsRes = await fetch(
                `https://api.github.com/repos/${this.GITHUB_REPO}/actions/runs/${runId}/jobs`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.GITHUB_PAT}`,
                        'Accept': 'application/vnd.github+json'
                    }
                }
            );
            const jobsData = await jobsRes.json();
            const actionJobId = jobsData.jobs && jobsData.jobs[0] ? jobsData.jobs[0].id : null;

            let stdout = 'Workflow finished.';
            let parsedData = null;

            if (actionJobId) {
                const logsRes = await fetch(
                    `https://api.github.com/repos/${this.GITHUB_REPO}/actions/jobs/${actionJobId}/logs`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.GITHUB_PAT}`,
                        }
                    }
                );
                const logsText = await logsRes.text();

                // Look for our delimiter or just take the output
                const startMarker = 'Executing command...\r\n';
                const endMarker = '---END_OF_COMMAND---';

                const startIndex = logsText.lastIndexOf(startMarker);
                const endIndex = logsText.lastIndexOf(endMarker);

                if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                    stdout = logsText.substring(startIndex + startMarker.length, endIndex).trim();
                    // Clean up GitHub log timestamps (e.g. "2024-01...Z ")
                    stdout = stdout.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z /gm, '');

                    if (stdout.startsWith('{') || stdout.startsWith('[')) {
                        try {
                            parsedData = JSON.parse(stdout);
                        } catch (e) {
                            console.warn('Failed to parse output as JSON');
                        }
                    }
                }
            }

            this.isBusy = false;
            const workflowUrl = `https://github.com/${this.GITHUB_REPO}/actions/runs/${runId}`;

            if (conclusion === 'success') {
                return {
                    success: true,
                    stdout: stdout,
                    data: parsedData,
                    stderr: '',
                    code: 0,
                    jobId: trackingJobId,
                    workflowUrl
                };
            } else {
                return {
                    success: false,
                    stdout: stdout,
                    stderr: `Check GitHub for details: ${workflowUrl}`,
                    code: 1,
                    jobId: trackingJobId,
                    workflowUrl
                };
            }

        } catch (error: any) {
            this.isBusy = false;
            this.lastStatus = `Error: ${error.message}`;
            return {
                success: false,
                stdout: '',
                stderr: error.message,
                code: -1,
                jobId: trackingJobId
            };
        }
    }
}
