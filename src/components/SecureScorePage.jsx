import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Shield, Loader2, ArrowLeft, TrendingUp, Target, CheckCircle2, AlertCircle } from 'lucide-react';

const SecureScorePage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getSecureScore();
                    setScore(data);
                } catch (err) {
                    setError("Secure Score telemetry could not be fetched.");
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
            </div>
        );
    }

    const percentage = score ? Math.round((score.currentScore / score.maxScore) * 100) : 0;

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Microsoft Secure Score</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Cybersecurity health assessment and posture tracking</p>
                </div>
            </header>

            {error ? (
                <div className="glass-card" style={{ background: 'hsla(0, 84%, 60%, 0.05)', borderColor: 'hsla(0, 84%, 60%, 0.2)' }}>
                    <div className="flex-center justify-start flex-gap-4" style={{ color: 'var(--accent-error)' }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                </div>
            ) : score ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 className="spacing-v-8 flex-center justify-start flex-gap-4">
                            <Target size={20} color="var(--accent-blue)" />
                            Security Integrity
                        </h2>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsla(0,0%,100%,0.05)" strokeWidth="2" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeDasharray={`${percentage}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 800 }}>{percentage}%</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Rating</span>
                                </div>
                            </div>

                            <div>
                                <div className="stat-label">Current Strength</div>
                                <div style={{ fontSize: '48px', fontWeight: 800, fontFamily: 'Outfit' }}>
                                    {score.currentScore} <span style={{ fontSize: '20px', color: 'var(--text-dim)', fontWeight: 400 }}>/ {score.maxScore}</span>
                                </div>
                                <button className="btn btn-primary" style={{ marginTop: '24px' }}>
                                    <TrendingUp size={16} />
                                    Review Recommendations
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <h3 className="spacing-v-8">Actionable Improvements</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { title: 'Require MFA for all users', impact: '+35 pts', status: 'High' },
                                { title: 'Disable Legacy Authentication', impact: '+15 pts', status: 'Crit' },
                                { title: 'Review Global Admin count', impact: '+10 pts', status: 'Med' }
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '16px', background: 'hsla(0,0%,100%,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.title}</div>
                                        <div style={{ color: 'var(--accent-blue)', fontSize: '12px' }}>Potential impact: {item.impact}</div>
                                    </div>
                                    <span className={`badge ${item.status === 'Crit' ? 'badge-error' : 'badge-info'}`}>{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card flex-center" style={{ padding: '100px' }}>
                    <Shield size={48} style={{ opacity: 0.1, marginBottom: '24px' }} />
                    <p style={{ color: 'var(--text-dim)' }}>Access Denied or No Secure Score Data Available.</p>
                </div>
            )}
        </div>
    );
};

export default SecureScorePage;
