/* eslint-disable */
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
// @ts-ignore
import { PDF } from '../src/models/PDF';
// @ts-ignore
import { Tenant } from '../src/models/Tenant';
// @ts-ignore
import { IncomingForm } from 'formidable';
import Report from './models/Report';
import Alert from './models/Alert';
import SiteData from './models/SiteData';

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
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://api.web3forms.com; frame-src 'self' https://login.microsoftonline.com;");
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
app.get('/api/config', async (_req, res) => {
    try {
        let tenants = [];
        try {
            // Only attempt if mongoose is connected or connecting
            if (mongoose.connection.readyState !== 0) {
                tenants = await Tenant.find({}).maxTimeMS(2000);
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching tenants for config, using empty list.');
        }

        res.json({
            VITE_CLIENT_ID: process.env.VITE_CLIENT_ID || process.env.CLIENT_ID,
            VITE_TENANT_ID: process.env.VITE_TENANT_ID || process.env.TENANT_ID,
            VITE_GROQ_API_KEY: process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY,
            VITE_PURVIEW_ACCOUNT_NAME: process.env.VITE_PURVIEW_ACCOUNT_NAME || process.env.PURVIEW_ACCOUNT_NAME,
            VITE_PURVIEW_ENDPOINT: process.env.VITE_PURVIEW_ENDPOINT || process.env.PURVIEW_ENDPOINT,
            VITE_WEB3FORMS_ACCESS_KEY: process.env.VITE_WEB3FORMS_ACCESS_KEY || process.env.WEB3FORMS_ACCESS_KEY,
            tenants: tenants.map((t: any) => ({
                tenantId: t.tenantId,
                clientId: t.clientId,
                displayName: t.displayName
            }))
        });
    } catch (err: any) {
        console.error('[API] Config critical error:', err);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

/**
 * Multi-Tenant Management Endpoints
 */

// List all registered tenants
app.get('/api/tenants', async (_req, res) => {
    try {
        let tenants = [];
        try {
            if (mongoose.connection.readyState !== 0) {
                tenants = await Tenant.find({}).maxTimeMS(2000);
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching tenants list, using empty list.');
        }
        res.json(tenants);
    } catch (err: any) {
        console.error('[API] Tenants critical error:', err);
        res.status(500).json({ error: String(err) });
    }
});

// Add or update a tenant
app.post('/api/tenants', async (req, res) => {
    try {
        const { tenantId, clientId, displayName, isActive } = req.body;
        console.log('[API] POST /api/tenants - Request body:', req.body);
        console.log('[API] Extracted fields:', { tenantId, clientId, displayName, isActive });

        if (!tenantId || !clientId || !displayName) {
            return res.status(400).json({ error: 'Missing required tenant fields' });
        }

        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            { clientId, displayName, isActive: isActive !== undefined ? isActive : true },
            { upsert: true, new: true }
        );

        console.log(`[API] Tenant updated: ${displayName} (${tenantId})`);
        console.log('[API] Saved tenant document:', JSON.stringify(tenant, null, 2));
        res.json({ success: true, tenant });
    } catch (err: any) {
        console.error('[API] Tenant update error:', err);
        res.status(500).json({ error: String(err) });
    }
});

// Delete a tenant
app.delete('/api/tenants/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        await Tenant.findOneAndDelete({ tenantId });
        console.log(`[API] Tenant deleted: ${tenantId}`);
        res.json({ success: true, message: 'Tenant deleted successfully' });
    } catch (err: any) {
        console.error('[API] Tenant deletion error:', err);
        res.status(500).json({ error: String(err) });
    }
});

/**
 * PDF / Documentation Endpoints
 */

// List all PDFs (metadata only)
app.get('/api/pdfs', async (_req, res) => {
    try {
        console.log('[API] Fetching PDF list...');
        let files: any[] = [];
        try {
            if (mongoose.connection.readyState !== 0) {
                files = await PDF.find({}, 'fileName displayName size uploadedAt').maxTimeMS(2000);
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching PDF list.');
        }

        const formattedFiles = files.map((file: any) => ({
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

        form.parse(req, async (err: any, _fields: any, files: any) => {
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

// Map /api/sitedata/save to the generic handler's logic conceptually, 
// but we'll add a generic one for any file in data/

/**
 * GENERIC DATA STORAGE ENDPOINTS
 * Allows saving/loading any JSON file from the data/ folder
 */

// Helper to get tenant-specific file path
const getDataFilePath = (filename: string, req: express.Request) => {
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId;
    console.log(`[Data] Resolving path for ${filename}. Tenant Context: ${tenantId || 'GLOBAL/NULL'}`);

    if (tenantId && (filename === 'sitedata')) {
        const tenantPath = path.join(process.cwd(), 'data', `${filename}-${tenantId}.json`);
        console.log(`[Data] Using tenant-specific file: ${path.basename(tenantPath)}`);
        return tenantPath;
    }

    const defaultPath = path.join(process.cwd(), 'data', `${filename}.json`);
    console.log(`[Data] Falling back to global file: ${path.basename(defaultPath)}`);
    return defaultPath;
};

app.get('/api/data/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = getDataFilePath(filename, req);

        if (!fs.existsSync(filePath)) {
            // Return empty object for new files
            return res.json({});
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (err: any) {
        res.status(500).json({ error: String(err) });
    }
});

app.post('/api/data/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const body = req.body;
        const tenantId = req.headers['x-tenant-id'] as string || body.tenantId;

        if (filename === 'sitedata') {
            if (!tenantId) return res.status(400).json({ status: 'error', message: 'Tenant ID required for sitedata' });

            let currentData = await SiteData.findOne({ tenantId });
            if (!currentData) {
                currentData = new SiteData({ tenantId, sections: {} });
            }

            if (body.sectionKey && body.sectionData) {
                // Partial update for specific section
                if (!currentData.sections) currentData.sections = {};
                currentData.sections[body.sectionKey] = body.sectionData;
                currentData.markModified('sections');
            } else {
                // Full store update
                currentData.sections = body.sections || body.data?.sections || {};
                currentData.markModified('sections');
            }

            currentData.lastUpdated = Date.now();
            await currentData.save();
            console.log(`[SiteData] Saved to MongoDB for tenant: ${tenantId}`);
            return res.json({ success: true, status: 'success' });
        }

        // Fallback for other files (non-sitedata) via filesystem if possible
        const filePath = getDataFilePath(filename, req);
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(body.data || body, null, 2), 'utf-8');
        res.json({ success: true, status: 'success' });
    } catch (err: any) {
        console.error('[Data] Save error:', err);
        res.status(500).json({ status: 'error', message: String(err) });
    }
});

// Alias for existing sitedata save
app.post('/api/sitedata/save', subscriptionGuard, async (req, res) => {
    // Redirect to the generic logic
    req.params.filename = 'sitedata';
    return (app as any)._router.handle(req, res, () => { });
});

// Load site data from sitedata.json
app.get('/api/sitedata/load', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] as string;
        if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID required' });

        let data = null;
        try {
            if (mongoose.connection.readyState !== 0) {
                data = await SiteData.findOne({ tenantId }).lean().maxTimeMS(2000);
            }
        } catch (dbErr) {
            console.warn('[SiteData] Database error loading sitedata.');
        }

        if (!data) {
            return res.json({ success: true, data: { lastUpdated: null, sections: {} } });
        }

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('[SiteData] Load error:', err);
        res.status(500).json({ success: false, error: String(err) });
    }
});

// Get AI-friendly summary of site data
app.get('/api/sitedata/summary', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] as string;
        if (!tenantId) return res.status(400).json({ success: false, error: 'Tenant ID required' });

        const data = await SiteData.findOne({ tenantId }).lean();
        if (!data) {
            return res.json({ success: true, summary: 'No site data available.' });
        }

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


// ─── Helpers for sitedata-based real data ────────────────────────────────────

/**
 * Returns the list of tenantIds that have a sitedata entry in MongoDB.
 */
async function getSitedataTenantIds(): Promise<string[]> {
    const ids = new Set<string>();
    try {
        if (mongoose.connection.readyState !== 0) {
            const tenants = await SiteData.find().select('tenantId').lean() as any[];
            tenants.forEach(t => ids.add(t.tenantId));
        }
    } catch {}
    
    // Fallback/Supplement from filesystem
    try {
        const files = fs.readdirSync(path.join(__dirname, '../data'));
        files.forEach(f => {
            const match = f.match(/^sitedata-(.+)\.json$/);
            if (match) ids.add(match[1]);
        });
    } catch {}
    
    return Array.from(ids);
}

/**
 * Read and parse a per-tenant sitedata from MongoDB.
 */
async function readSitedata(tenantId: string): Promise<any | null> {
    try {
        // Try DB first
        if (mongoose.connection.readyState !== 0) {
            const data = await SiteData.findOne({ tenantId }).lean();
            if (data) return data;
        }
    } catch {}

    // Fallback to Filesystem
    try {
        const filePath = path.join(__dirname, `../data/sitedata-${tenantId}.json`);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return { tenantId, sections: JSON.parse(content).sections || {} };
        }
        // Generic fallback
        const genericPath = path.join(__dirname, '../data/sitedata.json');
        if (fs.existsSync(genericPath)) {
            const content = fs.readFileSync(genericPath, 'utf-8');
            return { tenantId, sections: JSON.parse(content).sections || {} };
        }
    } catch {}
    
    return null;
}

// Human-readable label map for sitedata section keys
const SECTION_LABELS: Record<string, { title: string; type: string }> = {
    entraUsers: { title: 'Entra ID Users Snapshot', type: 'activity' },
    overview: { title: 'Environment Overview Report', type: 'usage' },
    birdsEye: { title: "Bird's Eye M365 Snapshot", type: 'usage' },
    alerts: { title: 'Security & Operational Alerts', type: 'security' },
    intune: { title: 'Intune Device Management Report', type: 'compliance' },
    devices: { title: 'Device Inventory Report', type: 'compliance' },
    licenses: { title: 'License Utilization Report', type: 'usage' },
    secureScore: { title: 'Secure Score Audit', type: 'security' },
    signInLogs: { title: 'Sign-In Activity Log', type: 'audit' },
    conditionalAccess: { title: 'Conditional Access Policy Report', type: 'security' },
    governance: { title: 'Governance & Compliance Report', type: 'compliance' },
    sharepoint: { title: 'SharePoint Sites Snapshot', type: 'activity' },
    teams: { title: 'Teams Collaboration Report', type: 'activity' },
    mailboxUsage: { title: 'Mailbox & Email Usage Report', type: 'usage' },
    emailActivity: { title: 'Email Activity Trend Report', type: 'usage' },
    userActivity: { title: 'User Activity Summary', type: 'audit' },
    security: { title: 'Security Posture Report', type: 'security' },
    purview: { title: 'Purview Data Governance Report', type: 'compliance' },
};

/**
 * Build synthetic report entries from a tenant's sitedata file sections.
 */
function buildReportsFromSitedata(tenantId: string, sitedata: any): any[] {
    const sections = sitedata?.sections || {};
    const lastUpdated = sitedata?.lastUpdated || Date.now();

    return Object.entries(sections).map(([key, section]: [string, any]) => {
        const label = SECTION_LABELS[key] || { title: `${key.charAt(0).toUpperCase() + key.slice(1)} Report`, type: 'other' };
        const sectionUpdated = section?.lastUpdated || section?.timestamp || lastUpdated;
        return {
            _id: `${tenantId}-${key}`,
            tenantId,
            title: label.title,
            type: label.type,
            createdAt: new Date(sectionUpdated),
            _source: 'sitedata'
        };
    });
}

/**
 * Determine alert severity from a Graph-style alert object.
 */
function mapGraphSeverity(severity: string | undefined): 'high' | 'medium' | 'low' {
    const s = (severity || '').toLowerCase();
    if (s === 'high' || s === 'critical' || s === 'error') return 'high';
    if (s === 'medium' || s === 'warning' || s === 'informational') return 'medium';
    return 'low';
}

/**
 * Build synthetic alert entries from a tenant's sitedata alerts section.
 */
function buildAlertsFromSitedata(tenantId: string, sitedata: any): any[] {
    const sections = sitedata?.sections || {};
    const lastUpdated = sitedata?.lastUpdated || Date.now();
    const results: any[] = [];

    // Primary: dedicated alerts section
    const alertsSection = sections.alerts?.data;
    if (Array.isArray(alertsSection)) {
        alertsSection.forEach((a: any) => {
            results.push({
                _id: a.id || `${tenantId}-alert-${results.length}`,
                tenantId,
                message: a.message || a.title || a.description || 'Security alert detected',
                severity: mapGraphSeverity(a.severity),
                isActive: a.status !== 'resolved' && a.status !== 'dismissed',
                timestamp: new Date(a.lastModifiedDateTime || a.createdDateTime || a.eventDateTime || lastUpdated),
                _source: 'sitedata-alerts'
            });
        });
    }

    // Secondary: security section
    const secSection = sections.security?.data;
    if (secSection) {
        const secAlerts = secSection.alerts || secSection.incidents || [];
        if (Array.isArray(secAlerts)) {
            secAlerts.forEach((a: any) => {
                results.push({
                    _id: a.id || `${tenantId}-sec-${results.length}`,
                    tenantId,
                    message: a.title || a.description || a.displayName || 'Security incident detected',
                    severity: mapGraphSeverity(a.severity),
                    isActive: a.status !== 'resolved',
                    timestamp: new Date(a.createdDateTime || a.lastModifiedDateTime || lastUpdated),
                    _source: 'sitedata-security'
                });
            });
        }
    }

    return results;
}

/**
 * Multi-Tenant Reports API
 * GET /api/admin/reports?tenantId=&page=&limit=&startDate=&endDate=
 *
 * Sources data from per-tenant sitedata JSON files (real cached data).
 * Falls back to the Report MongoDB collection for any additional records.
 */
app.get('/api/admin/reports', async (req, res) => {
    try {
        const { tenantId, page = '1', limit = '20', startDate, endDate } = req.query;
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

        // Determine which tenants to include
        let allTenantIds: string[] = [];
        try {
            if (mongoose.connection.readyState !== 0) {
                allTenantIds = await getSitedataTenantIds();
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching tenant IDs for reports.');
        }
        const targetTenants = tenantId ? [tenantId as string] : allTenantIds;

        // Aggregate reports from all target tenant sitedata entries
        let allReports: any[] = [];
        for (const tid of targetTenants) {
            try {
                const sitedata = await readSitedata(tid);
                if (sitedata) {
                    const tenantReports = buildReportsFromSitedata(tid, sitedata);
                    allReports.push(...tenantReports);
                }
            } catch (err) {
                console.warn(`[API] Error reading sitedata for tenant ${tid}`);
            }
        }

        // Also pull from MongoDB Report model (any records inserted via other means)
        try {
            const mongoQuery: any = {};
            if (tenantId) mongoQuery.tenantId = tenantId;
            const mongoReports = await Report.find(mongoQuery).lean().select('tenantId title type createdAt');
            allReports.push(...mongoReports);
        } catch { /* Mongo may not have records; sitedata is primary */ }

        // Apply date range filter
        const start = startDate ? new Date(startDate as string) : null;
        const end = endDate ? new Date((endDate as string) + 'T23:59:59') : null;
        if (start || end) {
            allReports = allReports.filter(r => {
                const d = new Date(r.createdAt);
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            });
        }

        // Sort newest-first
        allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const total = allReports.length;
        const paginated = allReports.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        console.log(`[API] /admin/reports → ${total} reports from ${targetTenants.length} tenant(s) (sitedata)`);
        res.json({ reports: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
    } catch (err: any) {
        console.error('[API] /admin/reports error:', err);
        res.status(500).json({ error: String(err) });
    }
});

/**
 * Multi-Tenant Alerts API
 * GET /api/admin/alerts?tenantId=&severity=&onlyActive=&page=&limit=
 *
 * Sources data from per-tenant sitedata JSON files (real cached Graph data).
 * Falls back to the Alert MongoDB collection for any additional records.
 */
app.get('/api/admin/alerts', async (req, res) => {
    try {
        const { tenantId, severity, onlyActive, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10)));

        // Determine which tenants to include
        let allTenantIds: string[] = [];
        try {
            if (mongoose.connection.readyState !== 0) {
                allTenantIds = await getSitedataTenantIds();
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching tenant IDs for alerts.');
        }
        const targetTenants = tenantId ? [tenantId as string] : allTenantIds;

        // Aggregate alerts from all target tenant sitedata entries
        let allAlerts: any[] = [];
        for (const tid of targetTenants) {
            try {
                const sitedata = await readSitedata(tid);
                if (sitedata) {
                    const tenantAlerts = buildAlertsFromSitedata(tid, sitedata);
                    allAlerts.push(...tenantAlerts);
                }
            } catch (err) {
                console.warn(`[API] Error reading sitedata for alerts for tenant ${tid}`);
            }
        }

        // Also pull from MongoDB Alert model
        try {
            const mongoQuery: any = {};
            if (tenantId) mongoQuery.tenantId = tenantId;
            if (severity) mongoQuery.severity = severity;
            if (onlyActive === 'true') mongoQuery.isActive = true;
            const mongoAlerts = await Alert.find(mongoQuery).lean().select('tenantId message severity isActive timestamp');
            allAlerts.push(...mongoAlerts);
        } catch { /* Mongo may not have records; sitedata is primary */ }

        // Apply severity filter
        if (severity) {
            allAlerts = allAlerts.filter(a => a.severity === severity);
        }

        // Apply onlyActive filter
        if (onlyActive === 'true') {
            allAlerts = allAlerts.filter(a => a.isActive);
        }

        // Sort by timestamp descending (latest first)
        allAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const total = allAlerts.length;
        const paginated = allAlerts.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        console.log(`[API] /admin/alerts → ${total} alerts from ${targetTenants.length} tenant(s) (sitedata)`);
        res.json({ alerts: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
    } catch (err: any) {
        console.error('[API] /admin/alerts error:', err);
        res.status(500).json({ error: String(err) });
    }
});




/**
 * Dashboard Summary Stats
 * GET /api/admin/dashboard-stats?tenantId=
 * Returns aggregate KPI counts for the summary cards.
 */
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const { tenantId } = req.query;
        let allTenantIds: string[] = [];
        try {
            if (mongoose.connection.readyState !== 0) {
                const registeredTenants = await Tenant.find({}).select('tenantId').lean() as any[];
                allTenantIds = registeredTenants.map(t => t.tenantId);
            }
        } catch (dbErr) {
            console.warn('[API] Database error fetching tenant IDs for dashboard-stats.');
        }

        // If no tenants in DB, fallback to what SiteData find thinks (to keep dashboard alive)
        if (allTenantIds.length === 0) {
            allTenantIds = await getSitedataTenantIds();
        }

        const targetTenants = tenantId ? [tenantId as string] : allTenantIds;

        let totalReports = 0;
        let totalAlerts = 0;
        let activeAlerts = 0;
        let highAlerts = 0;
        let totalUsers = 0;
        let totalLicenses = 0;
        let assignedLicenses = 0;
        let mfaRegistered = 0;
        let mfaTotal = 0;
        const affectedTenantSet = new Set<string>();
        const reportsByType: Record<string, number> = {};
        const reportsByTenant: Record<string, number> = {};
        const alertsBySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
        const licenseStatsByTenant: Record<string, any> = {};

        for (const tid of targetTenants) {
            const sitedata = await readSitedata(tid);
            if (!sitedata) continue;

            const reports = buildReportsFromSitedata(tid, sitedata);
            const alerts = buildAlertsFromSitedata(tid, sitedata);

            if (reports.length > 0 || alerts.length > 0) {
                affectedTenantSet.add(tid);
            }

            totalReports += reports.length;
            reports.forEach(r => {
                reportsByType[r.type] = (reportsByType[r.type] || 0) + 1;
                reportsByTenant[tid] = (reportsByTenant[tid] || 0) + 1;
            });

            totalAlerts += alerts.length;
            alerts.forEach(a => {
                if (a.isActive) activeAlerts++;
                const sev = a.severity as string;
                alertsBySeverity[sev] = (alertsBySeverity[sev] || 0) + 1;
                if (sev === 'high') highAlerts++;
            });

            // Aggregate metrics from sections
            const sections = sitedata.sections || {};
            const overview = sections.overview?.data?.quickStats || {};
            const birdsEye = sections.birdsEye?.data || {};

            totalUsers += overview.totalUsers || birdsEye.entra?.users || 0;
            const tLic = (overview.totalLicenses || birdsEye.licenses?.purchased || 0);
            console.log(`[Stats] Tenant ${tid} - Users: ${overview.totalUsers}/${birdsEye.entra?.users}, Licenses: ${overview.totalLicenses}/${birdsEye.licenses?.purchased} (Using: ${tLic})`);
            totalLicenses += tLic;
            assignedLicenses += birdsEye.licenses?.assigned || overview.assignedLicenses || 0;
            mfaRegistered += overview.mfaRegistered || 0;
            mfaTotal += overview.mfaTotal || birdsEye.entra?.users || overview.totalUsers || 0;

            licenseStatsByTenant[tid] = {
                total: overview.totalLicenses || birdsEye.licenses?.purchased || 0,
                assigned: birdsEye.licenses?.assigned || overview.assignedLicenses || 0,
                topSkus: birdsEye.licenses?.topSkus || []
            };
        }

        res.json({
            totalReports,
            totalAlerts,
            activeAlerts,
            highAlerts,
            totalUsers,
            totalLicenses,
            assignedLicenses,
            mfaRegistered,
            mfaTotal,
            affectedTenants: affectedTenantSet.size,
            reportsByType,
            reportsByTenant,
            alertsBySeverity,
            licenseStatsByTenant
        });
    } catch (err: any) {
        console.error('[API] /admin/dashboard-stats error:', err);
        res.status(500).json({ error: String(err) });
    }
});

import { generateTenantReport } from './tenantReport';

/**
 * Tenant Report Download API
 * GET /api/admin/tenant-report/download?tenantId=
 * Requires standard Bearer token in Authorization header.
 */
// ── Admin: Tenant Report Download (Word DOCX) ──
app.get('/api/admin/tenant-report/download', async (req, res) => {
    try {
        const tenantId = req.query.tenantId as string;
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).send("No authorization header");
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.error('[API] Authorization header format invalid (expected Bearer <token>)');
            return res.status(401).send("Invalid authorization format");
        }

        if (!tenantId) {
            return res.status(400).send("tenantId query parameter is required");
        }

        // Using DOCX Generator
        const { generateDocxReport } = await import('./docxReport');
        console.log(`[API] Triggering generateDocxReport for tenant: ${tenantId}`);
        const buffer = await generateDocxReport(token, tenantId);
        console.log(`[API] Report generated successfully (${buffer.length} bytes)`);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="Tenant_Summary_${tenantId}.docx"`);
        res.send(buffer);
    } catch (error: any) {
        console.error('❌ Error generating DOCX tenant report:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : 'No stack trace';
        console.error(`[API] Trace: ${stack}`);
        res.status(500).send(errorMsg || 'Internal Server Error');
    }
});

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
