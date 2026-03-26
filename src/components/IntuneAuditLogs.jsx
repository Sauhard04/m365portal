import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, FileText, Loader2 } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneAuditLogs = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [auditEvents, setAuditEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchAuditEvents = async () => {
            if (accounts.length > 0) {
                try {
                    const accessToken = await acquireToken({ ...loginRequest });
                    const client = new GraphService(accessToken).client;
                    const data = await IntuneService.getAuditEvents(client, 50);
                    setAuditEvents(data);
                } catch (error) {
                    console.error("Audit events fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchAuditEvents();
    }, [activeTenantId]);

    const filteredEvents = auditEvents.filter(event =>
        (event.displayName || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (event.activityType || '').toLowerCase().includes(filterText.toLowerCase())
    );

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/intune')} className={styles.backButton}>
                    <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <FileText style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} />
                        Audit & Activity Logs
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Recent administrator actions and configuration changes
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search audit logs..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Audit Events</h2>
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                            {filteredEvents.length} EVENTS
                        </span>
                    </div>

                    {filteredEvents.length > 0 ? (
                        <div className={styles.tableContainer} style={{ zoom: '89%' }}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', paddingLeft: '1.5rem' }}>Activity</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>Type</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>Category</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>Actor</th>
                                        <th style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map((event, i) => (
                                        <tr key={i} className={styles.tableRow}>
                                            <td style={{ padding: '0.75rem 1rem', paddingLeft: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
                                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.8rem' }}>{event.displayName || 'Unknown Activity'}</span>
                                                </div>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>
                                                <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                                                    {event.activityType || 'Unknown'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>{event.category || 'N/A'}</td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>
                                                {event.actor?.userPrincipalName || 'System'}
                                            </td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>
                                                {event.activityDateTime ? new Date(event.activityDateTime).toLocaleString() : 'Unknown'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <FileText style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Audit Events</h3>
                            <p className={styles.emptyDescription}>
                                No audit events found or no events match your search.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneAuditLogs;
