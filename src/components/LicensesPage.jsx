import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Loader2, ArrowLeft, Download, AlertCircle, CreditCard, TrendingUp, Search } from 'lucide-react';

const LicensesPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [licensingSummary, setLicensingSummary] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length === 0) return;
            setLoading(true);
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);
                const { skus, users } = await graphService.getLicensingData();
                setLicensingSummary(skus || []);

                const skuMap = new Map();
                (skus || []).forEach(sku => skuMap.set(sku.skuId, sku.skuPartNumber));

                const processedUsers = (users || []).map(user => ({
                    displayName: user.displayName,
                    emailAddress: user.userPrincipalName,
                    licenses: user.assignedLicenses.map(l => skuMap.get(l.skuId) || 'Unknown SKU').join(', ') || 'No License',
                    licenseCount: user.assignedLicenses.length
                }));
                setReportData(processedUsers);
            } catch (err) {
                setError("Tenant licensing data could not be synchronized.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [instance, accounts]);

    const filteredData = reportData.filter(item => {
        if (!filterText) return true;
        const searchStr = filterText.toLowerCase();
        return item.displayName?.toLowerCase().includes(searchStr) || item.emailAddress?.toLowerCase().includes(searchStr);
    });

    const handleDownloadCSV = () => {
        if (filteredData.length === 0) return;
        const headers = ['Display Name', 'Email / UPN', 'Assigned Licenses', 'Count'];
        const csvRows = [headers.join(','), ...filteredData.map(row => [
            `"${row.displayName}"`, `"${row.emailAddress}"`, `"${row.licenses}"`, `"${row.licenseCount}"`
        ].join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'licensing_report.csv';
        link.click();
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Licensing & Inventory</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Tenant subscription management and individual license attribution</p>
                </div>
                <button className="btn btn-primary" onClick={handleDownloadCSV}>
                    <Download size={16} />
                    Export Audit
                </button>
            </header>

            {licensingSummary.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h3 className="spacing-v-8" style={{ fontSize: '18px', opacity: 0.8 }}>Subscribed SKU Breakdown</h3>
                    <div className="stat-grid">
                        {licensingSummary.map((sku, i) => {
                            const percentage = Math.min((sku.consumedUnits / (sku.prepaidUnits?.enabled || 1)) * 100, 100);
                            return (
                                <div key={i} className="glass-card stat-card" style={{ padding: '24px' }}>
                                    <div className="flex-between spacing-v-4">
                                        <span className="stat-label" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sku.skuPartNumber}</span>
                                        <CreditCard size={18} color="var(--accent-blue)" />
                                    </div>
                                    <div className="flex-between">
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Assigned</div>
                                            <div className="stat-value" style={{ fontSize: '24px' }}>{sku.consumedUnits}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Available</div>
                                            <div className="stat-value" style={{ fontSize: '24px' }}>{sku.prepaidUnits?.enabled || 0}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4" style={{ height: '4px', background: 'hsla(0,0%,100%,0.05)', borderRadius: '10px', overflow: 'hidden', marginTop: '16px' }}>
                                        <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--accent-blue)', boxShadow: '0 0 10px var(--accent-blue-glow)' }}></div>
                                    </div>
                                    <div className="flex-between mt-2" style={{ marginTop: '8px' }}>
                                        <span className="badge badge-info" style={{ fontSize: '9px' }}>{Math.round(percentage)}% Usage</span>
                                        <TrendingUp size={12} color="var(--text-dim)" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px' }}>Direct User Assignments</h3>
                    <div className="search-wrapper" style={{ maxWidth: '350px' }}>
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Find user by identity..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Display Name</th>
                                <th>User Principal Name</th>
                                <th>Active Entitlements</th>
                                <th style={{ textAlign: 'center' }}>Seat Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? filteredData.map((report, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{report.displayName}</td>
                                    <td style={{ fontSize: '12px', opacity: 0.8 }}>{report.emailAddress}</td>
                                    <td style={{ fontSize: '12px' }}>
                                        {report.licenses !== 'No License' ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {report.licenses.split(', ').map((l, idx) => (
                                                    <span key={idx} className="badge badge-info" style={{ textTransform: 'none' }}>{l}</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.4 }}>Unlicensed</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${report.licenseCount > 0 ? 'badge-success' : ''}`}>
                                            {report.licenseCount}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <CreditCard size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No license assignments found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LicensesPage;
