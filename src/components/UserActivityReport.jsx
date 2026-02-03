import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { UsageService } from '../services/usage.service';
import Loader3D from './Loader3D';
import {
    Users, Search, Download, Filter, ArrowLeft, RefreshCw,
    Mail, MessageSquare, Globe, Cloud, Calendar, ChevronDown,
    ChevronUp, ExternalLink, Activity, CheckCircle2, Clock, AlertTriangle,
    Zap, TrendingUp, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserActivityReport = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'displayName', direction: 'asc' });
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, highlyEngaged: 0 });

    const fetchActivityData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const account = accounts[0];
            if (!account) return;

            const tokenResponse = await instance.acquireTokenSilent({
                scopes: ["Reports.Read.All", "User.Read.All"],
                account
            });

            const usageService = new UsageService(tokenResponse.accessToken);
            // Using the unified report endpoint which covers multiple services
            const data = await usageService.getOffice365ActiveUserDetail('D7');

            if (data) {
                const mappedUsers = data.map(item => {
                    const teams = item.teamsLastActivityDate || item.userLastActivityDate;
                    const exchange = item.exchangeLastActivityDate || item.userLastActivityDate;
                    const sharePoint = item.sharePointLastActivityDate || item.userLastActivityDate;
                    const oneDrive = item.oneDriveLastActivityDate || item.userLastActivityDate;

                    // Calculate overall last active by taking the most recent of all
                    const dates = [teams, exchange, sharePoint, oneDrive, item.lastActivityDate]
                        .filter(d => d && d !== '' && d !== 'null')
                        .map(d => new Date(d).getTime());

                    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

                    return {
                        upn: item.userPrincipalName,
                        displayName: item.displayName || item.userPrincipalName?.split('@')[0],
                        teamsDate: teams,
                        exchangeDate: exchange,
                        sharePointDate: sharePoint,
                        oneDriveDate: oneDrive,
                        lastActivityDate: maxDate,
                        licenses: {
                            teams: item.hasTeamsLicense ?? true,
                            exchange: item.hasExchangeLicense ?? true,
                            sharePoint: item.hasSharePointLicense ?? true,
                            oneDrive: item.hasOneDriveLicense ?? true
                        }
                    };
                });
                // Sort by default
                const sorted = [...mappedUsers].sort((a, b) => {
                    const dateA = a.lastActivityDate ? new Date(a.lastActivityDate) : new Date(0);
                    const dateB = b.lastActivityDate ? new Date(b.lastActivityDate) : new Date(0);
                    return dateB - dateA;
                });
                setUsers(sorted);
                setFilteredUsers(sorted);
                setLastRefreshed(new Date());

                // Calculate summary stats
                const now = new Date();
                const active7d = sorted.filter(u => u.lastActivityDate && (now - new Date(u.lastActivityDate)) <= 7 * 24 * 60 * 60 * 1000).length;
                const highlyEngaged = sorted.filter(u => {
                    const activeCount = [u.teamsDate, u.exchangeDate, u.sharePointDate, u.oneDriveDate].filter(d => d).length;
                    return activeCount >= 3;
                }).length;

                setStats({
                    total: sorted.length,
                    active: active7d,
                    inactive: sorted.length - active7d,
                    highlyEngaged
                });
            }
        } catch (err) {
            console.error('Failed to fetch user activity:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActivityData();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = [...users];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                u.displayName?.toLowerCase().includes(term) ||
                u.upn?.toLowerCase().includes(term)
            );
        }

        setFilteredUsers(filtered);
    }, [users, searchTerm]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sorted = [...filteredUsers].sort((a, b) => {
            let valA = a[key];
            let valB = b[key];

            // Handle date sorting
            if (key.endsWith('Date')) {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredUsers(sorted);
    };

    const getStatusIcon = (date) => {
        if (!date) return <Clock size={14} className="status-never" />;
        const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
        if (days <= 2) return <CheckCircle2 size={14} className="status-active" />;
        if (days <= 7) return <Activity size={14} className="status-recent" />;
        return <AlertTriangle size={14} className="status-inactive" />;
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const downloadCSV = () => {
        const headers = ['Display Name', 'UPN', 'Exchange', 'Teams', 'SharePoint', 'OneDrive', 'Overall Last Active'];
        const rows = filteredUsers.map(u => [
            u.displayName,
            u.upn,
            u.exchangeDate || 'Never',
            u.teamsDate || 'Never',
            u.sharePointDate || 'Never',
            u.oneDriveDate || 'Never',
            u.lastActivityDate || 'Never'
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `User_Activity_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Aggregating user activity..." />;
    }

    return (
        <div className="page-container animate-in">
            {/* Header */}
            <div className="flex-between spacing-v-8">
                <div className="header-left">
                    <button className="btn-back" onClick={() => navigate('/service/admin')} style={{ marginBottom: 0 }}>
                        <ArrowLeft size={16} />
                        Admin Center
                    </button>
                    <div style={{ marginLeft: '16px' }}>
                        <h1 className="title-gradient" style={{ fontSize: '32px', margin: 0 }}>Cross-Service Activity</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>User engagement across Microsoft 365 workloads</p>
                    </div>
                </div>
                <div className="flex-gap-2">
                    <button onClick={() => fetchActivityData(true)} disabled={refreshing} className={`sync-btn ${refreshing ? 'spinning' : ''}`} title="Refresh Data">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={downloadCSV} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid spacing-v-8">
                <div className="glass-card stat-item-matrix">
                    <div className="stat-icon-wrap blue"><Users size={20} /></div>
                    <div className="stat-text">
                        <div className="stat-val-matrix">{stats.total}</div>
                        <div className="stat-lbl-matrix">Total Users</div>
                    </div>
                </div>
                <div className="glass-card stat-item-matrix">
                    <div className="stat-icon-wrap green"><CheckCircle2 size={20} /></div>
                    <div className="stat-text">
                        <div className="stat-val-matrix">{stats.active}</div>
                        <div className="stat-lbl-matrix">Active (7D)</div>
                    </div>
                </div>
                <div className="glass-card stat-item-matrix">
                    <div className="stat-icon-wrap purple"><Zap size={20} /></div>
                    <div className="stat-text">
                        <div className="stat-val-matrix">{stats.highlyEngaged}</div>
                        <div className="stat-lbl-matrix">Highly Engaged</div>
                    </div>
                </div>
                <div className="glass-card stat-item-matrix">
                    <div className="stat-icon-wrap amber"><Clock size={20} /></div>
                    <div className="stat-text">
                        <div className="stat-val-matrix">{stats.inactive}</div>
                        <div className="stat-lbl-matrix">Inactive Users</div>
                    </div>
                </div>
            </div>

            {/* Matrix Filters */}
            <div className="matrix-filters spacing-v-8">
                <div className="glass-card filters-card">
                    <div className="search-box-premium">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Activity Matrix Table */}
            <div className="matrix-container glass-card">
                <div className="table-wrapper">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('displayName')} className="sortable">
                                    User {sortConfig.key === 'displayName' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                                <th onClick={() => handleSort('exchangeDate')} className="sortable">
                                    <div className="header-icon-cell"><Mail size={14} color="#0078d4" /> Exchange</div>
                                    {sortConfig.key === 'exchangeDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                                <th onClick={() => handleSort('teamsDate')} className="sortable">
                                    <div className="header-icon-cell"><MessageSquare size={14} color="#6264a7" /> Teams</div>
                                    {sortConfig.key === 'teamsDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                                <th onClick={() => handleSort('sharePointDate')} className="sortable">
                                    <div className="header-icon-cell"><Globe size={14} color="#0078d4" /> SharePoint</div>
                                    {sortConfig.key === 'sharePointDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                                <th onClick={() => handleSort('oneDriveDate')} className="sortable">
                                    <div className="header-icon-cell"><Cloud size={14} color="#0078d4" /> OneDrive</div>
                                    {sortConfig.key === 'oneDriveDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                                <th onClick={() => handleSort('lastActivityDate')} className="sortable">
                                    Overall Last Active
                                    {sortConfig.key === 'lastActivityDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user, idx) => (
                                    <motion.tr
                                        key={user.upn}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                    >
                                        <td>
                                            <div className="user-info-cell">
                                                <div className="user-avatar-glow">{user.displayName.charAt(0)}</div>
                                                <div className="user-text">
                                                    <span className="user-name">{user.displayName}</span>
                                                    <span className="user-upn">{user.upn}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="activity-cell">
                                            <div className="status-wrap" title={user.exchangeDate ? `Last Active: ${new Date(user.exchangeDate).toLocaleString()}` : 'Never Active'}>
                                                {getStatusIcon(user.exchangeDate)}
                                                <span>{formatDate(user.exchangeDate)}</span>
                                            </div>
                                            {!user.licenses.exchange && <div className="no-license-indicator" title="No Exchange License"><Mail size={12} /></div>}
                                        </td>
                                        <td className="activity-cell">
                                            <div className="status-wrap" title={user.teamsDate ? `Last Active: ${new Date(user.teamsDate).toLocaleString()}` : 'Never Active'}>
                                                {getStatusIcon(user.teamsDate)}
                                                <span>{formatDate(user.teamsDate)}</span>
                                            </div>
                                            {!user.licenses.teams && <div className="no-license-indicator" title="No Teams License"><MessageSquare size={12} /></div>}
                                        </td>
                                        <td className="activity-cell">
                                            <div className="status-wrap" title={user.sharePointDate ? `Last Active: ${new Date(user.sharePointDate).toLocaleString()}` : 'Never Active'}>
                                                {getStatusIcon(user.sharePointDate)}
                                                <span>{formatDate(user.sharePointDate)}</span>
                                            </div>
                                            {!user.licenses.sharePoint && <div className="no-license-indicator" title="No SharePoint License"><Globe size={12} /></div>}
                                        </td>
                                        <td className="activity-cell">
                                            <div className="status-wrap" title={user.oneDriveDate ? `Last Active: ${new Date(user.oneDriveDate).toLocaleString()}` : 'Never Active'}>
                                                {getStatusIcon(user.oneDriveDate)}
                                                <span>{formatDate(user.oneDriveDate)}</span>
                                            </div>
                                            {!user.licenses.oneDrive && <div className="no-license-indicator" title="No OneDrive License"><Cloud size={12} /></div>}
                                        </td>
                                        <td>
                                            <div className="overall-activity">
                                                <Calendar size={14} style={{ opacity: 0.5 }} />
                                                <span>{formatDate(user.lastActivityDate)}</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <div className="no-data-matrix">
                                            <Users size={48} />
                                            <h3>No Users Found</h3>
                                            <p>Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="matrix-legend">
                    <div className="legend-item"><CheckCircle2 size={12} className="status-active" /> <span>Active (Today/Yesterday)</span></div>
                    <div className="legend-item"><Activity size={12} className="status-recent" /> <span>Recent (Last 7 Days)</span></div>
                    <div className="legend-item"><AlertTriangle size={12} className="status-inactive" /> <span>Inactive ({`>7`} Days)</span></div>
                    <div className="legend-item"><Clock size={12} className="status-never" /> <span>Never Active</span></div>
                </div>
            </div>

            <style>{`
                .matrix-filters { width: 100%; }
                .filters-card { display: flex; gap: 24px; padding: 24px; border-radius: 16px; align-items: center; position: relative; }
                .search-box-premium {
                    flex: 1; display: flex; align-items: center; gap: 12px; padding: 14px 20px;
                    background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border);
                }
                .search-box-premium input { background: none; border: none; color: var(--text-primary); outline: none; width: 100%; font-size: 14px; }
                
                .stat-item-matrix { display: flex; align-items: center; gap: 15px; padding: 18px 24px; }
                .stat-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); }
                .stat-icon-wrap.blue { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
                .stat-icon-wrap.green { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
                .stat-icon-wrap.purple { color: #a855f7; background: rgba(168, 85, 247, 0.1); }
                .stat-icon-wrap.amber { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
                .stat-val-matrix { font-size: 24px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
                .stat-lbl-matrix { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }

                .matrix-container { padding: 0; border-radius: 20px; overflow: hidden; position: relative; border: 1px solid var(--glass-border); }
                .matrix-container::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to top, rgba(0,0,0,0.2), transparent); pointer-events: none; }
                .table-wrapper { overflow-x: auto; max-height: 600px; overflow-y: auto; }
                .matrix-table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--glass-bg); }
                .matrix-table th {
                    text-align: left; padding: 20px; background: var(--bg-light);
                    color: var(--text-tertiary); font-size: 11px; font-weight: 700; text-transform: uppercase;
                    border-bottom: 1px solid var(--glass-border); position: sticky; top: 0; z-index: 10;
                }
                .matrix-table th.sortable { cursor: pointer; }
                .matrix-table th.sortable:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
                .header-icon-cell { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
                .matrix-table td { padding: 16px 20px; border-bottom: 1px solid var(--glass-border); vertical-align: middle; background: rgba(255,255,255,0.01); }
                .matrix-table tr:hover td { background: var(--glass-bg-hover); }
                
                .user-info-cell { display: flex; align-items: center; gap: 12px; }
                .user-avatar-glow {
                    width: 32px; height: 32px; border-radius: 10px; background: var(--accent-purple-alpha);
                    color: var(--accent-purple); display: flex; align-items: center; justify-content: center;
                    font-weight: 700; border: 1px solid var(--accent-purple); box-shadow: 0 0 10px var(--accent-purple-alpha);
                }
                .user-text { display: flex; flex-direction: column; }
                .user-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
                .user-upn { font-size: 11px; color: var(--text-tertiary); }

                .activity-cell { font-size: 13px; position: relative; }
                .status-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; cursor: help; }
                .status-active { color: #22c55e; }
                .status-recent { color: #3b82f6; }
                .status-inactive { color: #f59e0b; }
                .status-never { color: #6b7280; }
                .no-license-indicator { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); opacity: 0.3; color: #ef4444; }

                .overall-activity { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); background: rgba(255,255,255,0.02); padding: 6px 12px; border-radius: 8px; width: fit-content; }
                
                .matrix-legend { display: flex; gap: 24px; padding: 16px 20px; background: var(--glass-bg); border-top: 1px solid var(--glass-border); }
                .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-tertiary); font-weight: 500; }

                .no-data-matrix { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: var(--text-tertiary); gap: 16px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default UserActivityReport;
