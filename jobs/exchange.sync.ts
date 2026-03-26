import { ExchangeConnectionService } from '../services/exchange/connection.service';
import { createAudit } from '../shared/logging/exchangeAudit';
import { v4 as uuidv4 } from 'uuid';

export type ExchangeJobPayload = {
    id?: string;
    action: string;
    params?: Record<string, any>;
};

/**
 * Synchronous job executor
 * - Runs Exchange jobs without BullMQ/Redis
 * - Each job is executed immediately and audit record is created
 * - Use this when Redis is unavailable; switch to BullMQ worker when Redis is ready
 */
export async function executeExchangeJobSync(payload: ExchangeJobPayload) {
    const jobId = payload.id || `job_${uuidv4()}`;
    const { action, params } = payload;

    // Log: job started
    await createAudit({ jobId, action, status: 'started', details: JSON.stringify({ params }) });

    try {
        const conn = new ExchangeConnectionService(
            process.env.EXCHANGE_APP_ID || '',
            process.env.EXCHANGE_TENANT_ID || '',
            process.env.EXCHANGE_CERT_THUMB || ''
        );

        let result: any;
        switch (action) {
            case 'Get-OrganizationConfig':
                result = await conn.getOrganizationConfig();
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Log: job completed
        await createAudit({ jobId, action, status: 'completed', details: JSON.stringify({ result }) });
        return { success: true, jobId, result };
    } catch (err: any) {
        // Log: job failed
        await createAudit({ jobId, action, status: 'failed', details: String(err.message || err) });
        return { success: false, jobId, error: String(err.message || err) };
    }
}
