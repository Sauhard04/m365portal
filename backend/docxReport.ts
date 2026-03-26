/* eslint-disable */
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import { generateBarChart, generatePieChart, generateProgressBar } from './charts';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA = 'https://graph.microsoft.com/beta';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function graphGet(token: string, url: string): Promise<any> {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
}

async function safeGetCount(token: string, url: string, label: string): Promise<number | string> {
    try {
        const fetchUrl = url.includes('?') ? `${url}&$count=true` : `${url}?$count=true`;
        const res = await fetch(fetchUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                'ConsistencyLevel': 'eventual'
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data['@odata.count'] !== undefined) return data['@odata.count'];
            if (data.value) return data.value.length;
        }

        // Fallback pagination
        let count = 0;
        const idUrl = url.includes('?') ? `${url}&$select=id` : `${url}?$select=id`;
        let nextLink: string | null = idUrl;

        while (nextLink && count < 100000) {
            const pageRes: any = await fetch(nextLink, { headers: { Authorization: `Bearer ${token}` } });
            if (!pageRes.ok) throw new Error(`Fallback fetch failed ${pageRes.status}`);
            const pageData: any = await pageRes.json();
            count += (pageData.value?.length || 0);
            nextLink = pageData['@odata.nextLink'] || null;
        }
        return count;
    } catch (e: any) {
        console.warn(`[docxReport] Failed ${label}: ${e.message}`);
        return 'N/A';
    }
}
// Formatters
const fmt = (val: any) => {
    if (val === 'N/A' || val === undefined || val === null || val === '') return 'Insert original values here';
    if (typeof val === 'number') return val.toLocaleString();
    return val;
};
const pctNum = (part: any, total: any) => {
    if (typeof part !== 'number' || typeof total !== 'number' || total === 0) return null;
    return (part / total) * 100;
};
const fmtPct = (val: number | null) => {
    return val !== null ? val.toFixed(1) + '%' : '';
};

// ─── DOCX Generation Logic ───────────────────────────────────────────────────

export async function generateDocxReport(token: string, tenantId: string): Promise<Buffer> {
    console.log(`[docxReport] Generating Templated Word Document for tenant ${tenantId}...`);

    // Multi-path resolution for the Word template to support both local and cloud deployments
    const possiblePaths = [
        path.resolve(__dirname, 'template.docx'),                  // Case: in the same folder as the JS (bundled or copied)
        path.resolve(process.cwd(), 'backend', 'template.docx'),    // Case: in the source backend folder
        path.resolve(process.cwd(), 'template.docx')               // Case: flattened in the root (some CI/CD)
    ];

    let templatePath = '';
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            templatePath = p;
            break;
        }
    }

    if (!templatePath) {
        console.error(`[DocxReport] ERROR: Template not found. Checked: ${possiblePaths.join(', ')}`);
        throw new Error(`Report template not found. Please ensure backend/template.docx exists in the deployment package.`);
    }

    console.log(`[DocxReport] Using template from: ${templatePath}`);

    // 2. Fetch all data concurrently
    const fetchPromises = [
        safeGetCount(token, `${GRAPH_BASE}/users`, 'Total Users'),
        safeGetCount(token, `${GRAPH_BASE}/users?$filter=userType eq 'Guest'`, 'Guest Users'),
        safeGetCount(token, `${GRAPH_BASE}/users?$filter=accountEnabled eq false`, 'Disabled Users'),

        safeGetCount(token, `${GRAPH_BASE}/groups`, 'Total Groups'),
        safeGetCount(token, `${GRAPH_BASE}/groups?$filter=groupTypes/any(c:c eq 'Unified')`, 'M365 Groups'),
        safeGetCount(token, `${GRAPH_BASE}/groups?$filter=mailEnabled eq false and securityEnabled eq true`, 'Security Groups'),
        safeGetCount(token, `${GRAPH_BASE}/groups?$filter=mailEnabled eq true and securityEnabled eq false`, 'Dist Lists'),
        safeGetCount(token, `${GRAPH_BASE}/groups?$filter=mailEnabled eq true`, 'Mail Enabled Groups'),

        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices`, 'Total Devices'),
        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=complianceState eq 'compliant'`, 'Compliant Devices'),
        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=complianceState eq 'noncompliant'`, 'Non-Compliant Devices'),

        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=operatingSystem eq 'Windows'`, 'Windows Devices'),
        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=operatingSystem eq 'macOS'`, 'Mac Devices'),
        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=operatingSystem eq 'iOS'`, 'iOS Devices'),
        safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=operatingSystem eq 'Android'`, 'Android Devices'),

        safeGetCount(token, `${GRAPH_BASE}/applications`, 'App Registrations'),
        safeGetCount(token, `${GRAPH_BASE}/servicePrincipals`, 'Enterprise Apps'),
        safeGetCount(token, `${GRAPH_BASE}/identityProtection/riskyUsers?$filter=riskState eq 'atRisk'`, 'Risky Users'),

        graphGet(token, `${GRAPH_BASE}/security/secureScores?$top=1`).catch(() => ({ value: [] })),
        graphGet(token, `${GRAPH_BETA}/reports/authenticationMethods/userRegistrationDetails?$top=999`).catch(() => ({ value: [] })),
        graphGet(token, `${GRAPH_BASE}/subscribedSkus`).catch(() => ({ value: [] })),

        graphGet(token, `${GRAPH_BASE}/admin/serviceAnnouncement/issues?$filter=isResolved eq false`).catch(() => ({ value: [] })),
        graphGet(token, `${GRAPH_BETA}/deviceManagement/deviceConfigurations`).catch(() => ({ value: [] })),
        graphGet(token, `${GRAPH_BETA}/deviceManagement/deviceCompliancePolicies`).catch(() => ({ value: [] })),
        graphGet(token, `${GRAPH_BASE}/organization`).catch(() => ({ value: [] }))
    ];

    console.log(`[DocxReport] Starting ${fetchPromises.length} parallel fetches...`);
    const results = await Promise.allSettled(fetchPromises);

    console.log(`[DocxReport] Received ${results.length} results. Validating indices...`);

    // Position-indexed access to be 100% sure of mapping
    const totalUsers = results[0];
    const guestUsers = results[1];
    const disabledUsers = results[2];
    const totalGroups = results[3];
    const m365Groups = results[4];
    const secGroups = results[5];
    const distGroups = results[6];
    const mailEnabledGroups = results[7];
    const totalDevices = results[8];
    const compliantDevices = results[9];
    const nonCompliantDevices = results[10];
    const devWindows = results[11];
    const devMac = results[12];
    const devIos = results[13];
    const devAndroid = results[14];
    const appRegs = results[15];
    const entApps = results[16];
    const riskyUsers = results[17];
    const scoreRes = results[18];
    const mfaRes = results[19];
    const skusRes = results[20];
    const ticketsRes = results[21];
    const configPoliciesRes = results[22];
    const compPoliciesRes = results[23];
    const orgRes = results[24];

    // Log statuses for debugging
    const statuses = results.map((r, i) => `[${i}]: ${r.status}`).join(', ');
    console.log(`[DocxReport] Result Statuses: ${statuses}`);

    // Verify critical results are defined (they should be since the array is fixed-length from allSettled)
    if (!orgRes) {
        console.error('[DocxReport] CRITICAL: orgRes is undefined at index 24. This suggests the results array is shorter than expected.');
        throw new Error('Internal data mapping error in report generator.');
    }

    console.log('[DocxReport] Data fetches complete. Processing results...');

    // 3. Process Values
    let tenantName = 'Tenant Name';
    try {
        if (orgRes.status === 'fulfilled' && orgRes.value?.value && Array.isArray(orgRes.value.value) && orgRes.value.value.length > 0) {
            tenantName = orgRes.value.value[0]?.displayName || tenantName;
        }
    } catch (e) { console.warn('[DocxReport] Org process failed:', e); }
    const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const uCount = totalUsers.status === 'fulfilled' ? totalUsers.value : 0;
    const gCount = guestUsers.status === 'fulfilled' ? guestUsers.value : 0;
    const dCount = disabledUsers.status === 'fulfilled' ? disabledUsers.value : 0;
    const activeU = (typeof uCount === 'number' && typeof dCount === 'number') ? (uCount - dCount) : 0;

    const m365Count = m365Groups.status === 'fulfilled' ? m365Groups.value : '';
    const secCount = secGroups.status === 'fulfilled' ? secGroups.value : '';
    const distCount = distGroups.status === 'fulfilled' ? distGroups.value : '';
    const mailCount = mailEnabledGroups.status === 'fulfilled' ? mailEnabledGroups.value : '';

    const devCount = totalDevices.status === 'fulfilled' ? totalDevices.value : '';
    const compCount = compliantDevices.status === 'fulfilled' ? compliantDevices.value : '';
    const nonCompCount = nonCompliantDevices.status === 'fulfilled' ? nonCompliantDevices.value : '';

    const winC = devWindows.status === 'fulfilled' ? devWindows.value : '';
    const macC = devMac.status === 'fulfilled' ? devMac.value : '';
    const iosC = devIos.status === 'fulfilled' ? devIos.value : '';
    const andC = devAndroid.status === 'fulfilled' ? devAndroid.value : '';

    const appCount = appRegs.status === 'fulfilled' ? appRegs.value : '';
    const entCount = entApps.status === 'fulfilled' ? entApps.value : '';
    const riskCount = riskyUsers.status === 'fulfilled' ? riskyUsers.value : '';

    let mfaReg = 0, mfaNotReg = 0, mfaRate = null;
    if (mfaRes.status === 'fulfilled' && mfaRes.value?.value && Array.isArray(mfaRes.value.value)) {
        mfaReg = mfaRes.value.value.filter((u: any) => u && u.isMfaRegistered).length;
        mfaNotReg = mfaRes.value.value.filter((u: any) => u && !u.isMfaRegistered).length;
        mfaRate = pctNum(mfaReg, mfaReg + mfaNotReg);
    }

    const licenseDetails: any[] = [];
    let totalSkus = 0;
    if (skusRes.status === 'fulfilled' && skusRes.value?.value && Array.isArray(skusRes.value.value)) {
        totalSkus = skusRes.value.value.length;
        skusRes.value.value.forEach((sku: any) => {
            const t = sku.prepaidUnits?.enabled || 0;
            const c = sku.consumedUnits || 0;
            if (t > 0) {
                licenseDetails.push({
                    name: sku.skuPartNumber || 'Unknown SKU',
                    total: fmt(t),
                    assigned: fmt(c),
                    available: fmt(t - c)
                });
            }
        });
    }

    let curScore: number | string = '', maxScore: number | string = '', scoreRate = null;
    try {
        if (scoreRes.status === 'fulfilled' && scoreRes.value?.value && Array.isArray(scoreRes.value.value) && scoreRes.value.value.length > 0) {
            const s = scoreRes.value.value[0];
            if (s) {
                curScore = s.currentScore ?? '';
                maxScore = s.maxScore ?? '';
                if (typeof maxScore === 'number' && maxScore > 0 && typeof curScore === 'number') {
                    scoreRate = pctNum(curScore, maxScore);
                }
            }
        }
    } catch (e) { console.warn('[DocxReport] Score process failed:', e); }

    let tCount = 0;
    if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.value) {
        tCount = ticketsRes.value.value.length;
    }

    const cnfPols: any[] = [];
    if (configPoliciesRes.status === 'fulfilled' && configPoliciesRes.value?.value) {
        configPoliciesRes.value.value.forEach((p: any) => {
            cnfPols.push({
                name: p.displayName || 'Unknown',
                platform: p.platforms || 'Unknown',
                type: 'Configuration',
                status: 'Successful' // Placeholder for individual status
            });
        });
    }

    const cmpPols: any[] = [];
    if (compPoliciesRes.status === 'fulfilled' && compPoliciesRes.value?.value) {
        compPoliciesRes.value.value.forEach((p: any) => {
            cmpPols.push({
                name: p.displayName || 'Unknown',
                platform: p.platforms || 'Unknown',
                status: 'Deployed',
                users: 'All', // Placeholder
                remarks: 'Successful'
            });
        });
    }

    const spStorageTxt = "Insert original values here";
    const odStorageTxt = "Insert original values here";
    const complianceScore = "Insert original values here";
    const adoptionScore = "Insert original values here";
    const teamsUsage = "Insert original values here";

    // Pre-calculate raw numbers for charts
    const num = (v: any) => typeof v === 'number' ? v : parseInt(String(v).replace(/,/g, '')) || 0;

    console.log('[DocxReport] Generating charts...');
    let licenseChartBuf, mfaChartBuf, devChartBuf, scoreChartBuf;
    try {
        const licenseLabels = licenseDetails.length > 0 ? licenseDetails.map(l => l.name) : ['No Data'];
        const licenseData = licenseDetails.length > 0 ? licenseDetails.map(l => num(l.assigned)) : [0];
        licenseChartBuf = await generateBarChart(licenseLabels, licenseData, 'Assigned Licenses Distribution');

        const mfaLabels = ['MFA Enabled', 'MFA Disabled'];
        const mfaData = [num(mfaReg), num(mfaNotReg)];
        mfaChartBuf = await generatePieChart(mfaLabels, mfaData, 'Account MFA Coverage', ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)']);

        const devLabels = ['Windows', 'macOS', 'iOS', 'Android'];
        const devData = [num(winC), num(macC), num(iosC), num(andC)];
        devChartBuf = await generatePieChart(devLabels, devData, 'Managed Devices OS Summary');

        const sCur = num(curScore);
        const sMax = num(maxScore);
        scoreChartBuf = await generateProgressBar(sCur, sMax, 'Microsoft Secure Score');
    } catch (e) {
        console.error('[DocxReport] Chart generation failed:', e);
        // Fallback to empty buffers if possible, or rethrow
        throw new Error(`Chart Generation Failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4. Construct Data Mapping Object for docxtemplater
    const dataMapping = {
        // Meta Branding
        tenantName,
        reportDate,

        // Charts (docxtemplater-image-module-free expects ArrayBuffers or Buffers for {%tags})
        licenseChart: licenseChartBuf,
        mfaChart: mfaChartBuf,
        deviceChart: devChartBuf,
        scoreChart: scoreChartBuf,

        // Identity
        totalUsers: fmt(uCount),
        activeUsers: fmt(activeU),
        guestUsers: fmt(gCount),
        disabledUsers: fmt(dCount),

        // MFA
        mfaEnabled: fmt(mfaReg),
        mfaNotEnabled: fmt(mfaNotReg),
        mfaCoverage: fmtPct(mfaRate),

        // Groups
        m365Groups: fmt(m365Count),
        distLists: fmt(distCount),
        secGroups: fmt(secCount),
        mailEnabled: fmt(mailCount),
        sharedMailboxes: '', // Placeholder

        ticketCount: fmt(tCount),
        spStorageText: spStorageTxt,
        odStorageText: odStorageTxt,

        // Security
        scoreCurrent: fmt(curScore),
        scoreMax: fmt(maxScore),
        scorePct: fmtPct(scoreRate),
        riskyUsers: fmt(riskCount),

        // Devices
        totalDevices: fmt(devCount),
        devicesCompliant: fmt(compCount),
        devicesNonCompliant: fmt(nonCompCount),
        devWindows: fmt(winC),
        devMac: fmt(macC),
        devIos: fmt(iosC),
        devAndroid: fmt(andC),

        // Apps
        appRegs: fmt(appCount),
        entApps: fmt(entCount),

        // Unfetchable / Missing Aggregations
        complianceScore,
        adoptionScore,
        teamsUsage,
        odStorageTxt,
        spStorageTxt,

        // Loops
        licenses: licenseDetails.length > 0 ? licenseDetails : [{ name: '', total: '', assigned: '', available: '' }],
        configPolicies: cnfPols.length > 0 ? cnfPols : [{ name: '', platform: '', type: '', status: '' }],
        compPolicies: cmpPols.length > 0 ? cmpPols : [{ name: '', platform: '', status: '', users: '', remarks: '' }]
    };

    // 5. Load Template and Render
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const imageOptions = {
        centered: false,
        fileType: 'docx',
        getImage: (tagValue: any, tagName: string) => {
            return tagValue; // Return the Buffer generated from canvas
        },
        getSize: (img: any, tagValue: any, tagName: string) => {
            // Provide standardized pixel sizes for the images in the Word doc
            if (tagName === 'scoreChart') return [500, 100];
            if (tagName === 'mfaChart' || tagName === 'deviceChart') return [450, 300];
            return [550, 275]; // default for licenseChart
        }
    };
    const imageModule = new ImageModule(imageOptions);

    let doc;
    try {
        doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            modules: [imageModule],
            nullGetter: () => ""
        });
        doc.render(dataMapping);
    } catch (error: any) {
        if (error.properties && error.properties.errors) {
            console.error("DocxTemplater errors:", JSON.stringify({ errors: error.properties.errors }));
            throw new Error(`Template Error: ${error.properties.errors.map((e: any) => e.message || e.name).join(', ')}`);
        }
        throw error;
    }

    // 6. Generate final DOCX buffer
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    return buf;
}
