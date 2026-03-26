/**
 * tenantReport.ts
 * Server-side Microsoft Graph API fetcher + exceljs workbook builder.
 * Uses a delegated access token passed from the frontend (MSAL).
 */

import ExcelJS from 'exceljs';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA = 'https://graph.microsoft.com/beta';

// ─── Low-level Graph fetch helpers ───────────────────────────────────────────

async function graphGet(token: string, url: string): Promise<any> {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw Object.assign(new Error(err), { status: res.status });
    }
    return res.json();
}

/**
 * Fetch all pages of a Graph collection endpoint, following @odata.nextLink.
 */
async function graphGetAll(token: string, url: string, maxItems = 2000): Promise<any[]> {
    const results: any[] = [];
    let nextUrl: string | null = url;
    while (nextUrl && results.length < maxItems) {
        const page = await graphGet(token, nextUrl);
        const items: any[] = page.value || [];
        results.push(...items);
        nextUrl = page['@odata.nextLink'] || null;
    }
    return results;
}

/** Safe wrapper — returns empty array on any error, logs a warning. */
async function safeGetAll(token: string, url: string, label: string, max = 1000): Promise<any[]> {
    try {
        return await graphGetAll(token, url, max);
    } catch (e: any) {
        const msg = e?.status ? `HTTP ${e.status}` : e?.message;
        console.warn(`[TenantReport] ${label} skipped: ${msg}`);
        return [];
    }
}

/** Safe single-object fetch. */
async function safeGet(token: string, url: string, label: string): Promise<any | null> {
    try {
        return await graphGet(token, url);
    } catch (e: any) {
        console.warn(`[TenantReport] ${label} skipped: ${e?.status || e?.message}`);
        return null;
    }
}

// ─── Sheet builders ──────────────────────────────────────────────────────────

function styleHeader(sheet: ExcelJS.Worksheet, columns: { header: string; key: string; width?: number }[]) {
    sheet.columns = columns.map(c => ({ ...c, width: c.width ?? 22 }));
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
    });
    headerRow.height = 28;
    // Zebra rows via conditional iteration later (rows added via addRow)
}

function alternateRow(sheet: ExcelJS.Worksheet, rowIndex: number) {
    if (rowIndex % 2 === 0) {
        sheet.getRow(rowIndex).eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F8' } };
        });
    }
}

async function buildUsersSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'Display Name', key: 'displayName', width: 28 },
        { header: 'UPN / Email', key: 'userPrincipalName', width: 36 },
        { header: 'Type', key: 'userType', width: 12 },
        { header: 'Enabled', key: 'accountEnabled', width: 12 },
        { header: 'Job Title', key: 'jobTitle', width: 24 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'Country', key: 'country', width: 16 },
        { header: 'Licenses', key: 'licenses', width: 10 },
        { header: 'Created', key: 'createdDateTime', width: 22 },
        { header: 'Last Sign-In', key: 'signInActivity', width: 22 },
    ]);

    const users = await safeGetAll(token,
        `${GRAPH_BASE}/users?$select=id,displayName,userPrincipalName,userType,accountEnabled,jobTitle,department,city,country,assignedLicenses,createdDateTime,signInActivity&$top=999`,
        'Users');

    users.forEach((u, i) => {
        const row = sheet.addRow({
            displayName: u.displayName ?? '',
            userPrincipalName: u.userPrincipalName ?? '',
            userType: u.userType ?? 'Member',
            accountEnabled: u.accountEnabled ? 'Yes' : 'No',
            jobTitle: u.jobTitle ?? '',
            department: u.department ?? '',
            city: u.city ?? '',
            country: u.country ?? '',
            licenses: (u.assignedLicenses?.length ?? 0),
            createdDateTime: u.createdDateTime ? new Date(u.createdDateTime).toLocaleDateString() : '',
            signInActivity: u.signInActivity?.lastSignInDateTime
                ? new Date(u.signInActivity.lastSignInDateTime).toLocaleDateString()
                : 'N/A',
        });
        alternateRow(sheet, row.number);
    });
    return users.length;
}

async function buildSecuritySheet(token: string, sheet: ExcelJS.Worksheet) {
    // Sub-section 1: Security Alerts
    styleHeader(sheet, [
        { header: 'Source', key: 'source', width: 14 },
        { header: 'Title / Message', key: 'title', width: 50 },
        { header: 'Severity', key: 'severity', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Created', key: 'createdDateTime', width: 22 },
        { header: 'User / Resource', key: 'userAccount', width: 30 },
    ]);

    const alerts = await safeGetAll(token,
        `${GRAPH_BASE}/security/alerts?$top=200&$orderby=createdDateTime desc`,
        'Security Alerts');

    const riskyUsers = await safeGetAll(token,
        `${GRAPH_BASE}/identityProtection/riskyUsers?$filter=riskState eq 'atRisk'&$top=200`,
        'Risky Users');

    let mfaDetails: any[] = [];
    try {
        const mfaRes = await graphGet(token,
            `${GRAPH_BETA}/reports/authenticationMethods/userRegistrationDetails?$top=999`);
        mfaDetails = mfaRes.value || [];
    } catch { /* permission may be missing */ }

    // Add alerts
    sheet.addRow({}).font = { bold: true, color: { argb: 'FF1A3C6E' } };
    const alertHeader = sheet.addRow({ source: '── Security Alerts ──' });
    alertHeader.font = { bold: true, italic: true };

    alerts.forEach((a, i) => {
        const row = sheet.addRow({
            source: 'Alert',
            title: a.title ?? a.description ?? '',
            severity: a.severity ?? '',
            status: a.status ?? '',
            category: a.category ?? '',
            createdDateTime: a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString() : '',
            userAccount: a.userStates?.[0]?.userPrincipalName ?? a.hostStates?.[0]?.fqdn ?? '',
        });
        if (a.severity === 'high') {
            row.eachCell(c => { c.font = { color: { argb: 'FFCC0000' }, bold: true }; });
        }
        alternateRow(sheet, row.number);
    });

    // Add risky users sub-table
    const riskyHeader = sheet.addRow({ source: '── Risky Users ──' });
    riskyHeader.font = { bold: true, italic: true };
    riskyUsers.forEach(u => {
        const row = sheet.addRow({
            source: 'Risky User',
            title: u.userDisplayName ?? u.userPrincipalName ?? '',
            severity: u.riskLevel ?? '',
            status: u.riskState ?? '',
            category: u.riskDetail ?? '',
            createdDateTime: '',
            userAccount: u.userPrincipalName ?? '',
        });
        row.getCell('severity').font = { color: { argb: 'FFCC0000' }, bold: true };
    });

    // Add MFA sub-table
    const mfaHeader = sheet.addRow({ source: '── MFA Registration ──' });
    mfaHeader.font = { bold: true, italic: true };
    const mfaEnabled = mfaDetails.filter(u => u.isMfaRegistered).length;
    const mfaDisabled = mfaDetails.filter(u => !u.isMfaRegistered).length;
    sheet.addRow({ source: 'MFA', title: 'MFA Registered Users', severity: String(mfaEnabled) });
    sheet.addRow({ source: 'MFA', title: 'MFA Not Registered', severity: String(mfaDisabled), status: mfaDisabled > 0 ? 'Action Required' : 'OK' });

    return alerts.length + riskyUsers.length;
}

async function buildSecureScoreSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'Control', key: 'title', width: 45 },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Score Earned', key: 'scoreEarned', width: 16 },
        { header: 'Max Score', key: 'maxScore', width: 16 },
        { header: '% Complete', key: 'pct', width: 14 },
        { header: 'Action Type', key: 'actionType', width: 18 },
        { header: 'Service', key: 'service', width: 18 },
        { header: 'Remediation?', key: 'actionUrl', width: 14 },
    ]);

    // Get current score
    const scoreRes = await safeGet(token,
        `${GRAPH_BASE}/security/secureScores?$top=1&$select=currentScore,maxScore,createdDateTime,controlScores&$orderby=createdDateTime desc`,
        'Secure Score');
    const scoreData = scoreRes?.value?.[0];

    // Get control profiles for details
    const profiles = await safeGetAll(token,
        `${GRAPH_BASE}/security/secureScoreControlProfiles?$top=200&$select=id,title,maxScore,actionType,service,controlCategory,actionUrl`,
        'Secure Score Profiles');

    const profileMap: Record<string, any> = {};
    profiles.forEach(p => { profileMap[p.id] = p; });

    const controls: any[] = scoreData?.controlScores || [];
    controls.forEach((c, i) => {
        const p = profileMap[c.controlName] || {};
        const pct = c.maxScore > 0 ? ((c.score / c.maxScore) * 100).toFixed(0) + '%' : 'N/A';
        const row = sheet.addRow({
            title: p.title || c.controlName || '',
            category: p.controlCategory || '',
            scoreEarned: c.score ?? 0,
            maxScore: c.maxScore ?? 0,
            pct,
            actionType: p.actionType || '',
            service: p.service || '',
            actionUrl: p.actionUrl ? 'Yes' : '',
        });
        if (c.score === 0 && c.maxScore > 0) {
            row.getCell('pct').font = { color: { argb: 'FFCC0000' } };
        }
        alternateRow(sheet, row.number);
    });

    // Add summary row at top (insert after headers)
    if (scoreData) {
        const summaryRow = sheet.insertRow(2, {
            title: `Current Score: ${scoreData.currentScore} / ${scoreData.maxScore}`,
            pct: scoreData.maxScore > 0
                ? ((scoreData.currentScore / scoreData.maxScore) * 100).toFixed(1) + '%'
                : 'N/A'
        });
        summaryRow.font = { bold: true, size: 12 };
        summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    }

    return controls.length;
}

async function buildDevicesSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'Device Name', key: 'deviceName', width: 28 },
        { header: 'OS', key: 'operatingSystem', width: 18 },
        { header: 'OS Version', key: 'osVersion', width: 16 },
        { header: 'Owner Type', key: 'managedDeviceOwnerType', width: 16 },
        { header: 'Compliance', key: 'complianceState', width: 16 },
        { header: 'Enrolled', key: 'enrolledDateTime', width: 22 },
        { header: 'Last Check-In', key: 'lastSyncDateTime', width: 22 },
        { header: 'User', key: 'userDisplayName', width: 28 },
        { header: 'Serial Number', key: 'serialNumber', width: 22 },
        { header: 'Manufacturer', key: 'manufacturer', width: 18 },
        { header: 'Model', key: 'model', width: 20 },
    ]);

    const devices = await safeGetAll(token,
        `${GRAPH_BASE}/deviceManagement/managedDevices?$select=deviceName,operatingSystem,osVersion,managedDeviceOwnerType,complianceState,enrolledDateTime,lastSyncDateTime,userDisplayName,serialNumber,manufacturer,model&$top=999`,
        'Managed Devices');

    devices.forEach((d, i) => {
        const row = sheet.addRow({
            deviceName: d.deviceName ?? '',
            operatingSystem: d.operatingSystem ?? '',
            osVersion: d.osVersion ?? '',
            managedDeviceOwnerType: d.managedDeviceOwnerType ?? '',
            complianceState: d.complianceState ?? '',
            enrolledDateTime: d.enrolledDateTime ? new Date(d.enrolledDateTime).toLocaleDateString() : '',
            lastSyncDateTime: d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleDateString() : '',
            userDisplayName: d.userDisplayName ?? '',
            serialNumber: d.serialNumber ?? '',
            manufacturer: d.manufacturer ?? '',
            model: d.model ?? '',
        });
        if (d.complianceState === 'noncompliant') {
            row.getCell('complianceState').font = { color: { argb: 'FFCC0000' }, bold: true };
        }
        alternateRow(sheet, row.number);
    });
    return devices.length;
}

async function buildAppsSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'Type', key: 'type', width: 20 },
        { header: 'Display Name', key: 'displayName', width: 36 },
        { header: 'App ID', key: 'appId', width: 38 },
        { header: 'Created', key: 'createdDateTime', width: 22 },
        { header: 'Sign-In Audience', key: 'signInAudience', width: 26 },
        { header: 'Publisher', key: 'publisher', width: 28 },
        { header: 'SP Type', key: 'spType', width: 18 },
    ]);

    const [apps, sps] = await Promise.all([
        safeGetAll(token,
            `${GRAPH_BASE}/applications?$select=id,appId,displayName,createdDateTime,signInAudience,publisherDomain&$top=200`,
            'App Registrations'),
        safeGetAll(token,
            `${GRAPH_BASE}/servicePrincipals?$select=id,appId,displayName,createdDateTime,servicePrincipalType,appOwnerOrganizationId&$top=200`,
            'Service Principals'),
    ]);

    apps.forEach((a, i) => {
        const row = sheet.addRow({
            type: 'App Registration',
            displayName: a.displayName ?? '',
            appId: a.appId ?? '',
            createdDateTime: a.createdDateTime ? new Date(a.createdDateTime).toLocaleDateString() : '',
            signInAudience: a.signInAudience ?? '',
            publisher: a.publisherDomain ?? '',
            spType: '',
        });
        alternateRow(sheet, row.number);
    });

    const sep = sheet.addRow({ type: '── Enterprise Apps ──' });
    sep.font = { bold: true, italic: true };

    sps.forEach((s, i) => {
        const row = sheet.addRow({
            type: 'Enterprise App',
            displayName: s.displayName ?? '',
            appId: s.appId ?? '',
            createdDateTime: s.createdDateTime ? new Date(s.createdDateTime).toLocaleDateString() : '',
            signInAudience: '',
            publisher: s.appOwnerOrganizationId ?? '',
            spType: s.servicePrincipalType ?? '',
        });
        alternateRow(sheet, row.number);
    });

    return apps.length + sps.length;
}

async function buildUsageSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'SKU / Service', key: 'name', width: 38 },
        { header: 'Total', key: 'total', width: 12 },
        { header: 'Consumed', key: 'consumed', width: 14 },
        { header: 'Available', key: 'available', width: 14 },
        { header: 'Status', key: 'status', width: 18 },
    ]);

    // Licenses
    const skus = await safeGetAll(token,
        `${GRAPH_BASE}/subscribedSkus?$select=skuPartNumber,prepaidUnits,consumedUnits,capabilityStatus`,
        'Subscribed SKUs');

    skus.forEach((s, i) => {
        const total = s.prepaidUnits?.enabled ?? 0;
        const consumed = s.consumedUnits ?? 0;
        const available = total - consumed;
        const row = sheet.addRow({
            name: s.skuPartNumber ?? '',
            total,
            consumed,
            available,
            status: s.capabilityStatus ?? '',
        });
        if (available < 0) {
            row.getCell('available').font = { color: { argb: 'FFCC0000' }, bold: true };
        }
        alternateRow(sheet, row.number);
    });

    // Active Users report (beta endpoint, JSON format)
    const sep = sheet.addRow({ name: '── M365 Active Users (Last 7 Days) ──' });
    sep.font = { bold: true, italic: true };

    type ActiveUserRow = { name: string; total?: number | string; consumed?: number | string; available?: number | string; status?: string };
    try {
        const auRes = await graphGet(token,
            `${GRAPH_BETA}/reports/getOffice365ActiveUserCounts(period='D7')?$format=application/json`);
        const auData: any[] = auRes.value || [];
        const latest = auData[auData.length - 1];
        if (latest) {
            const entries: [string, any][] = [
                ['Exchange', latest.exchange],
                ['SharePoint', latest.sharePoint],
                ['OneDrive', latest.oneDrive],
                ['Teams', latest.teams],
                ['Outlook', latest.outlook],
                ['Microsoft365', latest.microsoft365],
            ];
            entries.forEach(([svc, val]) => {
                if (val !== undefined && val !== null) {
                    const r = sheet.addRow({ name: svc + ' Active Users', total: val } as ActiveUserRow);
                    alternateRow(sheet, r.number);
                }
            });
        }
    } catch { /* usage reports may need Reports.Read permission */ }

    return skus.length;
}

async function buildAuditSheet(token: string, sheet: ExcelJS.Worksheet) {
    styleHeader(sheet, [
        { header: 'Log Type', key: 'logType', width: 16 },
        { header: 'Activity / Operation', key: 'activity', width: 40 },
        { header: 'Result', key: 'result', width: 14 },
        { header: 'Initiated By', key: 'initiatedBy', width: 30 },
        { header: 'Target Resource', key: 'target', width: 36 },
        { header: 'Date/Time', key: 'dateTime', width: 24 },
        { header: 'Error Code', key: 'errorCode', width: 14 },
    ]);

    const [dirAudits, signIns] = await Promise.all([
        safeGetAll(token,
            `${GRAPH_BASE}/auditLogs/directoryAudits?$top=200&$orderby=activityDateTime desc&$select=activityDisplayName,result,activityDateTime,initiatedBy,targetResources`,
            'Directory Audits'),
        safeGetAll(token,
            `${GRAPH_BASE}/auditLogs/signIns?$top=200&$orderby=createdDateTime desc&$select=userDisplayName,userPrincipalName,status,createdDateTime,appDisplayName,ipAddress,location`,
            'Sign-In Logs'),
    ]);

    dirAudits.forEach(a => {
        const row = sheet.addRow({
            logType: 'Directory Audit',
            activity: a.activityDisplayName ?? '',
            result: a.result ?? '',
            initiatedBy: a.initiatedBy?.user?.userPrincipalName || a.initiatedBy?.app?.displayName || '',
            target: a.targetResources?.[0]?.displayName ?? '',
            dateTime: a.activityDateTime ? new Date(a.activityDateTime).toLocaleString() : '',
            errorCode: '',
        });
        if (a.result === 'failure') {
            row.getCell('result').font = { color: { argb: 'FFCC0000' }, bold: true };
        }
        alternateRow(sheet, row.number);
    });

    const sep = sheet.addRow({ logType: '── Sign-In Logs ──' });
    sep.font = { bold: true, italic: true };

    signIns.forEach(s => {
        const errorCode = s.status?.errorCode ?? 0;
        const row = sheet.addRow({
            logType: 'Sign-In',
            activity: `${s.userDisplayName || ''} → ${s.appDisplayName || ''}`,
            result: errorCode === 0 ? 'Success' : 'Failure',
            initiatedBy: s.userPrincipalName ?? '',
            target: s.appDisplayName ?? '',
            dateTime: s.createdDateTime ? new Date(s.createdDateTime).toLocaleString() : '',
            errorCode: errorCode !== 0 ? String(errorCode) : '',
        });
        if (errorCode !== 0) {
            row.getCell('result').font = { color: { argb: 'FFCC0000' }, bold: true };
        }
        alternateRow(sheet, row.number);
    });

    return dirAudits.length + signIns.length;
}

// ─── Main workbook builder ────────────────────────────────────────────────────

export async function generateTenantReport(token: string, tenantId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Adminsphere';
    workbook.lastModifiedBy = 'Adminsphere';
    workbook.created = new Date();

    console.log(`[TenantReport] Starting full report for tenant ${tenantId}...`);

    // Master sheet that will hold everything
    const masterSheet = workbook.addWorksheet('Full Tenant Report', { properties: { tabColor: { argb: 'FF1F3864' } } });
    
    // Set a generous default width for columns in the master sheet
    for (let i = 1; i <= 20; i++) {
        masterSheet.getColumn(i).width = 26;
    }

    masterSheet.addRow(['Adminsphere — Full Tenant Report']).font = { bold: true, size: 18, color: { argb: 'FF1A3C6E' } };
    masterSheet.addRow([`Tenant ID: ${tenantId}`]).font = { bold: true, size: 12 };
    masterSheet.addRow([`Generated: ${new Date().toLocaleString()}`]).font = { italic: true, color: { argb: 'FF555555' } };
    masterSheet.addRow([]);

    // Build each sheet in parallel using temporary sheets
    const [usersSheet, secSheet, scoreSheet, devSheet, appsSheet, usageSheet, auditSheet] = [
        workbook.addWorksheet('temp_users'),
        workbook.addWorksheet('temp_security'),
        workbook.addWorksheet('temp_score'),
        workbook.addWorksheet('temp_devices'),
        workbook.addWorksheet('temp_apps'),
        workbook.addWorksheet('temp_usage'),
        workbook.addWorksheet('temp_audit'),
    ];

    const results = await Promise.allSettled([
        buildUsersSheet(token, usersSheet),
        buildSecuritySheet(token, secSheet),
        buildSecureScoreSheet(token, scoreSheet),
        buildDevicesSheet(token, devSheet),
        buildAppsSheet(token, appsSheet),
        buildUsageSheet(token, usageSheet),
        buildAuditSheet(token, auditSheet),
    ]);

    const counts = results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        console.warn(`[TenantReport] Sheet ${i} error:`, r.reason?.message);
        return 0;
    });

    const sheetsToMerge = [
        { name: 'Users', sheet: usersSheet },
        { name: 'Security', sheet: secSheet },
        { name: 'Secure Score', sheet: scoreSheet },
        { name: 'Devices', sheet: devSheet },
        { name: 'Applications', sheet: appsSheet },
        { name: 'Usage', sheet: usageSheet },
        { name: 'Audit Logs', sheet: auditSheet },
    ];

    // Merge all temporary sheets into the master sheet sequentially
    for (let i = 0; i < sheetsToMerge.length; i++) {
        const { name, sheet } = sheetsToMerge[i];
        const recordCount = counts[i];

        masterSheet.addRow([]);
        const titleRow = masterSheet.addRow([`── ${name} (${recordCount} records) ──`]);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF1F3864' } };
        titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
        masterSheet.addRow([]);

        // Clone every row and its cell styles
        sheet.eachRow({ includeEmpty: true }, (row) => {
            const newRow = masterSheet.addRow([]);
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                newCell.style = cell.style; // Clones font, fill, borders, alignment
            });
            if (row.height) newRow.height = row.height;
        });

        // Delete the temporary sheet
        workbook.removeWorksheet(sheet.id);
    }

    console.log(`[TenantReport] Single-sheet workbook complete. Total sections: ${sheetsToMerge.length}`);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
