import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, Users, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneUserDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDevices, setUserDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const response = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: accounts[0]
                });
                const client = new GraphService(response.accessToken).client;
                const fetchedUsers = await IntuneService.getUsers(client);
                setUsers(fetchedUsers);
                setSearchResults(fetchedUsers);
            } catch (error) {
                console.error("Users fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (accounts.length > 0) {
            fetchUsers();
        }
    }, [accounts, instance]);

    const handleSearch = async () => {
        if (!searchText) {
            setSearchResults(users);
            return;
        }

        setLoading(true);
        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });
            const client = new GraphService(response.accessToken).client;
            const results = await IntuneService.searchUsers(client, searchText);
            setSearchResults(results);
        } catch (error) {
            console.error("User search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = async (user) => {
        setSelectedUser(user);
        setLoadingDevices(true);
        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });
            const client = new GraphService(response.accessToken).client;
            const devices = await IntuneService.getUserDevices(client, user.userPrincipalName);
            setUserDevices(devices);
        } catch (error) {
            console.error("User devices fetch error:", error);
        } finally {
            setLoadingDevices(false);
        }
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
                        <Users style={{ width: '2rem', height: '2rem', color: '#14b8a6' }} />
                        User → Devices View
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Search for a user and view all their assigned devices
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                    <button onClick={handleSearch} className={`${styles.actionButton} ${styles.actionButtonPrimary}`} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" style={{ width: '1rem', height: '1rem' }} /> : <Search style={{ width: '1rem', height: '1rem' }} />}
                        Search
                    </button>
                </div>

                {!selectedUser && (
                    <div className={styles.card} style={{ marginBottom: '2rem' }}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>{searchText ? 'Search Results' : 'All Users'}</h2>
                            <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                {searchResults.length} USERS
                            </span>
                        </div>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Display Name</th>
                                        <th>User Principal Name</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {searchResults.map((user, i) => (
                                        <tr key={i} className={styles.tableRow}>
                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.displayName}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user.userPrincipalName}</td>
                                            <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>{user.mail || 'N/A'}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleUserSelect(user)}
                                                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                                >
                                                    View Devices
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedUser && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.cardTitle}>{selectedUser.displayName}'s Devices</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{selectedUser.userPrincipalName}</p>
                            </div>
                            <button
                                onClick={() => { setSelectedUser(null); setUserDevices([]); }}
                                className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                            >
                                Clear
                            </button>
                        </div>

                        {loadingDevices ? (
                            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
                                <Loader3D scale={0.6} />
                            </div>
                        ) : userDevices.length > 0 ? (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead className={styles.tableHead}>
                                        <tr>
                                            <th>Device Name</th>
                                            <th>Operating System</th>
                                            <th>OS Version</th>
                                            <th>Compliance</th>
                                            <th>Last Sync</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userDevices.map((device, i) => (
                                            <tr key={i} className={styles.tableRow}>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{device.deviceName}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{device.operatingSystem}</td>
                                                <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>{device.osVersion}</td>
                                                <td>
                                                    {device.complianceState === 'compliant' ? (
                                                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                            <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem' }} />
                                                            Compliant
                                                        </span>
                                                    ) : (
                                                        <span className={`${styles.badge} ${styles.badgeError}`}>
                                                            <XCircle style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem' }} />
                                                            Non-Compliant
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                    {device.lastSyncDateTime ? new Date(device.lastSyncDateTime).toLocaleString() : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>
                                    <Users style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                                </div>
                                <h3 className={styles.emptyTitle}>No Devices Found</h3>
                                <p className={styles.emptyDescription}>
                                    This user has no enrolled devices.
                                </p>
                            </div>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
};

export default IntuneUserDevices;
