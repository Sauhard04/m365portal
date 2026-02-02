import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, Search, Download, CheckCircle2, XCircle, Loader2, Smartphone, Monitor } from 'lucide-react';
import Loader3D from './Loader3D';
import styles from './DetailPage.module.css';

const IntuneManagedDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterOS, setFilterOS] = useState('all');
    const [filterCompliance, setFilterCompliance] = useState('all');
    const [filterOwnership, setFilterOwnership] = useState('all');

    useEffect(() => {
        const fetchDevices = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await IntuneService.getManagedDevices(client, 100);
                    setDevices(data);

                    // Background store for AI context
                    const SiteDataStore = (await import('../services/siteDataStore')).default;
                    SiteDataStore.store('intuneDevices', data);
                } catch (error) {
                    console.error("Device fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDevices();
    }, [accounts, instance]);

    const filteredDevices = devices.filter(device => {
        const matchesText = (device.deviceName || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (device.userPrincipalName || '').toLowerCase().includes(filterText.toLowerCase());

        const matchesOS = filterOS === 'all' || device.operatingSystem === filterOS;
        const matchesCompliance = filterCompliance === 'all' || device.complianceState === filterCompliance;
        const matchesOwnership = filterOwnership === 'all' || device.managedDeviceOwnerType === filterOwnership;

        return matchesText && matchesOS && matchesCompliance && matchesOwnership;
    });

    const handleDownloadCSV = () => {
        const headers = ['Device Name', 'OS', 'OS Version', 'Compliance', 'Ownership', 'User', 'Last Sync'];
        const rows = filteredDevices.map(d => [
            `"${d.deviceName}"`,
            `"${d.operatingSystem}"`,
            `"${d.osVersion}"`,
            `"${d.complianceState}"`,
            `"${d.managedDeviceOwnerType}"`,
            `"${d.userPrincipalName}"`,
            d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString() : 'Never'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'intune_managed_devices.csv';
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
                        <Smartphone style={{ width: '2rem', height: '2rem', color: '#3b82f6' }} />
                        All Managed Devices
                    </h1>
                    <p className={styles.pageSubtitle}>
                        View and manage all devices enrolled in Microsoft Intune
                    </p>
                </div>

                <div className={styles.filterBar}>
                    <select value={filterOS} onChange={(e) => setFilterOS(e.target.value)} className={styles.filterInput} style={{ flex: 'initial', minWidth: '150px' }}>
                        <option value="all">All OS</option>
                        <option value="Windows">Windows</option>
                        <option value="iOS">iOS</option>
                        <option value="Android">Android</option>
                        <option value="macOS">macOS</option>
                    </select>
                    <select value={filterCompliance} onChange={(e) => setFilterCompliance(e.target.value)} className={styles.filterInput} style={{ flex: 'initial', minWidth: '150px' }}>
                        <option value="all">All Compliance</option>
                        <option value="compliant">Compliant</option>
                        <option value="noncompliant">Non-Compliant</option>
                        <option value="unknown">Unknown</option>
                    </select>
                    <select value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)} className={styles.filterInput} style={{ flex: 'initial', minWidth: '150px' }}>
                        <option value="all">All Ownership</option>
                        <option value="company">Corporate</option>
                        <option value="personal">Personal</option>
                    </select>

                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#6b7280' }} />
                        <input
                            type="text"
                            placeholder="Search devices or users..."
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
                        <h2 className={styles.cardTitle}>Device Inventory</h2>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>
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
                                        <th>Compliance</th>
                                        <th>Ownership</th>
                                        <th>User</th>
                                        <th>Last Sync</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.map((device, i) => (
                                        <tr key={i} className={styles.tableRow}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'var(--glass-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Monitor style={{ width: '1rem', height: '1rem', color: 'var(--accent-blue)' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{device.deviceName || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                {device.operatingSystem} {device.osVersion}
                                            </td>
                                            <td>
                                                {device.complianceState === 'compliant' ? (
                                                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                        <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem' }} />
                                                        Compliant
                                                    </span>
                                                ) : device.complianceState === 'noncompliant' ? (
                                                    <span className={`${styles.badge} ${styles.badgeError}`}>
                                                        <XCircle style={{ width: '0.875rem', height: '0.875rem', marginRight: '0.375rem' }} />
                                                        Non-Compliant
                                                    </span>
                                                ) : (
                                                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>Unknown</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${device.managedDeviceOwnerType === 'company' ? styles.badgeInfo : styles.badgeNeutral}`}>
                                                    {device.managedDeviceOwnerType === 'company' ? 'Corporate' : device.managedDeviceOwnerType === 'personal' ? 'Personal' : 'Unknown'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{device.userPrincipalName || 'N/A'}</td>
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
                                <Smartphone style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Devices Found</h3>
                            <p className={styles.emptyDescription}>
                                No managed devices match your current filters. Try adjusting your search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneManagedDevices;
