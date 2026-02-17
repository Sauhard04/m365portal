import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { executeExchangeJobSync } from '../jobs/exchange.sync';
import { listAudits } from '../shared/logging/exchangeAudit';
import connectDB from './config/db';
import { PowerShellService } from '../services/powerShell.service';
import { subscriptionGuard } from './middleware/subscriptionGuard';
import mongoose from 'mongoose';
import { PDF } from '../src/models/PDF';
import { IncomingForm } from 'formidable';

const VERSION = '1.2.0-azure-stable';
console.log(`\n🚀 M365 Portal Backend v${VERSION} starting...`);

// Load environment variables
dotenv.config();

// Use absolute path for data files to be consistent in Azure
const SITEDATA_PATH = path.join(process.cwd(), 'data', 'sitedata.json');

// Connect to MongoDB
connectDB();

// If Redis is available, ensure worker is started
const REDIS_HOST = process.env.REDIS_HOST || process.env.REDIS_URL || process.env.REDIS_CACHE_HOST;
if (REDIS_HOST) {
    try {
        console.log('[System] Redis configuration found, attempting to start BullMQ worker...');
        import('../jobs/workers/exchange.worker').catch((err) => {
            console.warn('[System] BullMQ worker found but failed to start. Falling back to sync mode.', err.message);
        });
    } catch (e: any) {
        console.warn('[System] Worker module failed to load:', e.message);
    }
} else {
    // Silence the BullMQ message entirely in production unless Redis is intended
    if (process.env.NODE_ENV !== 'production') {
        console.log('[System] No Redis configuration found. Using sync mode for background jobs.');
    }
}

const app = express();
app.use(cors()); // Allow all CORS for dev
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// Security Headers Middleware
app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; frame-src 'self' https://login.microsoftonline.com;");
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
 * Runtime configuration for the frontend
 */
app.get('/api/config', (_req, res) => {
    res.json({
        VITE_CLIENT_ID: process.env.VITE_CLIENT_ID || process.env.CLIENT_ID,
        VITE_TENANT_ID: process.env.VITE_TENANT_ID || process.env.TENANT_ID,
        VITE_GROQ_API_KEY: process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY,
        VITE_PURVIEW_ACCOUNT_NAME: process.env.VITE_PURVIEW_ACCOUNT_NAME || process.env.PURVIEW_ACCOUNT_NAME,
        VITE_PURVIEW_ENDPOINT: process.env.VITE_PURVIEW_ENDPOINT || process.env.PURVIEW_ENDPOINT,
        VITE_WEB3FORMS_ACCESS_KEY: process.env.VITE_WEB3FORMS_ACCESS_KEY || process.env.WEB3FORMS_ACCESS_KEY
    });
});

/**
 * PDF / Documentation Endpoints
 */

// List all PDFs (metadata only)
app.get('/api/pdfs', async (_req, res) => {
    try {
        console.log('[API] Fetching PDF list...');
        const files = await PDF.find({}, 'fileName displayName size uploadedAt');
        const formattedFiles = files.map(file => ({
            id: file._id,
            name: file.displayName,
            fileName: file.fileName,
            path: `/api/pdfs/view/${file._id}`,
            uploadedAt: file.uploadedAt
        }));
        res.json(formattedFiles);
    } catch (err: any) {
        console.error('[API] Error listing PDFs:', err);
        res.status(500).json({ error: String(err) });
    }
});

// Upload a new PDF
app.post('/api/pdfs/upload', async (req, res) => {
    try {
        console.log('[API] Handling PDF upload...');
        const form = new IncomingForm({
            keepExtensions: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB
        });

        form.parse(req, async (err, _fields, files) => {
            if (err) {
                console.error('[API] Form parsing error:', err);
                return res.status(500).json({ success: false, error: String(err) });
            }

            const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
            if (!uploadedFile) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const fileBuffer = fs.readFileSync(uploadedFile.filepath);
            const originalName = uploadedFile.originalFilename || `document-${Date.now()}.pdf`;
            const displayName = originalName.replace('.pdf', '').replace(/-|_/g, ' ');

            const newPDF = new PDF({
                fileName: originalName,
                displayName: displayName,
                fileData: fileBuffer,
                contentType: uploadedFile.mimetype || 'application/pdf',
                size: uploadedFile.size
            });

            await newPDF.save();
            fs.unlinkSync(uploadedFile.filepath); // Clean up temp file

            console.log(`[API] ✅ PDF Uploaded: ${originalName}`);
            res.json({ success: true, fileName: originalName });
        });
    } catch (err: any) {
        console.error('[API] Upload error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

// View/Download PDF content
app.get('/api/pdfs/view/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pdf = await PDF.findById(id);

        if (!pdf) {
            return res.status(404).send('PDF not found');
        }

        res.setHeader('Content-Type', pdf.contentType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${pdf.fileName}"`);
        res.setHeader('Content-Length', pdf.fileData.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');

        res.send(pdf.fileData);
    } catch (err: any) {
        console.error('[API] Error serving PDF:', err);
        res.status(500).send('Error retrieving PDF');
    }
});

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

// Health check endpoint (can be used by Azure for readiness)
app.get('/health', async (_req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: dbStatus === 'connected' ? 'ok' : 'error',
        database: dbStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Production mode: Serve static files from Vite build
const isProduction = process.env.NODE_ENV === 'production' ||
    __dirname.includes('dist') ||
    __dirname.includes('wwwroot') ||
    __dirname.includes('site');

console.log(`[Server] Initialization: NODE_ENV=${process.env.NODE_ENV}, __dirname=${__dirname}, cwd=${process.cwd()}, isProduction=${isProduction}`);

if (isProduction) {
    // Try multiple possible locations for the frontend build
    const possibleStaticPaths = [
        path.join(__dirname, '..'), // Standard: dist/ (one level up from dist/backend)
        path.join(__dirname, '../dist'), // Fallback 1
        path.join(process.cwd(), 'dist'), // Fallback 2: dist in CWD
        path.join(process.cwd()), // Fallback 3: CWD itself
        path.join(process.cwd(), 'client/dist'), // Fallback 4
    ];

    let clientPath = '';
    console.log(`[Production] Searching for frontend (index.html)...`);
    for (const p of possibleStaticPaths) {
        const exists = fs.existsSync(path.join(p, 'index.html'));
        console.log(`  - Checking: ${p} ... [${exists ? '✅ FOUND' : '❌ NOT FOUND'}]`);
        if (exists) {
            clientPath = p;
            break;
        }
    }

    if (!clientPath) {
        console.warn(`\n[Production] ⚠️ ERROR: index.html not found in any expected location!`);
        console.warn(`[Production] Serving basic error page instead.`);
        clientPath = path.join(__dirname, '..');
    } else {
        console.log(`[Production] ✅ Serving static files from: ${clientPath}`);
    }

    app.use(express.static(clientPath));

    // Catch-all route for client-side routing (must be last)
    app.get(/^\/(?!api).*/, (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: `API endpoint ${req.path} not found` });
        }

        const indexPath = path.join(clientPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send(`
                <div style="font-family: sans-serif; padding: 2rem; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 0.5rem;">
                    <h1 style="color: #c53030;">Deployment Configuration Error</h1>
                    <p>The server is running but could not locate the <b>index.html</b> file.</p>
                    <p><b>Tried Path:</b> <code>${indexPath}</code></p>
                    <hr>
                    <p><b>Troubleshooting:</b></p>
                    <ol>
                        <li>Ensure <code>npm run build</code> was successful in your deployment.</li>
                        <li>Check if the <code>dist</code> folder contains <code>index.html</code>.</li>
                        <li>Verify that <code>package.json</code> points to the correct build output.</li>
                    </ol>
                </div>
            `);
        }
    });
}
else {
    console.log('[Development] Server running in development mode. Not serving static files.');
}

const port = Number(process.env.PORT) || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Server is live and listening on 0.0.0.0:${port}`);
    console.log(`📊 Health Check: http://localhost:${port}/health`);
    console.log('--- READY TO HANDLE REQUESTS ---\n');
});
