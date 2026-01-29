import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { executeExchangeJobSync } from '../jobs/exchange.sync.ts';
import { listAudits } from '../shared/logging/exchangeAudit.ts';
import connectDB from './config/db.ts';
import { PowerShellService } from '../services/powerShell.service.ts';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to sitedata.json
const SITEDATA_PATH = path.join(__dirname, '..', 'data', 'sitedata.json');

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
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

/**
 * SITEDATA ENDPOINTS - For AI Chatbot Training
 * Persists all API responses to sitedata.json
 */

// Save site data to sitedata.json
app.post('/api/sitedata/save', async (req, res) => {
    try {
        const data = req.body;
        if (!data) {
            return res.status(400).json({ success: false, error: 'No data provided' });
        }

        // Ensure data directory exists
        const dataDir = path.dirname(SITEDATA_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write data to file
        fs.writeFileSync(SITEDATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[SiteData] Saved ${Object.keys(data.sections || {}).length} sections to sitedata.json`);

        res.json({ success: true, message: 'Site data saved successfully' });
    } catch (err: any) {
        console.error('[SiteData] Save error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

// Load site data from sitedata.json
app.get('/api/sitedata/load', async (_req, res) => {
    try {
        if (!fs.existsSync(SITEDATA_PATH)) {
            return res.json({ success: true, data: { lastUpdated: null, sections: {} } });
        }

        const fileContent = fs.readFileSync(SITEDATA_PATH, 'utf-8');
        const data = JSON.parse(fileContent);

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('[SiteData] Load error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

// Get AI-friendly summary of site data
app.get('/api/sitedata/summary', async (_req, res) => {
    try {
        if (!fs.existsSync(SITEDATA_PATH)) {
            return res.json({ success: true, summary: 'No site data available.' });
        }

        const fileContent = fs.readFileSync(SITEDATA_PATH, 'utf-8');
        const data = JSON.parse(fileContent);

        // Generate summary from stored data
        const summary = generateAISummary(data);

        res.json({ success: true, summary });
    } catch (err: any) {
        console.error('[SiteData] Summary error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

/**
 * Generate AI-friendly summary from stored site data
 */
function generateAISummary(store: any): string {
    const sections = store.sections || {};
    if (Object.keys(sections).length === 0) {
        return "No real-time data available.";
    }

    const summary: string[] = [];
    const lastUpdate = store.lastUpdated ? new Date(store.lastUpdated).toLocaleString() : 'Unknown';

    summary.push(`=== M365 ENVIRONMENT DATA ===`);
    summary.push(`Last Updated: ${lastUpdate}\n`);

    // Process each section
    Object.entries(sections).forEach(([key, section]: [string, any]) => {
        summary.push(`## ${key.toUpperCase()}`);
        const data = section.data;

        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                summary.push(`- Total Items: ${data.length}`);
            } else {
                Object.entries(data).forEach(([k, v]: [string, any]) => {
                    if (typeof v === 'object' && v !== null) {
                        if (Array.isArray(v)) {
                            summary.push(`- ${k}: ${v.length} items`);
                        } else {
                            summary.push(`- ${k}: [object]`);
                        }
                    } else {
                        summary.push(`- ${k}: ${v}`);
                    }
                });
            }
        }
        summary.push('');
    });

    return summary.join('\n');
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Exchange admin server listening on http://localhost:${port}`));
