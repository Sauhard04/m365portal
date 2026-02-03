import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Lock, CreditCard, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';

const SubscriptionGate = ({ children }) => {
    const { isExpired, isLoading } = useSubscription();

    console.log('[SubscriptionGate] State Check:', { isExpired, isLoading, hasChildren: !!children });

    if (isLoading) {
        return (
            <>
                {children || <Outlet />}
                {/* Invisible debug marker */}
                <span data-debug="subscription-loading" style={{ display: 'none' }}></span>
            </>
        );
    }

    if (isExpired) {
        return (
            <div className="flex-center" style={{
                height: '100vh',
                width: '100vw',
                background: 'rgba(2, 6, 23, 0.95)',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                backdropFilter: 'blur(10px)'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card"
                    style={{
                        maxWidth: '500px',
                        padding: '40px',
                        textAlign: 'center',
                        border: '1px solid var(--accent-indigo)'
                    }}
                >
                    <div className="flex-center" style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '16px',
                        margin: '0 auto 24px',
                        color: 'var(--accent-indigo)'
                    }}>
                        <Lock size={32} />
                    </div>

                    <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: '#fff' }}>
                        Your 2-Day Trial has Expired
                    </h2>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
                        We hope you enjoyed exploring the M365 Operations Portal! To continue accessing your tenant insights, PowerShell automation, and security reports, please upgrade to a premium plan.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            className="glass-btn primary"
                            style={{
                                width: '100%',
                                justifyContent: 'space-between',
                                padding: '16px 24px',
                                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-blue))',
                                border: 'none'
                            }}
                            onClick={() => window.location.href = '/service/admin/subscription'}
                        >
                            <span className="flex-center" style={{ gap: '12px', fontWeight: 700 }}>
                                <Zap size={18} /> Upgrade to Premium
                            </span>
                            <ArrowRight size={18} />
                        </button>

                        <button
                            className="glass-btn"
                            style={{ width: '100%', padding: '16px' }}
                            onClick={() => window.location.href = 'mailto:sales@example.com'}
                        >
                            <CreditCard size={18} style={{ marginRight: '8px' }} />
                            Contact Sales for Enterprise
                        </button>
                    </div>

                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '24px' }}>
                        Need more time? Reach out to our support team for a trial extension.
                    </p>
                </motion.div>
            </div>
        );
    }

    return children || <Outlet />;
};

export default SubscriptionGate;
