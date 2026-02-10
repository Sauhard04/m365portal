import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { AlertOctagon, ArrowLeft, RefreshCw, Filter, Search, Clock, Users } from 'lucide-react';
import Loader3D from './Loader3D';

import styles from './DetailPage.module.css';

const SecurityIncidentsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [filteredIncidents, setFilteredIncidents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchIncidents = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const account = accounts[0];
            if (!account) throw new Error('No account found');

            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await SecurityService.getSecurityIncidents(client, 100);
            setIncidents(data);
            setFilteredIncidents(data);
        } catch (err) {
            console.error('Failed to fetch security incidents:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = incidents;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(i => i.status?.toLowerCase() === statusFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(i =>
                i.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.incidentWebUrl?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredIncidents(filtered);
    }, [incidents, statusFilter, searchTerm]);

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return '#ef4444';
            case 'inprogress': return '#f59e0b';
            case 'resolved': return '#22c55e';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Security Incidents..." />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/security')} className={styles.backButton}>
                    <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                    Back to Dashboard
                </button>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <AlertOctagon style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
                        Security Incidents
                    </h1>
                    <p className={styles.pageSubtitle}>
                        {filteredIncidents.length} active security incidents identified for investigation
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search incidents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <Filter size={14} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inprogress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>

                <div className={styles.grid}>
                    {filteredIncidents.length > 0 ? (
                        filteredIncidents.map((incident, idx) => (
                            <div key={incident.id || idx} className={styles.statCard} style={{ cursor: 'default' }}>
                                <div className="flex-between spacing-v-4">
                                    <span className={styles.badge} style={{
                                        background: `${getSeverityColor(incident.severity)}20`,
                                        color: getSeverityColor(incident.severity),
                                        borderColor: `${getSeverityColor(incident.severity)}40`
                                    }}>
                                        {incident.severity || 'Unknown'} SEVERITY
                                    </span>
                                    <span className={styles.badge} style={{
                                        background: `${getStatusColor(incident.status)}20`,
                                        color: getStatusColor(incident.status),
                                        borderColor: `${getStatusColor(incident.status)}40`
                                    }}>
                                        {incident.status || 'Unknown'}
                                    </span>
                                </div>
                                <h3 className={styles.cardTitle} style={{ marginTop: '12px', fontSize: '15px' }}>
                                    {incident.displayName || 'Untitled Incident'}
                                </h3>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                    <div className="flex-gap-1" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                        <Clock size={12} />
                                        <span>{incident.createdDateTime ? new Date(incident.createdDateTime).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex-gap-1" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                        <Users size={12} />
                                        <span>{incident.alertCount || 0} alerts</span>
                                    </div>
                                </div>
                                {incident.incidentWebUrl && (
                                    <a
                                        href={incident.incidentWebUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.viewMoreBtn}
                                        style={{ marginTop: '16px', display: 'flex', width: '100%', justifyContent: 'center' }}
                                    >
                                        M365 Defender →
                                    </a>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                            No security incidents found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecurityIncidentsPage;
