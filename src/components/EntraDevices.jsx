import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { DevicesService } from '../services/entra';
import { ArrowLeft, Search, Laptop, Monitor, Smartphone, RefreshCw, Download } from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const EntraDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [osFilter, setOsFilter] = useState('all');
    const [joinTypeFilter, setJoinTypeFilter] = useState('all');
    const [managementFilter, setManagementFilter] = useState('all');

    useEffect(() => {
        fetchDevices();
    }, [activeTenantId]);

    const fetchDevices = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setRefreshing(true);
            else setLoading(true);
            try {
                const accessToken = await acquireToken({ ...loginRequest });
                const client = new GraphService(accessToken).client;
                const data = await DevicesService.getAllDevices(client, 100);
                setDevices(data || []);
            } catch (error) {
                console.error("Device fetch error", error);
            } finally {
                if (isManual) {
                    setTimeout(() => setRefreshing(false), 1000);
                } else {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }
    };

    const handleDownloadCSV = () => {
        if (filteredDevices.length === 0) return;

        const headers = ['Name', 'Enabled', 'OS', 'Version', 'Join Type', 'Owner', 'MDM', 'Device ID'];
        const rows = filteredDevices.map(d => [
            `"${d.displayName || ''}"`,
            d.accountEnabled ? 'Yes' : 'No',
            `"${d.operatingSystem || ''}"`,
            `"${d.operatingSystemVersion || ''}"`,
            `"${getJoinType(d)}"`,
            `"${getOwnerName(d)}"`,
            `"${getMDM(d)}"`,
            `"${d.id}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `azure_devices_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filteredDevices = devices.filter(d => {
        const matchesText = (d.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
            d.id?.toLowerCase().includes(filterText.toLowerCase()));
        if (!matchesText) return false;

        if (osFilter !== 'all') {
            const os = d.operatingSystem?.toLowerCase() || '';
            if (osFilter === 'windows' && !os.includes('window')) return false;
            if (osFilter === 'macos' && !os.includes('mac')) return false;
            if (osFilter === 'ios' && !(os.includes('ios') || os.includes('iphone'))) return false;
            if (osFilter === 'android' && !os.includes('android')) return false;
        }

        if (joinTypeFilter !== 'all') {
            const type = d.trustType?.toLowerCase() || '';
            if (joinTypeFilter === 'azureadjoined' && type !== 'azureadjoined' && type !== 'azuread') return false;
            if (joinTypeFilter === 'azureadregistered' && type !== 'azureadregistered') return false;
            if (joinTypeFilter === 'hybrid' && type !== 'serverad') return false;
        }

        if (managementFilter !== 'all') {
            if (managementFilter === 'managed' && !d.isManaged) return false;
            if (managementFilter === 'unmanaged' && d.isManaged) return false;
        }

        return true;
    });

    const getOsIcon = (os) => {
        const lower = os?.toLowerCase() || '';
        if (lower.includes('window')) return <Monitor size={16} color="#0078d4" />;
        if (lower.includes('ios') || lower.includes('iphone') || lower.includes('mac')) return <Smartphone size={16} color="#555" />;
        if (lower.includes('android')) return <Smartphone size={16} color="#3ddc84" />;
        return <Laptop size={16} color="#777" />;
    };

    const getJoinType = (device) => {
        const type = device.trustType?.toLowerCase();
        if (type === 'azureadjoined' || type === 'azuread') return 'Microsoft Entra joined';
        if (type === 'azureadregistered') return 'Microsoft Entra registered';
        if (type === 'serverad') return 'Hybrid Azure AD joined';
        if (type === 'workplace') return 'Workplace joined';
        return device.trustType || 'Unknown';
    };

    const getMDM = (device) => {
        if (device.isManaged) return 'Microsoft Intune';
        return 'None';
    };

    const getOwnerName = (device) => {
        if (device.registeredOwners && device.registeredOwners.length > 0) {
            return device.registeredOwners[0].displayName;
        }
        return 'None';
    };

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>All devices</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage and monitor your organization's device inventory</p>
                </div>
                <div className="flex-gap-4">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchDevices(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadCSV}>
                        <Download size={16} />
                        Export Devices
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="flex-between flex-gap-4">
                    <div className="search-wrapper">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search by name or device ID..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                    <div className="flex-gap-4">
                        <select className="input" value={osFilter} onChange={(e) => setOsFilter(e.target.value)} style={{ width: '160px' }}>
                            <option value="all">All OS Types</option>
                            <option value="windows">Windows</option>
                            <option value="macos">macOS</option>
                            <option value="ios">iOS</option>
                            <option value="android">Android</option>
                        </select>
                        <select className="input" value={joinTypeFilter} onChange={(e) => setJoinTypeFilter(e.target.value)} style={{ width: '200px' }}>
                            <option value="all">All Join Types</option>
                            <option value="azureadjoined">Entra Joined</option>
                            <option value="azureadregistered">Entra Registered</option>
                            <option value="hybrid">Hybrid Joined</option>
                        </select>
                        <select className="input" value={managementFilter} onChange={(e) => setManagementFilter(e.target.value)} style={{ width: '180px' }}>
                            <option value="all">All Management</option>
                            <option value="managed">Managed</option>
                            <option value="unmanaged">Unmanaged</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>
                {filteredDevices.length} devices found
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Enabled</th>
                                <th>OS</th>
                                <th>Version</th>
                                <th>Join Type</th>
                                <th>Owner</th>
                                <th>MDM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDevices.length > 0 ? filteredDevices.map((device, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-3">
                                            {getOsIcon(device.operatingSystem)}
                                            <span style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 500 }}>
                                                {device.displayName}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {device.accountEnabled ? (
                                            <span className="badge badge-success">Enabled</span>
                                        ) : (
                                            <span className="badge badge-error">Disabled</span>
                                        )}
                                    </td>
                                    <td>{device.operatingSystem}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.8 }}>
                                        {device.operatingSystemVersion || '-'}
                                    </td>
                                    <td>{getJoinType(device)}</td>
                                    <td>
                                        {getOwnerName(device) === 'None' ?
                                            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>None</span> :
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getOwnerName(device)}</span>
                                        }
                                    </td>
                                    <td>
                                        {getMDM(device) === 'None' ?
                                            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>None</span> :
                                            <span className="badge badge-info">{getMDM(device)}</span>
                                        }
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Monitor size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No devices match your search criteria.</p>
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

export default EntraDevices;
