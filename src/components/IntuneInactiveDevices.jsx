import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, Download, Clock, Loader2 } from 'lucide-react';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneInactiveDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [inactiveDays, setInactiveDays] = useState(30);

    useEffect(() => {
        const fetchDevices = async () => {
            if (accounts.length > 0) {
                try {
                    setLoading(true);
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await IntuneService.getInactiveDevices(client, inactiveDays, 100);
                    setDevices(data);
                } catch (error) {
                    console.error("Inactive device fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDevices();
    }, [accounts, instance, inactiveDays]);

    const filteredDevices = devices.filter(device =>
        (device.deviceName || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (device.userPrincipalName || '').toLowerCase().includes(filterText.toLowerCase())
    );

    const handleDownloadCSV = () => {
        const headers = ['Device Name', 'OS', 'User', 'Last Sync', 'Days Inactive'];
        const rows = filteredDevices.map(d => {
            const lastSync = d.lastSyncDateTime ? new Date(d.lastSyncDateTime) : null;
            const daysInactive = lastSync ? Math.floor((new Date() - lastSync) / (1000 * 60 * 60 * 24)) : 'N/A';
            return [
                `"${d.deviceName}"`,
                `"${d.operatingSystem}"`,
                `"${d.userPrincipalName}"`,
                lastSync ? lastSync.toLocaleString() : 'Never',
                daysInactive
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'inactive_devices.csv';
        link.click();
    };

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
                        <Clock style={{ width: '2rem', height: '2rem', color: '#f97316' }} />
                        Inactive / Stale Devices
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Devices that haven't synced within the specified timeframe
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <select value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value))} className={styles.filterInput} style={{ flex: 'initial', minWidth: '150px' }}>
                        <option value={30}>Inactive &gt; 30 days</option>
                        <option value={60}>Inactive &gt; 60 days</option>
                        <option value={90}>Inactive &gt; 90 days</option>
                    </select>

                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search inactive devices..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className={styles.filterInput}
                            style={{ paddingLeft: '2.75rem' }}
                        />
                    </div>
                    <button onClick={handleDownloadCSV} className={`${styles.actionButton} ${styles.actionButtonSecondary}`}>
                        <Download style={{ width: '1rem', height: '1rem' }} />
                        Export
                    </button>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Inactive Devices</h2>
                        <span className={`${styles.badge} ${styles.badgeWarning}`}>
                            {filteredDevices.length} DEVICES
                        </span>
                    </div>

                    {filteredDevices.length > 0 ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Device Name</th>
                                        <th>Operating System</th>
                                        <th>User</th>
                                        <th>Last Sync</th>
                                        <th>Days Inactive</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.map((device, i) => {
                                        const lastSync = device.lastSyncDateTime ? new Date(device.lastSyncDateTime) : null;
                                        const daysInactive = lastSync ? Math.floor((new Date() - lastSync) / (1000 * 60 * 60 * 24)) : 'N/A';
                                        return (
                                            <tr key={i} className={styles.tableRow}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#f97316' }} />
                                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{device.deviceName || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{device.operatingSystem}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{device.userPrincipalName || 'N/A'}</td>
                                                <td style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                                                    {lastSync ? lastSync.toLocaleString() : 'Never'}
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${daysInactive > 90 ? styles.badgeError : styles.badgeWarning}`}>
                                                        {daysInactive} days
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Clock style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Inactive Devices</h3>
                            <p className={styles.emptyDescription}>
                                All devices have synced recently or no devices match your search.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneInactiveDevices;
