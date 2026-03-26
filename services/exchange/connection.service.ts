import { spawn } from 'child_process';

export interface PowerShellResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

export interface ExchangeConnectionConfig {
    appId: string;
    tenantId: string;
    certificateThumbprint: string;
}

/**
 * ExchangeConnectionService
 * - Runs ExchangeOnlineManagement PowerShell commands in a single pwsh process
 * - Uses certificate-based app-only auth (Connect-ExchangeOnline -AppId -CertificateThumbprint)
 *
 * Notes:
 * - The hosting machine must have the ExchangeOnlineManagement PowerShell module installed and available to pwsh.
 * - Certificate must be installed in the machine/user store and accessible by thumbprint.
 * - This code executes pwsh child processes and must run in a secure backend environment.
 */
export class ExchangeConnectionService {
    private appId: string;
    private tenantId: string;
    private certificateThumbprint: string;

    constructor(appId: string, tenantId: string, certificateThumbprint: string) {
        this.appId = appId;
        this.tenantId = tenantId;
        this.certificateThumbprint = certificateThumbprint;
    }

    private buildConnectCommands(): string {
        // Uses Connect-ExchangeOnline with certificate-based auth. -Organization can be tenant domain or TenantId
        return `Import-Module ExchangeOnlineManagement -ErrorAction Stop; Connect-ExchangeOnline -AppId ${this.escapePowerShellString(this.appId)} -CertificateThumbprint ${this.escapePowerShellString(this.certificateThumbprint)} -Organization ${this.escapePowerShellString(this.tenantId)} -ShowBanner:$false`;
    }

    private escapePowerShellString(s: string) {
        // wrap in single quotes and double-up single quotes
        const safe = String(s || '').replace(/'/g, "''");
        return `'${safe}'`;
    }

    /**
     * Run an Exchange command block within a pwsh session that first connects using the app cert.
     * The commandBlock should be valid PowerShell (e.g. "Get-OrganizationConfig | ConvertTo-Json -Depth 5").
     */
    async runExchangeCommand(commandBlock: string): Promise<PowerShellResult> {
        const connectCmd = this.buildConnectCommands();
        const full = `${connectCmd}; try { ${commandBlock} } finally { Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue }`;

        return await this.runPowerShell(full);
    }

    private runPowerShell(command: string): Promise<PowerShellResult> {
        return new Promise((resolve) => {
            // Use pwsh (PowerShell Core) if available
            const child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (d) => { stdout += d.toString(); });
            child.stderr.on('data', (d) => { stderr += d.toString(); });

            child.on('close', (code) => {
                resolve({ stdout, stderr, code });
            });

            child.on('error', (err) => {
                resolve({ stdout: '', stderr: err.message, code: 1 });
            });
        });
    }

    async getOrganizationConfig(): Promise<any> {
        const res = await this.runExchangeCommand('Get-OrganizationConfig | ConvertTo-Json -Depth 6');
        if (res.code !== 0) throw new Error(`PowerShellFailed: ${res.stderr || res.stdout}`);
        try {
            return JSON.parse(res.stdout);
        } catch (e) {
            // Not JSON? return raw
            return res.stdout;
        }
    }
}
