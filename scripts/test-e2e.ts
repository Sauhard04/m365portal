/**
 * E2E Test Script for Phase 1
 * 
 * Requirements:
 *   - EXCHANGE_APP_ID environment variable (Azure AD app ID)
 *   - EXCHANGE_TENANT_ID environment variable (tenant domain or ID)
 *   - EXCHANGE_CERT_THUMB environment variable (certificate thumbprint)
 *   - pwsh + ExchangeOnlineManagement module installed and available
 * 
 * Runs:
 *   1. Execute Get-OrganizationConfig via ExchangeConnectionService (app-only auth)
 *   2. Inspect audit DB for job lifecycle records
 *   3. Print results (success or error details)
 */

import { executeExchangeJobSync } from '../jobs/exchange.sync';
import { listAudits } from '../shared/logging/exchangeAudit';

async function runTest() {
    console.log('=== Phase 1 E2E Test: Get-OrganizationConfig ===\n');

    // 1. Validate env vars
    const appId = process.env.EXCHANGE_APP_ID;
    const tenantId = process.env.EXCHANGE_TENANT_ID;
    const certThumb = process.env.EXCHANGE_CERT_THUMB;

    if (!appId || !tenantId || !certThumb) {
        console.error('❌ Missing required environment variables:');
        console.error('   EXCHANGE_APP_ID:', appId ? '✓' : '✗');
        console.error('   EXCHANGE_TENANT_ID:', tenantId ? '✓' : '✗');
        console.error('   EXCHANGE_CERT_THUMB:', certThumb ? '✓' : '✗');
        process.exit(1);
    }

    console.log('✓ Environment variables set');
    console.log(`  - App ID: ${appId.substring(0, 8)}...`);
    console.log(`  - Tenant: ${tenantId}`);
    console.log(`  - Cert Thumb: ${certThumb.substring(0, 8)}...\n`);

    // 2. Execute job
    console.log('⏳ Executing Get-OrganizationConfig...\n');
    const result = await executeExchangeJobSync({ action: 'Get-OrganizationConfig' });

    console.log(`Result:`, result);

    // 3. Check audit DB
    console.log('\n⏳ Checking audit database...\n');
    const audits = await listAudits(10);
    console.log(`Recent audit entries (last 10):`);
    audits.forEach((audit: any) => {
        const details = audit.details ? JSON.parse(audit.details).substring(0, 100) : '';
        console.log(`  [${audit.status.toUpperCase()}] Job ${audit.jobId} - Action: ${audit.action} - Details: ${details}...`);
    });

    // 4. Success/failure summary
    console.log('\n=== Test Summary ===');
    if (result.success) {
        console.log('✅ SUCCESS: Get-OrganizationConfig executed and audit recorded');
        console.log('   Output sample:', JSON.stringify(result.result).substring(0, 200) + '...');
    } else {
        console.log('❌ FAILED:', result.error);
        const failedAudit = audits.find((a: any) => a.jobId === result.jobId && a.status === 'failed');
        if (failedAudit) {
            console.log('   Audit details:', failedAudit.details);
        }
    }
}

runTest().catch(console.error);
