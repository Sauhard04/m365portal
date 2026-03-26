import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Building2, Trash2, Edit2, Search, Save, X, AlertCircle, ArrowLeft, RefreshCw, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TenantManagement = () => {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [formData, setFormData] = useState({
        tenantId: '',
        clientId: '',
        displayName: '',
        isActive: true
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/tenants');
            if (response.ok) {
                const data = await response.json();
                console.log('[TenantManagement] Fetched tenants from API:', data);
                console.log('[TenantManagement] First tenant clientId:', data[0]?.clientId);
                setTenants(data);
            }
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (tenant) => {
        setEditingTenant(tenant);
        setFormData({
            tenantId: tenant.tenantId,
            clientId: tenant.clientId,
            displayName: tenant.displayName,
            isActive: tenant.isActive
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (tenantId) => {
        if (!window.confirm(`Are you sure you want to delete this tenant configuration?`)) return;

        try {
            const response = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
            if (response.ok) {
                fetchTenants();
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        console.log('[TenantManagement] Saving tenant with data:', formData);

        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            console.log('[TenantManagement] Response status:', response.status);
            const responseData = await response.json();
            console.log('[TenantManagement] Response data:', responseData);

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({ tenantId: '', clientId: '', displayName: '', isActive: true });
                setEditingTenant(null);
                fetchTenants();
            } else {
                setError(responseData.error || 'Failed to save tenant');
            }
        } catch (err) {
            console.error('[TenantManagement] Save error:', err);
            setError('Network error. Please check your connection.');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tenantId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/birdseye')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Birds Eye View
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Tenant Management</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Configure and manage multiple M365 environments</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        className="sync-btn"
                        onClick={() => fetchTenants()}
                        title="Refresh Tenants"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingTenant(null);
                            setFormData({ tenantId: '', clientId: '', displayName: '', isActive: true });
                            setIsModalOpen(true);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '13px', padding: '10px 20px' }}
                    >
                        <Plus size={16} />
                        Add Tenant
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="search-wrapper spacing-v-4">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Search by name or tenant ID..."
                    className="input search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div className="glass-card" style={{ padding: '12px 20px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{filteredTenants.length}</span> Tenant{filteredTenants.length !== 1 ? 's' : ''} Configured
                </span>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex-center" style={{ padding: '80px 0' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--glass-border)', borderTopColor: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : filteredTenants.length === 0 ? (
                <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ padding: '16px', borderRadius: '50%', background: 'var(--glass-bg)', display: 'inline-flex', marginBottom: '16px' }}>
                        <Building2 size={32} color="var(--text-dim)" />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No tenants found</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                    >
                        Click here to add your first tenant
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {filteredTenants.map((tenant, i) => (
                        <motion.div
                            key={tenant.tenantId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -2 }}
                            className="glass-card"
                            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: tenant.isActive ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))' : 'var(--glass-bg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Building2 size={24} color={tenant.isActive ? 'white' : 'var(--text-dim)'} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {tenant.displayName}
                                </h3>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                    <span>Tenant: {tenant.tenantId?.substring(0, 8) || 'N/A'}...</span>
                                    <span>Client: {tenant.clientId?.substring(0, 8) || 'N/A'}...</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={tenant.isActive ? 'badge-success' : 'badge-error'} style={{ fontSize: '9px', padding: '4px 10px' }}>
                                    {tenant.isActive ? 'Active' : 'Disabled'}
                                </span>
                                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />
                                <button
                                    onClick={() => handleEdit(tenant)}
                                    className="btn-secondary"
                                    style={{ padding: '8px', borderRadius: '8px' }}
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(tenant.tenantId)}
                                    className="btn-secondary"
                                    style={{ padding: '8px', borderRadius: '8px', color: 'var(--accent-error)' }}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.8)',
                                backdropFilter: 'blur(8px)'
                            }}
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '500px',
                                background: 'var(--bg-light)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--glass-bg)'
                            }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                    {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                    style={{ padding: '8px', borderRadius: '8px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                                {error && (
                                    <div style={{
                                        padding: '12px 16px',
                                        marginBottom: '20px',
                                        borderRadius: '12px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        fontSize: '13px'
                                    }}>
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                        Display Name
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Production Environment"
                                        className="input"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                        Tenant ID
                                    </label>
                                    <input
                                        required
                                        disabled={!!editingTenant}
                                        type="text"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="input"
                                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                        value={formData.tenantId}
                                        onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                        Application (Client) ID
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="input"
                                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                    />
                                </div>

                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '24px'
                                }}>
                                    <input
                                        id="is-active"
                                        type="checkbox"
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="is-active" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                        Tenant is active and available for selection
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Save size={16} />
                                        {editingTenant ? 'Save Changes' : 'Add Tenant'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TenantManagement;
