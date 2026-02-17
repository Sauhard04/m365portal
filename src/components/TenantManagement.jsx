import React, { useState, useEffect } from 'react';
import {
    Plus, Building2, Trash2, Edit2, CheckCircle2, XCircle,
    Search, ExternalLink, Shield, Save, X, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TenantManagement = () => {
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

        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                setFormData({ tenantId: '', clientId: '', displayName: '', isActive: true });
                setEditingTenant(null);
                fetchTenants();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to save tenant');
            }
        } catch (err) {
            setError('Network error. Please check your connection.');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tenantId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-400" />
                        Tenant Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Configure and manage multiple M365 environments</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTenant(null);
                        setFormData({ tenantId: '', clientId: '', displayName: '', isActive: true });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all shadow-lg shadow-primary-600/20 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add New Tenant
                </button>
            </div>

            {/* Stats & Tools */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary-500/50 outline-none transition-all text-white placeholder:text-slate-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-400">
                    <span className="font-bold text-white">{filteredTenants.length}</span>
                    Tenants Configured
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
                    <p className="text-slate-500 animate-pulse">Loading configurations...</p>
                </div>
            ) : filteredTenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/2 rounded-2xl border border-dashed border-white/10">
                    <div className="p-4 rounded-full bg-slate-800/50 mb-4">
                        <Building2 className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400">No tenants found</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-primary-400 hover:text-primary-300 text-sm mt-2 font-medium"
                    >
                        Click here to add your first tenant
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredTenants.map((tenant) => (
                        <motion.div
                            layout
                            key={tenant.tenantId}
                            className="bg-enterprise-card rounded-2xl border border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-all hover:bg-white/[0.04] hover:border-white/10 shadow-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner ${tenant.isActive ? 'bg-gradient-to-br from-primary-500 to-primary-600' : 'bg-slate-700'}`}>
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{tenant.displayName}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-[11px] text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded italic">T: {tenant.tenantId}</p>
                                        <p className="text-[11px] text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded italic">C: {tenant.clientId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {tenant.isActive ? 'Active' : 'Disabled'}
                                </div>
                                <div className="h-6 w-px bg-white/5 mx-2" />
                                <button
                                    onClick={() => handleEdit(tenant)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                    title="Edit Config"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(tenant.tenantId)}
                                    className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-primary-400 transition-all">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {editingTenant ? 'Edit Tenant Configuration' : 'Add New M365 Tenant'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {error && (
                                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. My Organization (Production)"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary-500/50 outline-none transition-all text-white"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tenant ID</label>
                                    <input
                                        required
                                        disabled={!!editingTenant}
                                        type="text"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary-500/50 outline-none transition-all text-white disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed font-mono text-sm"
                                        value={formData.tenantId}
                                        onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Application (Client) ID</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary-500/50 outline-none transition-all text-white font-mono text-sm"
                                        value={formData.clientId}
                                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
                                    <input
                                        id="is-active"
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500/20 ring-offset-slate-900"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="is-active" className="text-sm text-slate-300">Tenant is active and available for selection</label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-all shadow-lg shadow-primary-600/20 text-sm flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingTenant ? 'Save Changes' : 'Register Tenant'}
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
