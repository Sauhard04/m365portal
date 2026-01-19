import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { executeExchangeJobSync } from '../jobs/exchange.sync.ts';
import { listAudits } from '../shared/logging/exchangeAudit.ts';
import connectDB from './config/db.ts';
import { PowerShellService } from '../services/powerShell.service.ts';

// Connect to MongoDB
connectDB();

// If Redis is available, ensure worker is started
try {
    import('../jobs/workers/exchange.worker').catch(() => {
        console.warn('BullMQ worker not started (Redis may not be available). Using sync mode.');
    });
} catch (e) {
    // Worker optional
}

const app = express();
app.use(cors()); // Allow all CORS for dev
app.use(bodyParser.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/**
 * Enqueue and execute Get-OrganizationConfig synchronously (no BullMQ needed)
 * Returns result immediately
 */
app.post('/api/jobs/org-config', async (_req, res) => {
    try {
        const result = await executeExchangeJobSync({ action: 'Get-OrganizationConfig' });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ success: false, error: String(err) });
    }
});

app.get('/api/audits', async (req, res) => {
    try {
        const limit = parseInt(String(req.query.limit || '50'), 10);
        const rows = await listAudits(limit);
        res.json({ success: true, audits: rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: String(err) });
    }
});

/**
 * NEW: Generic PowerShell Script Runner
 * POST /api/script/run
 * Body: { "command": "Get-Date" }
 */
app.post('/api/script/run', async (req, res) => {
    try {
        const { command, token, tokenType, organization, userUpn } = req.body;
        if (!command) {
            return res.status(400).json({ success: false, error: 'Missing command' });
        }

        console.log(`Executing script (Remote): ${command.substring(0, 50)}... with token: ${!!token}, org: ${organization || 'N/A'}, upn: ${userUpn || 'N/A'}`);
        const result = await PowerShellService.runScript(command, token, tokenType, organization, userUpn);
        res.json(result);
    } catch (err: any) {
        console.error('Script execution error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

/**
 * NEW: Peek at the live output of the current running command
 * GET /api/script/peek
 */
app.get('/api/script/peek', (_req, res) => {
    res.json(PowerShellService.getLiveOutput());
});

/**
 * NEW: Reset the persistent PowerShell session
 * POST /api/script/reset
 */
app.post('/api/script/reset', (_req, res) => {
    PowerShellService.resetSession();
    res.json({ success: true, message: 'Session reset' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Exchange admin server listening on http://localhost:${port}`));
