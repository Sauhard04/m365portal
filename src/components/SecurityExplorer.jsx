import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { Shield, ArrowLeft, RefreshCw, Activity, AlertTriangle, UserX, ExternalLink } from 'lucide-react';
import { SecurityService } from '../services/security/security.service';
import { loginRequest } from '../authConfig';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const SecurityExplorer = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [riskDetections, setRiskDetections] = useState([]);
    const [error, setError] = useState(null);

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const accessToken = await acquireToken({
                ...loginRequest
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const data = await SecurityService.getRiskDetections(client, 100);
            setRiskDetections(data);
        } catch (err) {
            console.error('Failed to fetch risk detections:', err);
            setError('Failed to load threat intelligence data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTenantId]);

    const getRiskLevelColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Scanning for Threats..." />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/security')} className={styles.backButton}>
                    <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                    Back to Dashboard
                </button>

                <div className={styles.pageHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            padding: '12px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Shield size={32} style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <h1 className={styles.pageTitle} style={{ margin: 0 }}>Security Explorer</h1>
                            <p className={styles.pageSubtitle}>Advanced threat hunting & analytical risk detection</p>
                        </div>
                    </div>
                    <button
                        className={`${styles.actionButtonSecondary} ${refreshing ? 'spinning' : ''}`}
                        onClick={() => fetchData(true)}
                        style={{ borderRadius: '12px', padding: '12px' }}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {error && (
                    <div className={styles.alert || "error-banner"} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                        <AlertTriangle size={14} style={{ marginRight: '8px' }} />
                        <span>{error}</span>
                    </div>
                )}

                <div className={styles.statsGrid} style={{ marginBottom: '24px' }}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>
                            <Activity size={16} style={{ color: '#ef4444' }} />
                            Total Risk Detections
                        </div>
                        <div className={styles.statValue}>{riskDetections.length}</div>
                        <div className={styles.statSubtext}>Across all identified entities</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>
                            <UserX size={16} style={{ color: '#f59e0b' }} />
                            High Risk Impact
                        </div>
                        <div className={styles.statValue} style={{ color: '#f59e0b' }}>
                            {riskDetections.filter(d => d.riskLevel?.toLowerCase() === 'high').length}
                        </div>
                        <div className={styles.statSubtext}>Critical detections requiring action</div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Identity & Access Risk Detections</h2>
                        <a href="https://entra.microsoft.com/#view/Microsoft_AAD_IAM/IdentityProtectionMenuBlade/~/Detections" target="_blank" rel="noopener noreferrer" className={styles.viewMoreBtn}>
                            Entra ID Protection <ExternalLink size={12} style={{ marginLeft: '6px' }} />
                        </a>
                    </div>
                    <div className={styles.tableContainer}>
                        <div className={styles.scrollableTable}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Detection Type</th>
                                        <th>User</th>
                                        <th>Risk Level</th>
                                        <th>State</th>
                                        <th>Source</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {riskDetections.length > 0 ? (
                                        riskDetections.map((detection, idx) => (
                                            <tr key={detection.id || idx} className={styles.tableRow}>
                                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {detection.riskEventType || 'Unknown Event'}
                                                </td>
                                                <td>
                                                    <div style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
                                                        {detection.userDisplayName || 'Internal System'}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                                        {detection.userPrincipalName}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={styles.badge} style={{
                                                        background: `${getRiskLevelColor(detection.riskLevel)}20`,
                                                        color: getRiskLevelColor(detection.riskLevel),
                                                        borderColor: `${getRiskLevelColor(detection.riskLevel)}40`
                                                    }}>
                                                        {detection.riskLevel}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                        {detection.riskState}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{detection.source || 'Sign-in'}</td>
                                                <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                                                    {detection.detectedDateTime ? new Date(detection.detectedDateTime).toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className={styles.emptyState}>
                                                No threat intelligence risk detections found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityExplorer;
