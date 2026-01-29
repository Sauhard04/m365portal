import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Shield, Loader2, ArrowLeft, TrendingUp, Target, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

const SecureScorePage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [score, setScore] = useState(null);
    const [controlProfiles, setControlProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setLoading(true);
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);

                const [scoreData, profiles] = await Promise.all([
                    graphService.getSecureScore(),
                    graphService.getSecureScoreControlProfiles()
                ]);

                setScore(scoreData);

                if (scoreData?.controlScores && profiles.length > 0) {
                    const profileMap = new Map(profiles.map(p => [p.id, p]));

                    const improvableControls = scoreData.controlScores
                        .map(ctrl => {
                            const profile = profileMap.get(ctrl.controlName);
                            const maxScore = profile?.maxScore || 0;
                            const potentialGain = maxScore - ctrl.score;
                            const scoreImpactPercent = scoreData.maxScore > 0
                                ? ((potentialGain / scoreData.maxScore) * 100).toFixed(2)
                                : 0;

                            return {
                                id: ctrl.controlName,
                                rank: 0,
                                title: profile?.title || ctrl.controlName.replace(/([A-Z])/g, ' $1').trim(),
                                currentScore: ctrl.score,
                                maxScore: maxScore,
                                potentialGain: potentialGain,
                                scoreImpactPercent: parseFloat(scoreImpactPercent),
                                pointsAchieved: `${ctrl.score.toFixed(2)}/${maxScore}`,
                                implementationCost: profile?.implementationCost || 'Unknown',
                                userImpact: profile?.userImpact || 'Unknown',
                                service: profile?.service || 'Unknown',
                                actionUrl: profile?.actionUrl || null,
                                tier: profile?.tier || 'Unknown',
                                category: profile?.controlCategory || 'General',
                                deprecated: profile?.deprecated || false,
                                status: ctrl.score >= maxScore ? 'Completed' : 'To address'
                            };
                        })
                        .filter(ctrl => !ctrl.deprecated && ctrl.potentialGain > 0)
                        .sort((a, b) => b.potentialGain - a.potentialGain)
                        .map((ctrl, index) => ({ ...ctrl, rank: index + 1 }));

                    setControlProfiles(improvableControls);
                } else {
                    setControlProfiles([]);
                }
            } catch (err) {
                console.error('Secure Score fetch error:', err);
                setError("Secure Score telemetry could not be fetched.");
            } finally {
                if (isManual) {
                    setTimeout(() => setLoading(false), 500);
                } else {
                    setLoading(false);
                }
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [instance, accounts]);



    const getScoreImpactClass = (percent) => {
        if (percent >= 2) return 'high';
        if (percent >= 1) return 'medium';
        return 'low';
    };

    if (loading && !score) {
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
                <div className="flex-gap-2">
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchData(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
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
                <>
                    {/* Score Overview Cards */}
                    <div className="stat-grid" style={{ marginBottom: '24px' }}>
                        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
                            <div className="flex-between">
                                <div>
                                    <span className="stat-label">Current Score</span>
                                    <div className="stat-value" style={{ fontSize: '28px', color: 'var(--accent-blue)' }}>
                                        {Math.round(score.currentScore)}
                                    </div>
                                </div>
                                <Target size={24} color="var(--accent-blue)" style={{ opacity: 0.5 }} />
                            </div>
                            <div style={{ marginTop: '12px', height: '4px', background: 'hsla(0,0%,100%,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.5s ease' }} />
                            </div>
                        </div>

                        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
                            <div className="flex-between">
                                <div>
                                    <span className="stat-label">Max Possible</span>
                                    <div className="stat-value" style={{ fontSize: '28px', color: 'var(--accent-purple)' }}>
                                        {Math.round(score.maxScore)}
                                    </div>
                                </div>
                                <Shield size={24} color="var(--accent-purple)" style={{ opacity: 0.5 }} />
                            </div>
                        </div>

                        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-success)' }}>
                            <div className="flex-between">
                                <div>
                                    <span className="stat-label">Completion</span>
                                    <div className="stat-value" style={{ fontSize: '28px', color: 'var(--accent-success)' }}>
                                        {percentage}%
                                    </div>
                                </div>
                                <TrendingUp size={24} color="var(--accent-success)" style={{ opacity: 0.5 }} />
                            </div>
                        </div>

                        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-warning)' }}>
                            <div className="flex-between">
                                <div>
                                    <span className="stat-label">Actions to Address</span>
                                    <div className="stat-value" style={{ fontSize: '28px', color: 'var(--accent-warning)' }}>
                                        {controlProfiles.length}
                                    </div>
                                </div>
                                <AlertCircle size={24} color="var(--accent-warning)" style={{ opacity: 0.5 }} />
                            </div>
                        </div>
                    </div>

                    {/* Recommendations Table */}
                    <div className="recommendations-table-wrapper">
                        <div className="recommendations-header">
                            <h3>
                                <Shield size={20} color="var(--accent-blue)" />
                                Recommended Actions
                                <span className="count-badge">
                                    ({controlProfiles.length})
                                </span>
                            </h3>
                            <a
                                href="https://security.microsoft.com/securescore?viewid=actions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '10px 16px', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                                <ExternalLink size={14} />
                                Open in Defender
                            </a>
                        </div>

                        <div className="table-scroll-container">
                            {/* Desktop Table */}
                            <table className="recommendations-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }} className="center">Rank</th>
                                        <th>Recommended Action</th>
                                        <th style={{ width: '110px' }} className="center">Score Impact</th>
                                        <th style={{ width: '90px' }} className="center">Points</th>
                                        <th style={{ width: '100px' }} className="center">Status</th>
                                        <th style={{ width: '130px' }}>Service</th>
                                        <th style={{ width: '50px' }} className="center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {controlProfiles.length > 0 ? (
                                        controlProfiles.map((item) => (
                                            <tr
                                                key={item.id}
                                                className={item.actionUrl ? 'clickable' : ''}
                                                onClick={() => item.actionUrl && window.open(item.actionUrl, '_blank')}
                                            >
                                                <td className="rank">{item.rank}</td>
                                                <td>
                                                    <div className="action-title">{item.title}</div>
                                                    <div className="action-meta">
                                                        <span>{item.category}</span>
                                                        <span>•</span>
                                                        <span>{item.implementationCost} cost</span>
                                                        <span>•</span>
                                                        <span>{item.userImpact} impact</span>
                                                    </div>
                                                </td>
                                                <td className="center">
                                                    <span className={`score-impact ${getScoreImpactClass(item.scoreImpactPercent)}`}>
                                                        +{item.scoreImpactPercent}%
                                                    </span>
                                                </td>
                                                <td className="center">
                                                    <span className="points">{item.pointsAchieved}</span>
                                                </td>
                                                <td className="center">
                                                    <span className={`status-badge ${item.status === 'Completed' ? 'completed' : 'to-address'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="service-badge">{item.service}</span>
                                                </td>
                                                <td className="center">
                                                    {item.actionUrl && <ExternalLink size={14} className="link-icon" />}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7">
                                                <div className="recommendations-empty">
                                                    <CheckCircle2 size={32} color="var(--accent-success)" />
                                                    <p>All security controls are at maximum score!</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Mobile Cards */}
                            <div className="recommendations-mobile">
                                {controlProfiles.length > 0 ? (
                                    controlProfiles.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`recommendation-card ${item.actionUrl ? 'clickable' : ''}`}
                                            onClick={() => item.actionUrl && window.open(item.actionUrl, '_blank')}
                                        >
                                            <div className="recommendation-card-header">
                                                <div className="recommendation-card-rank">{item.rank}</div>
                                                <div className="recommendation-card-title">{item.title}</div>
                                                {item.actionUrl && <ExternalLink size={14} color="var(--text-dim)" />}
                                            </div>
                                            <div className="recommendation-card-stats">
                                                <div className="recommendation-card-stat">
                                                    <div className="recommendation-card-stat-label">Impact</div>
                                                    <div className={`recommendation-card-stat-value score-impact ${getScoreImpactClass(item.scoreImpactPercent)}`}>
                                                        +{item.scoreImpactPercent}%
                                                    </div>
                                                </div>
                                                <div className="recommendation-card-stat">
                                                    <div className="recommendation-card-stat-label">Points</div>
                                                    <div className="recommendation-card-stat-value">{item.pointsAchieved}</div>
                                                </div>
                                                <div className="recommendation-card-stat">
                                                    <div className="recommendation-card-stat-label">Status</div>
                                                    <div className="recommendation-card-stat-value">
                                                        <span className={`status-badge ${item.status === 'Completed' ? 'completed' : 'to-address'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="recommendations-empty">
                                        <CheckCircle2 size={32} color="var(--accent-success)" />
                                        <p>All security controls are at maximum score!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="glass-card flex-center" style={{ padding: '100px', flexDirection: 'column' }}>
                    <Shield size={48} style={{ opacity: 0.1, marginBottom: '24px' }} />
                    <p style={{ color: 'var(--text-dim)' }}>Access Denied or No Secure Score Data Available.</p>
                </div>
            )}
        </div>
    );
};

export default SecureScorePage;
