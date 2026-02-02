import React from 'react';
import { Shield } from 'lucide-react';

const SecurityExplorer = () => {
    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={28} style={{ color: 'var(--accent-error)' }} />
                        Security Explorer
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Advanced threat hunting and analysis</p>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <p>Security Explorer content loading...</p>
            </div>
        </div>
    );
};

export default SecurityExplorer;
