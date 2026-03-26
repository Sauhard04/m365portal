import PDFDocument from 'pdfkit';

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

async function safeGetCount(token: string, url: string, label: string): Promise<number | 'N/A'> {
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
        console.warn(`[pdfReport] Failed ${label}: ${e.message}`);
        return 'N/A';
    }
}

// Formatters
const fmt = (val: any) => (val === 'N/A' || val === undefined) ? 'No Data / Missing Permissions' : val.toLocaleString();
const pct = (part: any, total: any) => {
    if (typeof part !== 'number' || typeof total !== 'number' || total === 0) return 'N/A';
    return ((part / total) * 100).toFixed(1) + '%';
};
const pctNum = (part: any, total: any) => {
    if (typeof part !== 'number' || typeof total !== 'number' || total === 0) return null;
    return (part / total) * 100;
};

const getHealth = (value: number | null, isHigherBetter = true) => {
    if (value === null) return { text: '', color: '#334155' }; // N/A
    if (value >= 80) return { text: ' (High)', color: isHigherBetter ? '#16a34a' : '#dc2626' }; // Green if good, Red if bad
    if (value >= 40) return { text: ' (Medium)', color: '#ca8a04' }; // Yellow/Orange
    return { text: ' (Low)', color: isHigherBetter ? '#dc2626' : '#16a34a' }; // Red if low is bad, Green if low is good
};


// ─── PDF Generation Logic ────────────────────────────────────────────────────

export async function generatePdfReport(token: string, tenantId: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`[pdfReport] Generating ENHANCED Summary PDF for tenant ${tenantId}...`);

            // 1. Fetch all data concurrently
            const [
                totalUsers, guestUsers, disabledUsers,
                totalGroups, m365Groups, secGroups, distGroups,
                totalDevices, compliantDevices, nonCompliantDevices,
                appRegs, entApps,
                riskyUsers,
                scoreRes, mfaRes, skusRes, usageRes
            ] = await Promise.allSettled([
                safeGetCount(token, `${GRAPH_BASE}/users`, 'Total Users'),
                safeGetCount(token, `${GRAPH_BASE}/users?$filter=userType eq 'Guest'`, 'Guest Users'),
                safeGetCount(token, `${GRAPH_BASE}/users?$filter=accountEnabled eq false`, 'Disabled Users'),
                
                safeGetCount(token, `${GRAPH_BASE}/groups`, 'Total Groups'),
                safeGetCount(token, `${GRAPH_BASE}/groups?$filter=groupTypes/any(c:c eq 'Unified')`, 'M365 Groups'),
                safeGetCount(token, `${GRAPH_BASE}/groups?$filter=mailEnabled eq false and securityEnabled eq true`, 'Security Groups'),
                safeGetCount(token, `${GRAPH_BASE}/groups?$filter=mailEnabled eq true and securityEnabled eq false`, 'Dist Lists'),
                
                safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices`, 'Total Devices'),
                safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=complianceState eq 'compliant'`, 'Compliant Devices'),
                safeGetCount(token, `${GRAPH_BASE}/deviceManagement/managedDevices?$filter=complianceState eq 'noncompliant'`, 'Non-Compliant Devices'),
                
                safeGetCount(token, `${GRAPH_BASE}/applications`, 'App Registrations'),
                safeGetCount(token, `${GRAPH_BASE}/servicePrincipals`, 'Enterprise Apps'),
                safeGetCount(token, `${GRAPH_BASE}/identityProtection/riskyUsers?$filter=riskState eq 'atRisk'`, 'Risky Users'),
                
                graphGet(token, `${GRAPH_BASE}/security/secureScores?$top=1`).catch(() => null),
                graphGet(token, `${GRAPH_BETA}/reports/authenticationMethods/userRegistrationDetails?$top=999`).catch(() => null),
                graphGet(token, `${GRAPH_BASE}/subscribedSkus`).catch(() => null),
                graphGet(token, `${GRAPH_BETA}/reports/getOffice365ActiveUserCounts(period='D30')?$format=application/json`).catch(() => null)
            ]);

            // 2. Process Values
            const uCount = totalUsers.status === 'fulfilled' ? totalUsers.value : 'N/A';
            const gCount = guestUsers.status === 'fulfilled' ? guestUsers.value : 'N/A';
            const dCount = disabledUsers.status === 'fulfilled' ? disabledUsers.value : 'N/A';
            
            const grpCount = totalGroups.status === 'fulfilled' ? totalGroups.value : 'N/A';
            const m365Count = m365Groups.status === 'fulfilled' ? m365Groups.value : 'N/A';
            const secCount = secGroups.status === 'fulfilled' ? secGroups.value : 'N/A';
            const distCount = distGroups.status === 'fulfilled' ? distGroups.value : 'N/A';

            const devCount = totalDevices.status === 'fulfilled' ? totalDevices.value : 'N/A';
            const compCount = compliantDevices.status === 'fulfilled' ? compliantDevices.value : 'N/A';
            const nonCompCount = nonCompliantDevices.status === 'fulfilled' ? nonCompliantDevices.value : 'N/A';

            const appCount = appRegs.status === 'fulfilled' ? appRegs.value : 'N/A';
            const entCount = entApps.status === 'fulfilled' ? entApps.value : 'N/A';
            const riskCount = riskyUsers.status === 'fulfilled' ? riskyUsers.value : 'N/A';

            let mfaReg = 'N/A' as any, mfaNotReg = 'N/A' as any, mfaRate = null;
            if (mfaRes.status === 'fulfilled' && mfaRes.value?.value) {
                mfaReg = mfaRes.value.value.filter((u: any) => u.isMfaRegistered).length;
                mfaNotReg = mfaRes.value.value.filter((u: any) => !u.isMfaRegistered).length;
                mfaRate = pctNum(mfaReg, mfaReg + mfaNotReg);
            }

            let licTotal = 0, licAssigned = 0, licRate = null;
            const licenseDetails: any[] = [];
            if (skusRes.status === 'fulfilled' && skusRes.value?.value) {
                skusRes.value.value.forEach((sku: any) => {
                    const t = sku.prepaidUnits?.enabled || 0;
                    const c = sku.consumedUnits || 0;
                    licTotal += t;
                    licAssigned += c;
                    licenseDetails.push({
                        name: sku.skuPartNumber || 'Unknown SKU',
                        total: t,
                        assigned: c,
                        available: t - c
                    });
                });
                licRate = pctNum(licAssigned, licTotal);
            } else {
                licTotal = licAssigned = 'N/A' as any;
            }

            let curScore: number | string = 'N/A', maxScore: number | string = 'N/A', scoreRate = null;
            if (scoreRes.status === 'fulfilled' && scoreRes.value?.value?.[0]) {
                const s = scoreRes.value.value[0];
                curScore = s.currentScore;
                maxScore = s.maxScore;
                if (typeof maxScore === 'number' && maxScore > 0) {
                    scoreRate = pctNum(curScore, maxScore);
                }
            }

            let usageM365 = 'N/A';
            if (usageRes.status === 'fulfilled' && usageRes.value?.value) {
                const arr = usageRes.value.value;
                if (arr.length > 0) usageM365 = arr[arr.length - 1].microsoft365 || 'N/A';
            }


            // Generate Insights
            const insights: string[] = [];
            if (mfaRate !== null) {
                if (mfaRate < 50) insights.push(`Critical: Only ${mfaRate.toFixed(1)}% of users are registered for MFA. Immediate enforcement is recommended.`);
                else if (mfaRate < 90) insights.push(`Warning: MFA coverage is at ${mfaRate.toFixed(1)}%. Aim for 100% to protect identities.`);
            }
            if (scoreRate !== null && scoreRate < 60) {
                insights.push(`Security: Tenant Secure Score is low (${scoreRate.toFixed(1)}%). Review Microsoft Defender recommendations.`);
            }
            if (licRate !== null && licRate < 70) {
                insights.push(`Cost Optimization: License utilization is ${licRate.toFixed(1)}%. Consider reclaiming unassigned licenses.`);
            }
            if (typeof gCount === 'number' && typeof uCount === 'number' && uCount > 0) {
                const gr = (gCount / uCount) * 100;
                if (gr > 20) insights.push(`Governance: Elevated guest user ratio (${gr.toFixed(1)}%). Ensure external access reviews are conducted.`);
            }
            if (typeof appCount === 'number' && typeof entCount === 'number' && entCount > appCount * 2) {
                insights.push(`Applications: High volume of Enterprise Apps compared to local App Registrations. Review third-party integrations.`);
            }
            if (typeof nonCompCount === 'number' && nonCompCount > 0) {
                insights.push(`Compliance: ${nonCompCount} devices are marked as non-compliant. Review Intune compliance policies.`);
            }

            if (insights.length === 0) {
                insights.push("Tenant posture appears stable based on available numerical data.");
            }


            // 3. Document Building
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: any) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const primaryColor = '#1e3a8a';
            const accentColor = '#3b82f6';
            const textColor = '#334155';
            const lightColor = '#94a3b8';

            // Header
            doc.fillColor(primaryColor).fontSize(22).text('Tenant Executive Summary', { align: 'center' });
            doc.moveDown(0.2);
            doc.fillColor(lightColor).fontSize(9).text(`Tenant ID: ${tenantId}  |  Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(1.5);

            const drawSectionHeader = (title: string) => {
                doc.x = 50; // enforce left alignment
                doc.y += 10;
                doc.fillColor(primaryColor).fontSize(14).text(title, { underline: false, align: 'left' });
                doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(1).stroke(accentColor);
                doc.moveDown(0.8);
                doc.fillColor(textColor).fontSize(10);
            };

            const drawMetricRow = (label1: string, val1: string, label2?: string, val2?: string, health1?: any, health2?: any) => {
                const y = doc.y;
                
                // Column 1
                doc.font('Helvetica-Bold').text(`${label1}:`, 50, y, { width: 130 });
                doc.font('Helvetica').text(val1, 180, y, { continued: !!health1?.text, width: 150 });
                if (health1?.text) {
                    doc.font('Helvetica-Bold').fillColor(health1.color).text(health1.text);
                    doc.fillColor(textColor);
                }
                const leftY = doc.y;

                // Column 2
                let rightY = y;
                if (label2 && val2 !== undefined) {
                    doc.font('Helvetica-Bold').text(`${label2}:`, 340, y, { width: 110 });
                    doc.font('Helvetica').text(val2, 450, y, { continued: !!health2?.text, width: 100 });
                    if (health2?.text) {
                        doc.font('Helvetica-Bold').fillColor(health2.color).text(health2.text);
                        doc.fillColor(textColor);
                    }
                    rightY = doc.y;
                }
                
                doc.x = 50;
                doc.y = Math.max(leftY, rightY) + 10;
            };

            // --- 1. Identity & Groups ---
            drawSectionHeader('1. Identity & Groups');
            drawMetricRow('Total Users', fmt(uCount), 'Total Groups', fmt(grpCount));
            drawMetricRow('Guest Users', `${fmt(gCount)} (${pct(gCount, uCount)})`, 'M365 Groups', fmt(m365Count));
            drawMetricRow('Disabled Users', `${fmt(dCount)} (${pct(dCount, uCount)})`, 'Security Groups', fmt(secCount));
            drawMetricRow('M365 Active (30d)', fmt(usageM365), 'Distribution Lists', fmt(distCount));
            doc.moveDown(0.5);

            // --- 2. Security & Authentication ---
            const mfaH = getHealth(mfaRate, true);
            const scoreH = getHealth(scoreRate, true);
            const riskH = getHealth(typeof riskCount === 'number' ? 100 - riskCount : null, true); // proxy health

            drawSectionHeader('2. Security & Authentication');
            drawMetricRow('MFA Enabled', fmt(mfaReg), 'Secure Score', `${curScore}/${maxScore}`);
            drawMetricRow('MFA Not Enabled', fmt(mfaNotReg), 'Score Percentage', mfaRate !== null ? pct(curScore, maxScore) : 'N/A', null, scoreH);
            drawMetricRow('MFA Coverage', mfaRate !== null ? mfaRate.toFixed(1) + '%' : 'N/A', 'Risky Users', fmt(riskCount), mfaH);
            doc.moveDown(0.5);

            // --- 3. Devices & Applications ---
            drawSectionHeader('3. Devices & Applications');
            drawMetricRow('Total Devices', fmt(devCount), 'Total App Regs', fmt(appCount));
            drawMetricRow('Compliant', `${fmt(compCount)} (${pct(compCount, devCount)})`, 'Enterprise Apps', fmt(entCount));
            drawMetricRow('Non-Compliant', `${fmt(nonCompCount)} (${pct(nonCompCount, devCount)})`, 'App Ratio (Ent/Reg)', (typeof entCount === 'number' && typeof appCount === 'number' && appCount > 0) ? (entCount / appCount).toFixed(1) + 'x' : 'N/A');
            doc.moveDown(0.5);

            // --- 4. License Distribution ---
            const licH = getHealth(licRate, true);
            drawSectionHeader('4. License Distribution');
            drawMetricRow('Total Licenses', fmt(licTotal), 'Utilization', licRate !== null ? licRate.toFixed(1) + '%' : 'N/A', null, licH);
            
            if (licenseDetails.length > 0) {
                doc.moveDown(0.5);
                
                const drawTableRow = (c1: string, c2: string, c3: string, c4: string, isHeader = false) => {
                    const y = doc.y;
                    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
                    doc.text(c1, 50, y, { width: 220 });
                    const y1 = doc.y;
                    doc.text(c2, 280, y, { width: 60 });
                    const y2 = doc.y;
                    doc.text(c3, 350, y, { width: 60 });
                    const y3 = doc.y;
                    doc.text(c4, 420, y, { width: 60 });
                    const y4 = doc.y;
                    doc.x = 50;
                    doc.y = Math.max(y1, y2, y3, y4) + 5;
                };

                drawTableRow('SKU Name', 'Total', 'Assigned', 'Available', true);
                doc.moveTo(50, doc.y - 3).lineTo(480, doc.y - 3).lineWidth(0.5).stroke(lightColor);
                doc.moveDown(0.5);

                licenseDetails.forEach(l => {
                    drawTableRow(l.name, l.total.toString(), l.assigned.toString(), l.available.toString(), false);
                });
            } else {
                doc.x = 50;
                doc.font('Helvetica-Oblique').fontSize(9).text('No detailed license data available.', 50, doc.y);
            }
            doc.moveDown(1.5);

            // --- 5. Key Executive Insights ---
            drawSectionHeader('5. Key Executive Insights');
            doc.font('Helvetica').fontSize(10);
            insights.forEach(ins => {
                const y = doc.y;
                doc.rect(50, y + 2, 4, 4).fill(accentColor);
                doc.fillColor(textColor).text(ins, 65, y, { align: 'left', width: 450 });
                doc.x = 50; // Ensure X is reset
                doc.y += 5; // Extra padding between insights
            });

            // --- Footer ---
            doc.moveDown(3);
            doc.font('Helvetica-Oblique').fillColor(lightColor).fontSize(8).text('This is an auto-generated, strictly numerical summary. Raw records and distinct PII are explicitly omitted per security compliance.', { align: 'center' });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}
