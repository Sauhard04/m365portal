import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, Settings, Loader2 } from 'lucide-react';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneConfigProfiles = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchProfiles = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await IntuneService.getConfigurationProfiles(client);
                    setProfiles(data);
                } catch (error) {
                    console.error("Configuration profile fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfiles();
    }, [accounts, instance]);

    const filteredProfiles = profiles.filter(profile =>
        (profile.displayName || '').toLowerCase().includes(filterText.toLowerCase())
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
                        <Settings style={{ width: '2rem', height: '2rem', color: '#a855f7' }} />
                        Configuration Profiles
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Device configuration profiles and deployment status
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Configuration Profiles</h2>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            {filteredProfiles.length} PROFILES
                        </span>
                    </div>

                    {filteredProfiles.length > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Profile Name</th>
                                        <th>Description</th>
                                        <th>Created</th>
                                        <th>Last Modified</th>
                                        <th>Assignments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProfiles.map((profile, i) => (
                                        <tr key={i} className={styles.tableRow}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Settings style={{ width: '1.25rem', height: '1.25rem', color: '#a855f7' }} />
                                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{profile.displayName}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{profile.description || 'No description'}</td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                {profile.createdDateTime ? new Date(profile.createdDateTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                {profile.lastModifiedDateTime ? new Date(profile.lastModifiedDateTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                    {profile.assignments ? profile.assignments.length : 0} groups
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Settings style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Configuration Profiles</h3>
                            <p className={styles.emptyDescription}>
                                No configuration profiles found or no profiles match your search.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneConfigProfiles;
