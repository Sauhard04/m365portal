import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis();

export const exchangeQueue = new Queue('exchange-jobs', { connection });

export type ExchangeJobPayload = {
    id: string;
    action: string;
    params?: Record<string, any>;
};

export async function addExchangeJob(payload: ExchangeJobPayload) {
    return await exchangeQueue.add(payload.action, payload, { removeOnComplete: true, removeOnFail: true });
}
