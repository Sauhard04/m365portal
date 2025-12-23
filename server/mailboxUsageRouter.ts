import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import Papa from 'papaparse';
import { ConfidentialClientApplication } from '@azure/msal-node';

const router = express.Router();

// Load config from environment variables
const clientId = process.env.AZURE_CLIENT_ID || process.env.VITE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const tenantId = process.env.AZURE_TENANT_ID || process.env.VITE_TENANT_ID;

const msalConfig = {
    auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret,
    },
};

const cca = new ConfidentialClientApplication(msalConfig);

// Helper to get app token
async function getAppToken() {
    const result = await cca.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
    });
    return result.accessToken;
}

// Backend endpoint to fetch and parse mailbox usage CSV
router.get('/mailbox-usage', async (req, res) => {
    try {
        const accessToken = await getAppToken();
        // Step 1: Get CSV download URL
        const url =
            "https://graph.microsoft.com/v1.0/reports/getMailboxUsageDetail(period='D7')";
        const resp = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'text/csv',
            },
        });
        if (!resp.ok) {
            return res.status(resp.status).json({ error: 'Failed to fetch CSV', details: await resp.text() });
        }
        const csv = await resp.text();
        // Step 2: Parse CSV
        const parsed = Papa.parse(csv, { header: true });
        res.json({ success: true, data: parsed.data });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

export default router;
