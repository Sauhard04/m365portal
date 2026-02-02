import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, Shield, Loader2 } from 'lucide-react';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneCompliancePolicies = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchPolicies = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await IntuneService.getCompliancePolicies(client);
                    setPolicies(data);
                } catch (error) {
                    console.error("Compliance policy fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchPolicies();
    }, [accounts, instance]);

    const filteredPolicies = policies.filter(policy =>
        (policy.displayName || '').toLowerCase().includes(filterText.toLowerCase())
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
                        <Shield style={{ width: '2rem', height: '2rem', color: '#22c55e' }} />
                        Compliance Policies
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Device compliance policies and their assignment status
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search policies..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Compliance Policies</h2>
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                            {filteredPolicies.length} POLICIES
                        </span>
                    </div>

                    {filteredPolicies.length > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Policy Name</th>
                                        <th>Description</th>
                                        <th>Created</th>
                                        <th>Last Modified</th>
                                        <th>Assignments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPolicies.map((policy, i) => (
                                        <tr key={i} className={styles.tableRow}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Shield style={{ width: '1.25rem', height: '1.25rem', color: '#22c55e' }} />
                                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{policy.displayName}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{policy.description || 'No description'}</td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                {policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                {policy.lastModifiedDateTime ? new Date(policy.lastModifiedDateTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                    {policy.assignments ? policy.assignments.length : 0} groups
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
                                <Shield style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Compliance Policies</h3>
                            <p className={styles.emptyDescription}>
                                No compliance policies found or no policies match your search.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneCompliancePolicies;
