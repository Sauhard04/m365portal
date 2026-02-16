import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { executeExchangeJobSync } from '../jobs/exchange.sync.js';
import { listAudits } from '../shared/logging/exchangeAudit.js';
import connectDB from './config/db.js';
import { PowerShellService } from '../services/powerShell.service.js';
import { subscriptionGuard } from './middleware/subscriptionGuard.js';

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
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// Security Headers Middleware
app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

/**
 * Proxy for downloading reports to bypass CORS
 * GET /api/proxy/download?url=...
 */
app.get('/api/proxy/download', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing url parameter' });
        }

        console.log(`[Proxy] Downloading report from: ${url}`);

        // Use native fetch (Node 18+) or dynamic import
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch report: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        // Use arrayBuffer to read the full response and send it
        const buffer = await response.arrayBuffer();
        res.end(Buffer.from(buffer));

    } catch (err: any) {
        console.error('[Proxy] Download error:', err);
        res.status(500).json({ error: String(err) });
    }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/**
 * Enqueue and execute Get-OrganizationConfig synchronously (no BullMQ needed)
 * Returns result immediately
 */
app.post('/api/jobs/org-config', subscriptionGuard, async (_req, res) => {
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
app.post('/api/script/run', subscriptionGuard, async (req, res) => {
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

// Save site data to sitedata.json (supports full overwrite or partial section update)
app.post('/api/sitedata/save', subscriptionGuard, async (req, res) => {
    try {
        const body = req.body;
        if (!body) {
            return res.status(400).json({ success: false, error: 'No data provided' });
        }

        // Ensure data directory exists
        const dataDir = path.dirname(SITEDATA_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        let finalData;

        // Check if this is a partial update (a specific section)
        if (body.sectionKey && body.sectionData) {
            console.log(`[SiteData] Partial update received for section: ${body.sectionKey}`);
            let currentData: any = { lastUpdated: Date.now(), sections: {} };

            if (fs.existsSync(SITEDATA_PATH)) {
                try {
                    currentData = JSON.parse(fs.readFileSync(SITEDATA_PATH, 'utf-8'));
                } catch (e) {
                    console.warn('[SiteData] Existing file corrupted, starting fresh');
                }
            }

            if (!currentData.sections) currentData.sections = {};
            currentData.sections[body.sectionKey] = body.sectionData;
            currentData.lastUpdated = Date.now();
            finalData = currentData;
        } else {
            // Full overwrite
            console.log(`[SiteData] Full overwrite received`);
            finalData = body;
        }

        // Write data to file
        fs.writeFileSync(SITEDATA_PATH, JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`[SiteData] Saved ${Object.keys(finalData.sections || {}).length} sections to sitedata.json`);

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

// Production mode: Serve static files from Vite build
const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('dist');

console.log(`[Server] Initialization: NODE_ENV=${process.env.NODE_ENV}, __dirname=${__dirname}, cwd=${process.cwd()}`);

if (isProduction) {
    // Try multiple possible locations for the frontend build
    const possibleStaticPaths = [
        path.join(__dirname, '..'), // Standard: dist/ (one level up from dist/backend)
        path.join(__dirname, '../dist'), // Fallback 1
        path.join(process.cwd(), 'dist'), // Fallback 2: dist in CWD
        path.join(process.cwd()), // Fallback 3: CWD itself
    ];

    let clientPath = '';
    for (const p of possibleStaticPaths) {
        if (fs.existsSync(path.join(p, 'index.html'))) {
            clientPath = p;
            console.log(`[Production] Found index.html at: ${p}`);
            break;
        }
    }

    if (!clientPath) {
        console.warn(`[Production] WARNING: index.html not found in any expected location!`);
        // Default to one level up but we'll reflect this in the 404
        clientPath = path.join(__dirname, '..');
    }

    console.log(`[Production] Serving static files from: ${clientPath}`);
    app.use(express.static(clientPath));

    // Catch-all route for client-side routing (must be last)
    app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: `API endpoint ${req.path} not found` });
        }

        const indexPath = path.join(clientPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            console.error(`[Error] 404 Catch-all: index.html not found at ${indexPath}`);
            res.status(404).send(`
                <h1>Frontend build not found</h1>
                <p>The server is running but could not locate the frontend files.</p>
                <p>Target path: <code>${indexPath}</code></p>
                <p>Please ensure "npm run build" was successful before deployment.</p>
            `);
        }
    });
} else {
    console.log('[Development] Server running in development mode. Not serving static files.');
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Exchange admin server listening on http://localhost:${port}`));
