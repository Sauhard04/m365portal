import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, AlertCircle, Loader2, Shield, ArrowLeft, Mail, Search } from 'lucide-react';

const ExchangeReport = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [reportData, setReportData] = useState([]);
    const [filterText, setFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isConcealed, setIsConcealed] = useState(false);

    // Filter states
    const [archiveFilter, setArchiveFilter] = useState('all');
    const [migrationFilter, setMigrationFilter] = useState('all');



    const filteredData = reportData.filter(item => {
        if (filterText) {
            const searchStr = filterText.toLowerCase();
            const name = item.displayName?.toLowerCase() || '';
            const email = item.emailAddress?.toLowerCase() || '';
            if (!name.includes(searchStr) && !email.includes(searchStr)) return false;
        }
        if (archiveFilter === 'enabled' && !item.archivePolicy) return false;
        if (archiveFilter === 'disabled' && item.archivePolicy) return false;
        if (migrationFilter === 'migrated' && item.migrationStatus !== 'Migrated') return false;
        if (migrationFilter === 'not-migrated' && item.migrationStatus === 'Migrated') return false;
        return true;
    });

    const handleDownloadCSV = () => {
        if (filteredData.length === 0) return;

        // Comprehensive headers with all API fields
        const headers = [
            'Display Name',
            'User Principal Name',
            'Email Address',
            'Job Title',
            'Department',
            'Office Location',
            'City',
            'Country',
            'Account Enabled',
            'Created Date',
            'Last Activity Date',
            'Item Count',
            'Archive Policy',
            'Mailbox Size',
            'Data Migrated',
            'Migration Status'
        ];

        // Map all data fields
        const csvContent = [
            headers.join(','),
            ...filteredData.map(r => [
                `"${r.displayName || ''}"`,
                `"${r.userPrincipalName || ''}"`,
                `"${r.emailAddress || ''}"`,
                `"${r.jobTitle || ''}"`,
                `"${r.department || ''}"`,
                `"${r.officeLocation || ''}"`,
                `"${r.city || ''}"`,
                `"${r.country || ''}"`,
                `"${r.accountEnabled || 'N/A'}"`,
                `"${r.createdDateTime || 'N/A'}"`,
                `"${r.lastActivityDate || 'N/A'}"`,
                `"${r.itemCount || 0}"`,
                `"${r.archivePolicy ? 'Enabled' : 'Disabled'}"`,
                `"${r.mailboxSize || '0 KB'}"`,
                `"${r.dataMigrated || '0 GB'}"`,
                `"${r.migrationStatus || 'N/A'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exchange_mailbox_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length === 0) return;
            const res = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const graph = new GraphService(res.accessToken);
            const data = await graph.getExchangeMailboxReport();
            setReportData(data.reports || []);
            setIsConcealed(data.isConcealed);
        } catch (err) {
            setError("Failed to fetch operational data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Admin Center
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Exchange Operational Report</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Real-time mailbox configuration and activity telemetry</p>
                </div>
                <div className="flex-gap-4">
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={fetchData} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadCSV}>
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {isConcealed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass-card" style={{ background: 'hsla(38, 92%, 50%, 0.05)', borderColor: 'hsla(38, 92%, 50%, 0.3)', marginBottom: '32px' }}>
                        <div className="flex flex-gap-4">
                            <Shield size={32} color="var(--accent-warning)" />
                            <div>
                                <h4 style={{ color: 'var(--accent-warning)', marginBottom: '8px' }}>M365 Privacy Restriction Found</h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Tenant-level privacy settings are active. User identities are currently concealed. Disable "Conceal user, group, and site names" in M365 Org Settings to see individual data.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="flex-between flex-gap-4">
                    <div className="search-wrapper">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search mailbox by identity..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                    <div className="flex-gap-4">
                        <select className="input" value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value)} style={{ width: '180px' }}>
                            <option value="all">Archive Filter</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                        </select>
                        <select className="input" value={migrationFilter} onChange={(e) => setMigrationFilter(e.target.value)} style={{ width: '180px' }}>
                            <option value="all">Migration Status</option>
                            <option value="migrated">Migrated</option>
                            <option value="not-migrated">On-Premises</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>

                                <th>Display Name</th>
                                <th>Primary Email Address</th>
                                <th>Archive Status</th>
                                <th>Mailbox Size</th>
                                <th>Account Created</th>
                                <th>Account Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px' }}>
                                        <Loader2 className="animate-spin" size={32} color="var(--accent-blue)" />
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? filteredData.map((mb, i) => (
                                <tr key={i}>

                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mb.displayName}</td>
                                    <td style={{ fontSize: '12px', opacity: 0.8 }}>{mb.emailAddress}</td>
                                    <td>
                                        <span className={`badge ${mb.archivePolicy ? 'badge-success' : 'badge-info'}`}>
                                            {mb.archivePolicy ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>{mb.mailboxSize || '0 KB'}</td>
                                    <td style={{ fontSize: '12px', opacity: 0.8 }}>
                                        {mb.createdDateTime ? new Date(mb.createdDateTime).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td>
                                        <span className={`badge ${mb.accountEnabled === 'Yes' ? 'badge-success' : 'badge-error'}`}>
                                            {mb.accountEnabled === 'Yes' ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Mail size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No mailbox data available for current selection.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>



            <style dangerouslySetInnerHTML={{
                __html: `
                .active-row td { background: hsla(217, 91%, 60%, 0.05) !important; }
                .bulk-action-bar {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 800px;
                    background: hsla(0, 0%, 5%, 0.9);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--accent-blue);
                    padding: 20px 30px;
                    border-radius: 20px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    z-index: 2000;
                }
                .active-row { border-left: 4px solid var(--accent-blue) !; }
            `}} />
        </div>
    );
};

export default ExchangeReport;
