import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import RuntimeConfig from '../config';

const TenantSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        setTenants(RuntimeConfig.getTenants());
        setActiveId(RuntimeConfig.getActiveTenantId());
    }, []);

    const activeTenant = tenants.find(t => t.tenantId === activeId);

    const handleSelect = (tenantId) => {
        RuntimeConfig.setActiveTenant(tenantId);
        setIsOpen(false);
    };

    if (tenants.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm group"
                title="Switch Tenant"
            >
                <Building2 className="w-4 h-4 text-primary-400" />
                <span className="max-w-[120px] truncate text-slate-300 group-hover:text-white">
                    {activeTenant ? activeTenant.displayName : 'Select Tenant'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 space-y-1">
                            {tenants.map((tenant) => (
                                <button
                                    key={tenant.tenantId}
                                    onClick={() => handleSelect(tenant.tenantId)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-sm ${activeId === tenant.tenantId
                                            ? 'bg-primary-500/20 text-primary-400'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex flex-col items-start truncate mr-2">
                                        <span className="font-medium truncate">{tenant.displayName}</span>
                                        <span className="text-[10px] opacity-50 truncate">{tenant.tenantId}</span>
                                    </div>
                                    {activeId === tenant.tenantId && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TenantSelector;
