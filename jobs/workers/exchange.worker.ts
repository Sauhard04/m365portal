import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ExchangeConnectionService } from '../../services/exchange/connection.service';
import { createAudit } from '../../shared/logging/exchangeAudit';

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : 'redis://localhost:6379');
const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
});

const worker = new Worker('exchange-jobs', async (job: Job) => {
    const payload = job.data as any;
    const { id, action, params } = payload;

    // Create audit record: started
    await createAudit({ jobId: id, action, status: 'started', details: JSON.stringify({ params }) });

    try {
        const conn = new ExchangeConnectionService(process.env.EXCHANGE_APP_ID || '', process.env.EXCHANGE_TENANT_ID || '', process.env.EXCHANGE_CERT_THUMB || '');

        let result: any;
        switch (action) {
            case 'Get-OrganizationConfig':
                result = await conn.getOrganizationConfig();
                break;
            default:
                throw new Error('Unknown action');
        }

        await createAudit({ jobId: id, action, status: 'completed', details: JSON.stringify({ result }) });
        return result;
    } catch (err: any) {
        await createAudit({ jobId: id, action, status: 'failed', details: String(err) });
        throw err;
    }
}, { connection });

worker.on('failed', async (args: any) => {
    const job: Job | undefined = args.job as Job | undefined;
    const err: Error = args.err as Error;
    try {
        if (job && job.data) {
            await createAudit({ jobId: (job.data as any).id, action: (job.data as any).action, status: 'failed', details: String(err) });
        } else {
            await createAudit({ jobId: 'unknown', action: 'unknown', status: 'failed', details: String(err) });
        }
    } catch (e) {
        console.error('Failed to log audit for failed job', e);
    }
});

export default worker;
