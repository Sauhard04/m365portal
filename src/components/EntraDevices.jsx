import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { DevicesService } from '../services/entra';
import { ArrowLeft, Search, Laptop, Monitor, Smartphone, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const EntraDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchDevices = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const client = new GraphService(response.accessToken).client;
                    const data = await DevicesService.getAllDevices(client, 100);
                    setDevices(data || []);
                } catch (error) {
                    console.error("Device fetch error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDevices();
    }, [accounts, instance]);

    const filteredDevices = devices.filter(d => d.displayName?.toLowerCase().includes(filterText.toLowerCase()));

    const getOsIcon = (os) => {
        const lower = os?.toLowerCase() || '';
        if (lower.includes('window')) return <Monitor size={14} />;
        if (lower.includes('ios') || lower.includes('iphone')) return <Smartphone size={14} />;
        if (lower.includes('android')) return <Smartphone size={14} />;
        return <Laptop size={14} />;
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-pink)" />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Device Ecosystem</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Unified endpoint management and compliance auditing</p>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="search-wrapper" style={{ maxWidth: '600px' }}>
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="Search devices by name or identifier..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    <Search size={18} className="search-icon" />
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 className="flex-center flex-gap-4">
                        <Laptop size={20} color="var(--accent-pink)" />
                        Inventory Data
                    </h3>
                    <span className="badge" style={{ background: 'hsla(330, 81%, 60%, 0.1)', color: 'var(--accent-pink)' }}>{filteredDevices.length} REGISTERED DEVICES</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Device Identifier</th>
                                <th>Operating System</th>
                                <th>Management</th>
                                <th>Last Activity</th>
                                <th>Compliance Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDevices.length > 0 ? filteredDevices.map((device, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600 }}>{device.displayName}</td>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-2">
                                            {getOsIcon(device.operatingSystem)}
                                            <span style={{ fontSize: '12px' }}>{device.operatingSystem}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${device.isManaged ? 'badge-info' : ''}`}>
                                            {device.isManaged ? 'Internal Asset' : 'Unmanaged / BYOD'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px', opacity: 0.7 }}>
                                        {device.approximateLastSignInDateTime ? new Date(device.approximateLastSignInDateTime).toLocaleDateString() : 'Inactive'}
                                    </td>
                                    <td>
                                        {device.complianceState === 'compliant' ? (
                                            <span className="badge badge-success">
                                                <CheckCircle size={10} style={{ marginRight: '4px' }} />
                                                Compliant
                                            </span>
                                        ) : (
                                            <span className="badge badge-error">
                                                <AlertTriangle size={10} style={{ marginRight: '4px' }} />
                                                {device.complianceState || 'Non-Compliant'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Laptop size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p>No endpoints currently registered in this tenant.</p>
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
