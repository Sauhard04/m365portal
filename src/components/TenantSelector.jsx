import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';

const TenantSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        // Fetch tenants from API
        fetch('/api/tenants')
            .then(res => res.json())
            .then(data => {
                console.log('[TenantSelector] Fetched tenants:', data);
                // Show all tenants, not just active ones
                setTenants(data);
                console.log('[TenantSelector] All tenants:', data);

                // Get saved active tenant from localStorage or use first tenant
                const savedTenantId = localStorage.getItem('activeTenantId');
                if (savedTenantId && data.find(t => t.tenantId === savedTenantId)) {
                    setActiveId(savedTenantId);
                    console.log('[TenantSelector] Using saved tenant:', savedTenantId);
                } else if (data.length > 0) {
                    setActiveId(data[0].tenantId);
                    localStorage.setItem('activeTenantId', data[0].tenantId);
                    console.log('[TenantSelector] Auto-selected first tenant:', data[0].tenantId);
                }
            })
            .catch(err => console.error('[TenantSelector] Failed to fetch tenants:', err));
    }, []);

    const activeTenant = tenants.find(t => t.tenantId === activeId);
    console.log('[TenantSelector] Rendering with tenants:', tenants.length, 'active:', activeTenant?.displayName);

    // Show selector even with one tenant so users can see which tenant is active
    if (tenants.length === 0) {
        console.log('[TenantSelector] No tenants, returning null');
        return null;
    }

    const handleSelect = (tenantId) => {
        localStorage.setItem('activeTenantId', tenantId);
        setActiveId(tenantId);
        setIsOpen(false);

        // Reload the page to apply the new tenant context
        window.location.reload();
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-xs group"
                title="Switch Tenant"
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="truncate text-slate-200 font-medium">
                        {activeTenant ? activeTenant.displayName : 'No Tenant'}
                    </span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-full min-w-[240px] rounded-lg border border-white/10 bg-slate-900/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-1.5 space-y-0.5">
                            {tenants.map((tenant) => (
                                <button
                                    key={tenant.tenantId}
                                    onClick={() => handleSelect(tenant.tenantId)}
                                    className={`w-full flex items-center justify-between p-2 rounded-md transition-all text-xs ${activeId === tenant.tenantId
                                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                                        }`}
                                >
                                    <div className="flex flex-col items-start truncate mr-2 min-w-0">
                                        <span className="font-semibold truncate w-full">{tenant.displayName}</span>
                                        <span className="text-[9px] opacity-40 truncate w-full font-mono">{tenant.tenantId}</span>
                                    </div>
                                    {activeId === tenant.tenantId && <Check className="w-3.5 h-3.5 shrink-0" />}
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
