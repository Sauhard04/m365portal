import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { UsersService } from '../services/entra';
import { ArrowLeft, Search, Download, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react';

const EntraUsers = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLicense, setFilterLicense] = useState('all');

    useEffect(() => {
        const fetchUsers = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const client = new GraphService(response.accessToken).client;
                    const data = await UsersService.getAllUsers(client, 100);
                    setUsers(data);
                } catch (error) {
                    console.error("User fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchUsers();
    }, [accounts, instance]);

    const filteredUsers = users.filter(user => {
        const matchesText = (user.displayName || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (user.userPrincipalName || '').toLowerCase().includes(filterText.toLowerCase());
        const matchesType = filterType === 'all' || (filterType === 'guest' ? user.userType === 'Guest' : user.userType !== 'Guest');
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'enabled' ? user.accountEnabled : !user.accountEnabled);
        const isLicensed = user.assignedLicenses && user.assignedLicenses.length > 0;
        const matchesLicense = filterLicense === 'all' || (filterLicense === 'licensed' ? isLicensed : !isLicensed);
        return matchesText && matchesType && matchesStatus && matchesLicense;
    });

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'User Principal Name', 'User Type', 'Account Enabled', 'Licensed'];
        const rows = filteredUsers.map(u => [
            `"${u.displayName}"`, `"${u.userPrincipalName}"`, `"${u.userType || 'Member'}"`, u.accountEnabled, (u.assignedLicenses && u.assignedLicenses.length > 0) ? 'Yes' : 'No'
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_users.csv';
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
            <button onClick={() => navigate('/service/entra')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Microsoft Entra Users</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Identity management and access control directory</p>
                </div>
                <button className="btn btn-primary" onClick={handleDownloadCSV}>
                    <Download size={16} />
                    Export Users
                </button>
            </header>

            <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="search-wrapper">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search by name or email..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                    <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="member">Members</option>
                        <option value="guest">Guests</option>
                    </select>
                    <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="enabled">Enabled Only</option>
                        <option value="disabled">Disabled Only</option>
                    </select>
                    <select className="input" value={filterLicense} onChange={(e) => setFilterLicense(e.target.value)}>
                        <option value="all">All Licenses</option>
                        <option value="licensed">Licensed</option>
                        <option value="unlicensed">Unlicensed</option>
                    </select>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Display Name</th>
                                <th>UPN / Email</th>
                                <th>User Type</th>
                                <th>Status</th>
                                <th>License</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: 'hsla(var(--hue), 90%, 60%, 0.1)',
                                                color: 'var(--accent-blue)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                border: '1px solid hsla(var(--hue), 90%, 60%, 0.2)'
                                            }}>
                                                {user.displayName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.displayName}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>{user.userPrincipalName}</td>
                                    <td>
                                        <span className={`badge ${user.userType === 'Guest' ? 'badge-info' : ''}`} style={{ opacity: user.userType === 'Guest' ? 1 : 0.6 }}>
                                            {user.userType || 'Member'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.accountEnabled ? 'badge-success' : 'badge-error'}`}>
                                            {user.accountEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.assignedLicenses?.length > 0 ? 'badge-info' : ''}`} style={{ opacity: user.assignedLicenses?.length > 0 ? 1 : 0.4 }}>
                                            {user.assignedLicenses?.length > 0 ? 'Licensed' : 'No License'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Users size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No users found matching your filters.</p>
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

export default EntraUsers;
