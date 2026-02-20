import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Lock, Shield, CheckCircle, XCircle, AlertCircle, Calendar, Users, Info } from 'lucide-react';
import { IntuneService } from '../services/intune';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import styles from './DetailPage.module.css';

const IntuneSecurityBaselines = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [baselines, setBaselines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedBaseline, setExpandedBaseline] = useState(null);
    const [baselineStats, setBaselineStats] = useState({});

    useEffect(() => {
        fetchBaselines();
    }, [activeTenantId]);

    const fetchBaselines = async () => {
        if (accounts.length > 0) {
            try {
                setLoading(true);
                const accessToken = await acquireToken({ ...loginRequest });
                const client = new GraphService(accessToken).client;
                const data = await IntuneService.getSecurityBaselines(client);
                setBaselines(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching security baselines:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleBaseline = async (baseline) => {
        if (expandedBaseline === baseline.id) {
            setExpandedBaseline(null);
        } else {
            setExpandedBaseline(baseline.id);
            // If there are deployed instances, fetch stats for the first one
            if (baseline.deployedInstances && baseline.deployedInstances.length > 0 && !baselineStats[baseline.id]) {
                try {
                    const accessToken = await acquireToken({ ...loginRequest });
                    const client = new GraphService(accessToken).client;
                    const intentId = baseline.deployedInstances[0].id;
                    const stats = await IntuneService.getSecurityBaselineStats(client, intentId);
                    setBaselineStats(prev => ({
                        ...prev,
                        [baseline.id]: stats
                    }));
                } catch (err) {
                    console.error('Error fetching baseline stats:', err);
                }
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getCompliancePercentage = (stats) => {
        if (!stats || stats.totalDevices === 0) return 0;
        return Math.round((stats.compliant / stats.totalDevices) * 100);
    };

    const getStatusBadge = (isDeployed) => {
        return isDeployed ? (
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                <CheckCircle style={{ width: '0.9rem', height: '0.9rem', marginRight: '0.25rem' }} />
                DEPLOYED
            </span>
        ) : (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
                <AlertCircle style={{ width: '0.9rem', height: '0.9rem', marginRight: '0.25rem' }} />
                NOT DEPLOYED
            </span>
        );
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/intune')} className={styles.backButton}>
                    <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <Lock style={{ width: '2rem', height: '2rem', color: '#eab308' }} />
                        Security Baselines
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Microsoft-recommended security configuration templates for devices
                    </p>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Available Security Baselines</h2>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            {loading ? '...' : baselines.length} BASELINES
                        </span>
                    </div>

                    {!loading && !error && baselines.length > 0 && (
                        <div style={{
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            margin: '0 1.5rem 1rem 1.5rem',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'start'
                        }}>
                            <Info style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6', flexShrink: 0, marginTop: '0.1rem' }} />
                            <div>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                    Note: API-Accessible Baselines Only
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                                    This page shows security baselines available via the Microsoft Graph API. Additional baselines (such as HoloLens or M365 Apps baselines) may appear in the Intune admin center but require specific licensing or are not yet expose via the API.
                                </p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.emptyState}>
                            <div className={styles.spinner}></div>
                            <p className={styles.emptyDescription}>Loading security baselines...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <XCircle style={{ width: '2.5rem', height: '2.5rem', color: '#ef4444' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>Error Loading Baselines</h3>
                            <p className={styles.emptyDescription}>
                                {error}
                            </p>
                        </div>
                    ) : baselines.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Lock style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Security Baselines</h3>
                            <p className={styles.emptyDescription}>
                                No security baseline templates are available in your Intune tenant.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Baseline Name</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Deployed Policies</th>
                                        <th>Published Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {baselines.map((baseline) => (
                                        <React.Fragment key={baseline.id}>
                                            <tr className={styles.tableRow}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Shield style={{ width: '1.2rem', height: '1.2rem', color: '#eab308' }} />
                                                        <div>
                                                            <div style={{ fontWeight: '600' }}>{baseline.displayName}</div>
                                                            {baseline.versionInfo && (
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                                                    {baseline.versionInfo}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                        {baseline.templateSubtype || baseline.baselineType}
                                                    </span>
                                                </td>
                                                <td>{getStatusBadge(baseline.isDeployed)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Users style={{ width: '1rem', height: '1rem' }} />
                                                        {baseline.deployedCount || 0} {baseline.deployedCount === 1 ? 'policy' : 'policies'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Calendar style={{ width: '1rem', height: '1rem' }} />
                                                        {formatDate(baseline.lastModifiedDateTime)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleBaseline(baseline)}
                                                        className={styles.button}
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                    >
                                                        {expandedBaseline === baseline.id ? 'Hide Details' : 'View Details'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedBaseline === baseline.id && (
                                                <tr>
                                                    <td colSpan="6" style={{ background: 'var(--card-bg)', padding: '1.5rem' }}>
                                                        <div style={{
                                                            background: 'var(--bg-primary)',
                                                            borderRadius: '8px',
                                                            padding: '1.5rem',
                                                            border: '1px solid var(--border-color)'
                                                        }}>
                                                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                                                                Baseline Information
                                                            </h3>

                                                            {/* Description */}
                                                            {baseline.description && (
                                                                <div style={{ marginBottom: '1.5rem' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                        <Info style={{ width: '1rem', height: '1rem', color: 'var(--text-secondary)' }} />
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Description</span>
                                                                    </div>
                                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                                        {baseline.description}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Deployed Instances */}
                                                            {baseline.deployedInstances && baseline.deployedInstances.length > 0 ? (
                                                                <>
                                                                    <div style={{ marginBottom: '1rem' }}>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Deployed Instances</span>
                                                                    </div>
                                                                    <div style={{ marginBottom: '1.5rem' }}>
                                                                        {baseline.deployedInstances.map((instance, idx) => (
                                                                            <div key={idx} style={{
                                                                                padding: '0.75rem',
                                                                                background: 'var(--card-bg)',
                                                                                borderRadius: '6px',
                                                                                marginBottom: '0.5rem',
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center'
                                                                            }}>
                                                                                <span style={{ fontSize: '0.9rem' }}>{instance.displayName}</span>
                                                                                {instance.isAssigned && (
                                                                                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                                                        ASSIGNED
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {/* Compliance Statistics */}
                                                                    <div style={{ marginTop: '1.5rem' }}>
                                                                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
                                                                            Compliance Statistics (First Deployed Policy)
                                                                        </h4>
                                                                        {baselineStats[baseline.id] ? (
                                                                            <div style={{
                                                                                display: 'grid',
                                                                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                                                                gap: '1rem'
                                                                            }}>
                                                                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '6px' }}>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Devices</div>
                                                                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', marginTop: '0.3rem' }}>
                                                                                        {baselineStats[baseline.id].totalDevices}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '6px' }}>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Compliant</div>
                                                                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#10b981', marginTop: '0.3rem' }}>
                                                                                        {baselineStats[baseline.id].compliant}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                                                                        {getCompliancePercentage(baselineStats[baseline.id])}% compliance
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '6px' }}>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Non-Compliant</div>
                                                                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#ef4444', marginTop: '0.3rem' }}>
                                                                                        {baselineStats[baseline.id].nonCompliant}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '6px' }}>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Error</div>
                                                                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f59e0b', marginTop: '0.3rem' }}>
                                                                                        {baselineStats[baseline.id].error}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '6px' }}>
                                                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Conflict</div>
                                                                                    <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#8b5cf6', marginTop: '0.3rem' }}>
                                                                                        {baselineStats[baseline.id].conflict}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                                                                                <div className={styles.spinner}></div>
                                                                                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                                                    Loading compliance data...
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div style={{
                                                                    padding: '2rem',
                                                                    textAlign: 'center',
                                                                    background: 'var(--card-bg)',
                                                                    borderRadius: '6px'
                                                                }}>
                                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                                        This baseline has not been deployed yet. Deploy it from the Intune admin center to start monitoring compliance.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneSecurityBaselines;
