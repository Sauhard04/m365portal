import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant.js';

/**
 * Middleware to check for trial expiration or active subscription
 */
export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // In a production app, tenantId would come from the verified JWT token (req.user.tenantId)
        // For now, we expect it in the headers or body as passed by the frontend
        const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || req.query.tenantId;

        if (!tenantId || typeof tenantId !== 'string') {
            // If no tenant context is provided, we allow the request but log it
            // In strict mode, you might want to return an error here
            return next();
        }

        let tenant = await Tenant.findOne({ tenantId });

        // 1. Auto-create tenant record on first access (Start Trial)
        if (!tenant) {
            console.log(`[Subscription] New tenant detected: ${tenantId}. Starting 2-day trial.`);
            tenant = await Tenant.create({
                tenantId,
                subscriptionStatus: 'trial',
                trialStartDate: new Date()
            });
        }

        // 2. Allow if subscription is active
        if (tenant.subscriptionStatus === 'active') {
            return next();
        }

        // 3. Check for Trial Expiration (2 Days = 172,800,000 ms)
        const TRIAL_DURATION = 2 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();
        const trialEnd = new Date(tenant.trialStartDate).getTime() + TRIAL_DURATION;

        if (now > trialEnd && tenant.subscriptionStatus === 'trial') {
            console.warn(`[Subscription] Trial expired for tenant: ${tenantId}`);
            return res.status(402).json({
                success: false,
                code: 'TRIAL_EXPIRED',
                message: 'Your 2-day free trial has expired.',
                details: 'Please subscribe to a monthly or yearly plan to continue using the portal features.',
                upgradeUrl: '/service/admin/subscription'
            });
        }

        // 4. Trial still active or other allowed state
        next();
    } catch (error) {
        console.error('[Subscription] Guard error:', error);
        // Fail open in case of DB errors to avoid breaking the app, but log it
        next();
    }
};
