import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import { AlertTriangle, ArrowLeft, RefreshCw, Filter, Search, ExternalLink } from 'lucide-react';

import styles from './DetailPage.module.css';

const SecurityAlertsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [filteredAlerts, setFilteredAlerts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    const fetchAlerts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            let accessToken = await acquireToken({
                ...loginRequest
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const data = await SecurityService.getSecurityAlerts(client, 200);
            setAlerts(data);
            setFilteredAlerts(data);
        } catch (err) {
            console.error('Failed to fetch security alerts:', err);
            setError(err.name === "InteractionRequiredAuthError" ? "InteractionRequired" : "Failed to load alerts.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [activeTenantId]);

    useEffect(() => {
        let filtered = alerts;
        if (severityFilter !== 'all') {
            filtered = filtered.filter(a => a.severity?.toLowerCase() === severityFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(a =>
                a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredAlerts(filtered);
    }, [alerts, severityFilter, searchTerm]);

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Security Alerts..." />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/security')} className={styles.backButton}>
                    <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                    Back to Dashboard
                </button>


                <div className={styles.pageHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                <AlertTriangle size={32} style={{ color: '#ef4444' }} />
                                Security Alerts
                            </h1>
                            <p className={styles.pageSubtitle}>
                                Detailed investigation of security alerts from Microsoft 365 Defender
                            </p>
                        </div>
                        <button
                            className={`${styles.actionButtonSecondary} ${refreshing ? 'spinning' : ''}`}
                            onClick={() => fetchData(true)}
                            style={{ borderRadius: '12px', padding: '12px' }}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className={styles.filterBar}>
                    <div className={styles.filterGroup} style={{ flex: 1 }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.filterInput}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <Filter size={18} />
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Severities</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Alert Detail</h2>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            {filteredAlerts.length} ALERTS
                        </span>
                    </div>

                    <div className={styles.tableContainer}>
                        <div className={styles.scrollableTable}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Severity</th>
                                        <th>Title</th>
                                        <th>Category</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Provider</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAlerts.length > 0 ? (
                                        filteredAlerts.map((alert, idx) => (
                                            <tr key={alert.id || idx} className={styles.tableRow}>
                                                <td>
                                                    <span className={styles.badge} style={{
                                                        background: `${getSeverityColor(alert.severity)}20`,
                                                        color: getSeverityColor(alert.severity),
                                                        borderColor: `${getSeverityColor(alert.severity)}40`
                                                    }}>
                                                        {alert.severity || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ maxWidth: '300px' }}>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{alert.title}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {alert.description}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{alert.category || 'N/A'}</td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                        {alert.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                                    {alert.createdDateTime ? new Date(alert.createdDateTime).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td style={{ color: 'var(--text-dim)' }}>
                                                    {alert.vendorInformation?.provider || alert.detectionSource || 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className={styles.emptyState}>
                                                No security alerts found matching your filters.
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

export default SecurityAlertsPage;
