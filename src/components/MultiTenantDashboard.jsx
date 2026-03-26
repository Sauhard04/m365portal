import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Bell, AlertTriangle, FileText, Filter,
    RefreshCw, ChevronLeft, ChevronRight, Calendar,
    ArrowLeft, ShieldAlert, CheckCircle2, Clock,
    TrendingUp, Users, BarChart3, ExternalLink, X,
    ChevronDown, ChevronUp, Eye, MapPin, Info,
    Download, Activity, Shield, Zap, Target,
    Layers, Heart, AlertCircle, Search, Save, Bookmark, Trash2, Package, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import Loader3D from './Loader3D';

// ─── Constants ────────────────────────────────────────────────────────────────
const SEV_ORDER = { high: 0, medium: 1, low: 2 };
const SEVERITY_STYLES = {
    high: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', label: 'High', glow: '0 0 12px rgba(239,68,68,0.3)' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', label: 'Medium', glow: 'none' },
    low: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', label: 'Low', glow: 'none' },
};
const TYPE_COLORS = {
    security: '#ef4444', compliance: '#8b5cf6', usage: '#3b82f6',
    activity: '#10b981', audit: '#f59e0b', other: '#64748b'
};
const PIE_PALETTE = ['#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b','#06b6d4','#f97316'];
const HEALTH_COLORS = { good: '#10b981', warning: '#f59e0b', critical: '#ef4444' };

const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';
const shortTenant = (id) => id ? id.substring(0, 8) + '…' : 'N/A';
const getHealthColor = (score) => score >= 70 ? HEALTH_COLORS.good : score >= 40 ? HEALTH_COLORS.warning : HEALTH_COLORS.critical;
const getHealthLabel = (score) => score >= 70 ? 'Healthy' : score >= 40 ? 'Warning' : 'Critical';

// ─── Small Components ─────────────────────────────────────────────────────────
const SeverityBadge = ({ severity }) => {
    const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low;
    return (
        <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: s.color, background: s.bg, border: s.border,
            whiteSpace: 'nowrap'
        }}>{s.label}</span>
    );
};

const KpiCard = ({ icon: Icon, label, value, color, sub, pulse }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 160px', minWidth: '140px', position: 'relative', overflow: 'hidden' }}
    >
        {pulse && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />}
        <div style={{
            padding: '10px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${color}33, ${color}22)`,
            border: `1px solid ${color}44`, flexShrink: 0
        }}>
            <Icon size={18} color={color} />
        </div>
        <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {value ?? '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{sub}</div>}
        </div>
    </motion.div>
);

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '8px 12px', backdropFilter: 'blur(8px)'
        }}>
            {label && <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ fontSize: '12px', color: p.fill || p.color || 'var(--text-primary)', fontWeight: 600 }}>
                    {p.name || p.dataKey}: {p.value}
                </p>
            ))}
        </div>
    );
};

// ─── Alert Detail Modal ───────────────────────────────────────────────────────
const AlertDetailModal = ({ alert, tenantName, onClose, onResolve }) => {
    if (!alert) return null;
    const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                    className="glass-card"
                    style={{ width: '100%', maxWidth: '520px', padding: '28px', position: 'relative' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldAlert size={18} color={s.color} />
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Alert Details</h3>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}><X size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{alert.message}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[
                                ['Severity', <SeverityBadge severity={alert.severity} />],
                                ['Status', alert.isActive ? <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>● Active</span> : <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>✓ Resolved</span>],
                                ['Tenant', <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-dim)' }}>{tenantName || alert.tenantId}</span>],
                                ['Timestamp', <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{formatDate(alert.timestamp)}</span>],
                            ].map(([label, val]) => (
                                <div key={label} style={{ background: 'var(--glass-bg)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
                                    <div>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        {alert.isActive && (
                            <button onClick={() => { onResolve(alert._id); onClose(); }} className="btn btn-primary" style={{ flex: 1, padding: '8px 16px', fontSize: '12px' }}>
                                <CheckCircle2 size={13} /> Mark as Resolved
                            </button>
                        )}
                        <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '8px 16px', fontSize: '12px' }}>Close</button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Critical Alert Card ──────────────────────────────────────────────────────
const CriticalAlertCard = ({ alert, tenantName, onViewDetails, onResolve, onNavigateTenant }) => {
    const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.high;
    return (
        <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            className="glass-card"
            style={{ padding: '14px 16px', borderLeft: `3px solid ${s.color}`, background: `linear-gradient(135deg, ${s.bg}, var(--glass-bg))`, boxShadow: s.glow }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <ShieldAlert size={14} color={s.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.45, flex: 1 }}>{alert.message}</p>
                <SeverityBadge severity={alert.severity} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    <Building2 size={11} /><span>{tenantName || shortTenant(alert.tenantId)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    <Clock size={11} /><span>{formatDate(alert.timestamp)}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <button onClick={() => onViewDetails(alert)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={11} /> Details</button>
                    <button onClick={() => onNavigateTenant(alert.tenantId)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} /> Tenant</button>
                    {alert.isActive && (
                        <button onClick={() => onResolve(alert._id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}><CheckCircle2 size={11} /> Resolve</button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MultiTenantDashboard = () => {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [reports, setReports] = useState([]);
    const [reportsTotal, setReportsTotal] = useState(0);
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsPages, setReportsPages] = useState(1);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [reportsError, setReportsError] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportTypeFilter, setReportTypeFilter] = useState('');
    const REPORTS_LIMIT = 20;
    const [alerts, setAlerts] = useState([]);
    const [resolvedIds, setResolvedIds] = useState(new Set());
    const [alertsTotal, setAlertsTotal] = useState(0);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [alertsError, setAlertsError] = useState(null);
    const [severityFilter, setSeverityFilter] = useState('');
    const [onlyActive, setOnlyActive] = useState(false);
    const [alertsRefreshing, setAlertsRefreshing] = useState(false);
    const [detailAlert, setDetailAlert] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const autoRefreshTimer = useRef(null);
    // Feature: Bulk Actions
    const [selectedAlertIds, setSelectedAlertIds] = useState(new Set());
    // Feature: Alert Trend Timeline
    const [trendRange, setTrendRange] = useState(7);
    // Feature: Saved Filters
    const [savedFilters, setSavedFilters] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mtd_saved_filters') || '[]'); } catch { return []; }
    });
    const [filterName, setFilterName] = useState('');

    // ── Fetch tenants ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/tenants').then(r => r.ok ? r.json() : [])
            .then(d => setTenants(Array.isArray(d) ? d : []))
            .catch(() => setTenants([]));
    }, []);

    // ── Fetch Stats ───────────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedTenant) params.set('tenantId', selectedTenant);
            const res = await fetch(`/api/admin/dashboard-stats?${params}`);
            if (res.ok) setStats(await res.json());
        } catch { } finally { setStatsLoading(false); }
    }, [selectedTenant]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ── Fetch Reports ─────────────────────────────────────────────────────────
    const fetchReports = useCallback(async (page = 1) => {
        setReportsLoading(true); setReportsError(null);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(REPORTS_LIMIT) });
            if (selectedTenant) params.set('tenantId', selectedTenant);
            if (startDate) params.set('startDate', new Date(startDate).toISOString());
            if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
            const res = await fetch(`/api/admin/reports?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const d = await res.json();
            setReports(d.reports || []); setReportsTotal(d.total ?? 0);
            setReportsPage(d.page ?? 1); setReportsPages(d.pages ?? 1);
        } catch { setReportsError('Failed to load reports.'); }
        finally { setReportsLoading(false); }
    }, [selectedTenant, startDate, endDate]);
    useEffect(() => { fetchReports(1); }, [fetchReports]);

    // ── Fetch Alerts ──────────────────────────────────────────────────────────
    const fetchAlerts = useCallback(async (silent = false) => {
        if (!silent) setAlertsLoading(true); else setAlertsRefreshing(true);
        setAlertsError(null);
        try {
            const params = new URLSearchParams({ limit: '200', page: '1' });
            if (selectedTenant) params.set('tenantId', selectedTenant);
            if (severityFilter) params.set('severity', severityFilter);
            if (onlyActive) params.set('onlyActive', 'true');
            const res = await fetch(`/api/admin/alerts?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const d = await res.json();
            const sorted = (d.alerts || []).sort((a, b) => {
                const sevDiff = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
                if (sevDiff !== 0) return sevDiff;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            setAlerts(sorted); setAlertsTotal(d.total ?? 0);
            setLastUpdated(new Date());
        } catch { setAlertsError('Failed to load alerts.'); }
        finally { setAlertsLoading(false); setAlertsRefreshing(false); }
    }, [selectedTenant, severityFilter, onlyActive]);
    useEffect(() => { fetchAlerts(false); }, [fetchAlerts]);
    useEffect(() => {
        autoRefreshTimer.current = setInterval(() => fetchAlerts(true), 15000);
        return () => clearInterval(autoRefreshTimer.current);
    }, [fetchAlerts]);

    // ── Refresh All ───────────────────────────────────────────────────────────
    const refreshAll = () => { fetchStats(); fetchReports(reportsPage); fetchAlerts(false); setLastUpdated(new Date()); };

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleResolve = (alertId) => {
        setResolvedIds(prev => new Set([...prev, alertId]));
        setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, isActive: false } : a));
        fetchStats();
    };
    const handleNavigateTenant = (tenantId) => navigate(`/service/overview`);
    // Bulk Actions
    const toggleSelectAlert = (id) => setSelectedAlertIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAllVisible = () => setSelectedAlertIds(new Set(visibleAlerts.map(a => a._id).filter(Boolean)));
    const clearSelection = () => setSelectedAlertIds(new Set());
    const bulkResolve = () => { selectedAlertIds.forEach(id => handleResolve(id)); clearSelection(); };
    const bulkDismiss = () => { setAlerts(prev => prev.filter(a => !selectedAlertIds.has(a._id))); clearSelection(); fetchStats(); };
    // Saved Filters
    const saveCurrentFilter = () => {
        if (!filterName.trim()) return;
        const preset = { name: filterName.trim(), tenant: selectedTenant, severity: severityFilter, onlyActive, startDate, endDate };
        const updated = [...savedFilters, preset];
        setSavedFilters(updated); localStorage.setItem('mtd_saved_filters', JSON.stringify(updated)); setFilterName('');
    };
    const loadFilter = (preset) => { setSelectedTenant(preset.tenant || ''); setSeverityFilter(preset.severity || ''); setOnlyActive(preset.onlyActive || false); setStartDate(preset.startDate || ''); setEndDate(preset.endDate || ''); };
    const deleteFilter = (idx) => { const updated = savedFilters.filter((_, i) => i !== idx); setSavedFilters(updated); localStorage.setItem('mtd_saved_filters', JSON.stringify(updated)); };

    // ── Derived Data ──────────────────────────────────────────────────────────
    const visibleAlerts = onlyActive ? alerts.filter(a => a.isActive) : alerts;
    const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'high' && a.isActive), [alerts]);

    // Tenant Health Data + Risk Score
    const tenantHealthData = useMemo(() => {
        if (!tenants.length || !stats) return [];
        return tenants.map((t, i) => {
            const tAlerts = alerts.filter(a => a.tenantId === t.tenantId);
            const highAlerts = tAlerts.filter(a => a.severity === 'high' && a.isActive).length;
            const medAlerts = tAlerts.filter(a => a.severity === 'medium' && a.isActive).length;
            const activeAlerts = tAlerts.filter(a => a.isActive).length;
            const totalReports = stats?.reportsByTenant?.[t.tenantId] || 0;
            
            // Health Score: Base 100
            // Deduct 20 for each high alert (max 60)
            // Deduct 5 for each active alert (max 20)
            const healthScore = Math.max(0, Math.min(100, 100 - (highAlerts * 20) - (activeAlerts * 5)));
            
            // Risk score: 0-100, higher = more risk
            const riskScore = Math.min(100, (highAlerts * 25) + (medAlerts * 10) + (activeAlerts * 3));
            const riskColor = riskScore >= 60 ? '#ef4444' : riskScore >= 30 ? '#f59e0b' : '#10b981';
            const riskLabel = riskScore >= 60 ? 'High Risk' : riskScore >= 30 ? 'Medium' : 'Low Risk';
            
            return {
                ...t, highAlerts, medAlerts, activeAlerts, totalAlerts: tAlerts.length,
                totalReports, healthScore, riskScore, riskColor, riskLabel,
                healthColor: getHealthColor(healthScore),
                healthLabel: getHealthLabel(healthScore)
            };
        }).sort((a, b) => a.healthScore - b.healthScore);
    }, [tenants, alerts, stats]);

    // Alert Trend Timeline Data
    const trendData = useMemo(() => {
        const days = trendRange;
        const now = new Date();
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now); date.setDate(date.getDate() - i); date.setHours(0,0,0,0);
            const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
            const dayAlerts = alerts.filter(a => { const t = new Date(a.timestamp); return t >= date && t < nextDate; });
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                total: dayAlerts.length,
                high: dayAlerts.filter(a => a.severity === 'high').length,
                medium: dayAlerts.filter(a => a.severity === 'medium').length,
                low: dayAlerts.filter(a => a.severity === 'low').length,
            });
        }
        return data;
    }, [alerts, trendRange]);

    // Insights
    const insights = useMemo(() => {
        const result = [];
        tenantHealthData.forEach(t => {
            if (t.highAlerts >= 3) result.push({ type: 'critical', icon: AlertTriangle, color: '#ef4444', message: `${t.displayName} has ${t.highAlerts} critical alerts requiring immediate attention`, tenant: t });
            if (t.healthScore < 40) result.push({ type: 'warning', icon: Heart, color: '#f59e0b', message: `${t.displayName} health score is critically low (${t.healthScore}/100)`, tenant: t });
            if (t.totalReports === 0) result.push({ type: 'info', icon: Activity, color: '#3b82f6', message: `${t.displayName} has no recent activity or reports`, tenant: t });
        });

        // Global MFA Insight
        if (stats?.mfaTotal > 0) {
            const mfaPct = Math.round((stats.mfaRegistered / stats.mfaTotal) * 100);
            if (mfaPct < 80) {
                result.unshift({ type: 'security', icon: Shield, color: '#ef4444', message: `Global MFA coverage is low (${mfaPct}%). Total ${stats.mfaTotal - stats.mfaRegistered} users are not secured.` });
            }
        }

        // Global Licensing Insight
        if (stats?.totalLicenses > 0) {
            const usagePct = Math.round((stats.assignedLicenses / stats.totalLicenses) * 100);
            if (usagePct > 90) {
                result.push({ type: 'usage', icon: FileText, color: '#f59e0b', message: `License utilization is high (${usagePct}%). Consider purchasing more seats.` });
            }
        }

        if (criticalAlerts.length > 5) result.unshift({ type: 'critical', icon: Zap, color: '#ef4444', message: `${criticalAlerts.length} critical alerts across all tenants need resolution` });
        return result.slice(0, 10);
    }, [tenantHealthData, criticalAlerts, stats]);

    // Chart data
    const reportsByTypeData = stats?.reportsByType ? Object.entries(stats.reportsByType).map(([type, count]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), count, fill: TYPE_COLORS[type] || '#64748b' })) : [];
    const alertSevData = stats?.alertsBySeverity ? [
        { name: 'High', value: stats.alertsBySeverity.high || 0, fill: '#ef4444' },
        { name: 'Medium', value: stats.alertsBySeverity.medium || 0, fill: '#f59e0b' },
        { name: 'Low', value: stats.alertsBySeverity.low || 0, fill: '#10b981' },
    ].filter(d => d.value > 0) : [];

    const alertsPerTenantData = useMemo(() => tenants.map((t, i) => ({
        name: t.displayName || shortTenant(t.tenantId),
        alerts: alerts.filter(a => a.tenantId === t.tenantId).length,
        high: alerts.filter(a => a.tenantId === t.tenantId && a.severity === 'high').length,
        fill: PIE_PALETTE[i % PIE_PALETTE.length]
    })), [tenants, alerts]);

    const filteredReports = useMemo(() => {
        if (!reportTypeFilter) return reports;
        return reports.filter(r => r.type === reportTypeFilter);
    }, [reports, reportTypeFilter]);

    const reportTypes = useMemo(() => [...new Set(reports.map(r => r.type))], [reports]);

    const tenantsAtRisk = tenantHealthData.filter(t => t.healthScore < 40).length;

    // ── Tab styles ────────────────────────────────────────────────────────────
    const tabStyle = (tab) => ({
        padding: '8px 16px', fontSize: '12px', fontWeight: activeTab === tab ? 700 : 500,
        background: activeTab === tab ? 'var(--accent-blue)' : 'transparent',
        color: activeTab === tab ? 'white' : 'var(--text-secondary)',
        border: activeTab === tab ? 'none' : '1px solid var(--glass-border)',
        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '6px'
    });

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="animate-in">
            <AlertDetailModal alert={detailAlert} tenants={tenants} onClose={() => setDetailAlert(null)} onResolve={handleResolve} />

            {/* Page Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '26px' }}>Command Center</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
                        Centralized multi-tenant admin dashboard
                        {lastUpdated && <span> · Last refreshed: {lastUpdated.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className={`sync-btn ${alertsRefreshing ? 'spinning' : ''}`} onClick={refreshAll} title="Refresh all">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>
            </header>

            {/* Global Filters */}
            <div className="glass-card" style={{ padding: '14px 18px', marginTop: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Filter size={12} color="var(--accent-blue)" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Filters</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Building2 size={9} style={{ display: 'inline', marginRight: '4px' }} />Tenant
                    </label>
                    <select value={selectedTenant} onChange={e => { setSelectedTenant(e.target.value); setReportsPage(1); }}
                        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', minWidth: '180px' }}>
                        <option value="">All Tenants</option>
                        {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.displayName || t.tenantId}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Calendar size={9} style={{ display: 'inline', marginRight: '4px' }} />Date Range
                    </label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }} />
                        <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '5px 8px', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }} />
                    </div>
                </div>
                {(selectedTenant || startDate || endDate) && (
                    <button onClick={() => { setSelectedTenant(''); setStartDate(''); setEndDate(''); }} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={10} /> Clear All
                    </button>
                )}
                {/* Saved Filter Presets */}
                {savedFilters.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', borderLeft: '1px solid var(--glass-border)', paddingLeft: '16px' }}>
                        <Bookmark size={11} color="var(--text-dim)" />
                        {savedFilters.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button onClick={() => loadFilter(f)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }}>{f.name}</button>
                                <button onClick={() => deleteFilter(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px' }}><X size={9} /></button>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                    <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filter name..." style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', color: 'var(--text-primary)', outline: 'none', width: '100px' }} />
                    <button onClick={saveCurrentFilter} disabled={!filterName.trim()} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', opacity: filterName.trim() ? 1 : 0.4 }}><Save size={9} /> Save</button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <section style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {statsLoading ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card" style={{ flex: '1 1 140px', height: '80px', opacity: 0.4, minWidth: '140px' }} />
                    )) : (<>
                        <KpiCard icon={Building2} label="Total Tenants" value={tenants.length} color="#3b82f6" sub="registered" />
                        <KpiCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="#06b6d4" sub="across nodes" />
                        <KpiCard icon={ShieldCheck} label="MFA Coverage" value={stats?.mfaTotal ? `${Math.round((stats.mfaRegistered / stats.mfaTotal) * 100)}%` : '0%'} color="#10b981" sub={stats?.mfaRegistered > 0 ? `${stats.mfaRegistered}/${stats.mfaTotal} registered` : `Audit Pending (${stats?.mfaTotal || 0} total)`} />
                        <KpiCard icon={FileText} label="Licenses" value={`${Math.round(((stats?.assignedLicenses || 0) / (stats?.totalLicenses || 1)) * 100)}%`} color="#f59e0b" sub={`${stats?.assignedLicenses || 0}/${stats?.totalLicenses || 0} used`} />
                        <KpiCard icon={ShieldAlert} label="High Severity" value={stats?.highAlerts || 0} color="#ef4444" sub="needs attention" pulse={stats?.highAlerts > 0} />
                        <KpiCard icon={AlertTriangle} label="Tenants at Risk" value={tenantsAtRisk} color="#f59e0b" sub="health < 40%" pulse={tenantsAtRisk > 0} />
                    </>)}
                </div>
            </section>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}><Layers size={13} /> Overview</button>
                <button style={tabStyle('alerts')} onClick={() => setActiveTab('alerts')}><Bell size={13} /> Alerts {criticalAlerts.length > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>{criticalAlerts.length}</span>}</button>
                <button style={tabStyle('reports')} onClick={() => setActiveTab('reports')}><FileText size={13} /> Reports</button>
                <button style={tabStyle('insights')} onClick={() => setActiveTab('insights')}><Zap size={13} /> Insights</button>
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (<>
                {/* Critical Alerts Banner */}
                {criticalAlerts.length > 0 && (
                    <section style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '8px' }}><ShieldAlert size={14} color="white" /></div>
                            <div>
                                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>Critical Issues Across Tenants</h2>
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{criticalAlerts.length} high-severity alerts require attention</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                            <AnimatePresence>
                                {criticalAlerts.slice(0, 5).map((alert, i) => (
                                    <CriticalAlertCard key={alert._id || i} alert={alert} tenantName={tenants.find(t => t.tenantId === alert.tenantId)?.displayName}
                                        onViewDetails={setDetailAlert} onResolve={handleResolve} onNavigateTenant={handleNavigateTenant} />
                                ))}
                            </AnimatePresence>
                            {criticalAlerts.length > 5 && <button onClick={() => setActiveTab('alerts')} className="btn btn-secondary" style={{ alignSelf: 'center', padding: '6px 16px', fontSize: '11px' }}>View all {criticalAlerts.length} critical alerts →</button>}
                        </div>
                    </section>
                )}

                {/* Tenant Health Overview Table */}
                {tenantHealthData.length > 0 && (
                    <section style={{ marginTop: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '8px' }}><Heart size={14} color="white" /></div>
                            <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Tenant Health Overview</h2>
                        </div>
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="modern-table" style={{ margin: 0 }}>
                                <thead><tr><th>Tenant</th><th>Health</th><th>Risk Score</th><th>Status</th><th>High Alerts</th><th>Active</th><th>Reports</th></tr></thead>
                                <tbody>
                                    {tenantHealthData.map(t => (
                                        <tr key={t.tenantId} style={{ cursor: 'pointer' }} onClick={() => handleNavigateTenant(t.tenantId)}>
                                            <td style={{ fontWeight: 600, fontSize: '12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={13} color="var(--accent-blue)" />{t.displayName}</div></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--glass-border)', overflow: 'hidden' }}>
                                                        <div style={{ width: `${t.healthScore}%`, height: '100%', borderRadius: '3px', background: t.healthColor, transition: 'width 0.5s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: t.healthColor }}>{t.healthScore}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: t.riskColor }}>{t.riskScore}</span>
                                                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, color: t.riskColor, background: t.riskColor + '22' }}>{t.riskLabel}</span>
                                                </div>
                                            </td>
                                            <td><span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: t.healthColor, background: t.healthColor + '22', border: `1px solid ${t.healthColor}44` }}>{t.healthLabel}</span></td>
                                            <td style={{ color: t.highAlerts > 0 ? '#ef4444' : 'var(--text-dim)', fontWeight: t.highAlerts > 0 ? 700 : 400 }}>{t.highAlerts}</td>
                                            <td>{t.activeAlerts}</td>
                                            <td>{t.totalReports}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Alert Trend Timeline */}
                <section style={{ marginTop: '28px' }}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={14} color="#3b82f6" /><h3 style={{ fontSize: '13px', fontWeight: 700 }}>Alert Trend</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[7, 30].map(d => (
                                    <button key={d} onClick={() => setTrendRange(d)} className={`btn ${trendRange === d ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '3px 10px', fontSize: '10px' }}>{d}d</button>
                                ))}
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={20} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Total" />
                                <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="High" />
                                <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Medium" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Cross-Tenant Comparison Charts */}
                <section style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {alertsPerTenantData.length > 0 && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <BarChart3 size={14} color="#ef4444" /><h3 style={{ fontSize: '13px', fontWeight: 700 }}>Alerts per Tenant</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={alertsPerTenantData} barSize={24}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={20} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="alerts" name="Total" radius={[4, 4, 0, 0]}>{alertsPerTenantData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {reportsByTypeData.length > 0 && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <BarChart3 size={14} color="var(--accent-blue)" /><h3 style={{ fontSize: '13px', fontWeight: 700 }}>Reports by Type</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={reportsByTypeData} barSize={20}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={20} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>{reportsByTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    {alertSevData.length > 0 && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Bell size={14} color="#ef4444" /><h3 style={{ fontSize: '13px', fontWeight: 700 }}>Alerts by Severity</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <ResponsiveContainer width="50%" height={140}>
                                    <PieChart><Pie data={alertSevData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>{alertSevData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {alertSevData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.fill, flexShrink: 0 }} />
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.name}: <strong style={{ color: d.fill }}>{d.value}</strong></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* License Utilization Cross-Tenant Widget */}
                    {stats?.licenseStatsByTenant && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <ShieldCheck size={14} color="#10b981" /><h3 style={{ fontSize: '13px', fontWeight: 700 }}>License Utilization %</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={Object.entries(stats.licenseStatsByTenant).map(([tid, data]) => ({
                                    name: tenants.find(t => t.tenantId === tid)?.displayName || shortTenant(tid),
                                    utilization: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
                                    fill: '#10b981'
                                }))} barSize={24} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} width={80} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                                        {Object.entries(stats.licenseStatsByTenant).map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </section>
            </>)}

            {/* ═══ ALERTS TAB ═══ */}
            {activeTab === 'alerts' && (
                <section style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, #ef4444, #f97316)', borderRadius: '8px' }}><Bell size={14} color="white" /></div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>All Alerts</h2>
                                    {alertsRefreshing && <span style={{ fontSize: '10px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '3px' }}><RefreshCw size={9} className="spinning" /> refreshing</span>}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Sorted: High → Medium → Low · {visibleAlerts.length} showing{selectedAlertIds.size > 0 && ` · ${selectedAlertIds.size} selected`}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {['', 'high', 'medium', 'low'].map(sev => (
                                <button key={sev} onClick={() => setSeverityFilter(sev)} className={`btn ${severityFilter === sev ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ padding: '4px 10px', fontSize: '10px', textTransform: 'capitalize', color: severityFilter === sev ? undefined : sev ? SEVERITY_STYLES[sev]?.color : undefined }}>
                                    {sev || 'All'}
                                </button>
                            ))}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} style={{ width: '13px', height: '13px', cursor: 'pointer' }} />Active only
                            </label>
                        </div>
                    </div>
                    {/* Bulk Action Bar */}
                    {visibleAlerts.length > 0 && (
                        <div className="glass-card" style={{ padding: '10px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={selectedAlertIds.size === visibleAlerts.filter(a => a._id).length && selectedAlertIds.size > 0} onChange={e => e.target.checked ? selectAllVisible() : clearSelection()} style={{ width: '13px', height: '13px', cursor: 'pointer' }} />
                                Select All
                            </label>
                            {selectedAlertIds.size > 0 && (<>
                                <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600 }}>{selectedAlertIds.size} selected</span>
                                <button onClick={bulkResolve} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}><CheckCircle2 size={11} /> Resolve Selected</button>
                                <button onClick={bulkDismiss} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}><Trash2 size={11} /> Dismiss Selected</button>
                                <button onClick={clearSelection} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }}><X size={10} /> Clear</button>
                            </>)}
                        </div>
                    )}
                    {alertsLoading ? <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><Loader3D text="Loading alerts..." /></div>
                    : alertsError ? <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}><AlertTriangle size={28} color="var(--accent-warning)" style={{ marginBottom: '10px' }} /><p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{alertsError}</p></div>
                    : visibleAlerts.length === 0 ? <div className="glass-card" style={{ padding: '56px', textAlign: 'center' }}><CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '14px', opacity: 0.6 }} /><p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>No Alerts Found</p></div>
                    : (
                        <AnimatePresence>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {visibleAlerts.map((alert, i) => (
                                    <div key={alert._id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        {alert._id && <input type="checkbox" checked={selectedAlertIds.has(alert._id)} onChange={() => toggleSelectAlert(alert._id)} style={{ width: '14px', height: '14px', cursor: 'pointer', marginTop: '16px', flexShrink: 0 }} />}
                                        <div style={{ flex: 1 }}>
                                            <CriticalAlertCard alert={alert} tenantName={tenants.find(t => t.tenantId === alert.tenantId)?.displayName}
                                                onViewDetails={setDetailAlert} onResolve={handleResolve} onNavigateTenant={handleNavigateTenant} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AnimatePresence>
                    )}
                </section>
            )}

            {/* ═══ REPORTS TAB ═══ */}
            {activeTab === 'reports' && (
                <section style={{ marginTop: '20px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', borderRadius: '8px' }}><FileText size={14} color="white" /></div>
                            <div><h2 style={{ fontSize: '16px', fontWeight: 700 }}>Reports Hub</h2><span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{reportsTotal.toLocaleString()} total</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select value={reportTypeFilter} onChange={e => setReportTypeFilter(e.target.value)}
                                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: 'var(--text-primary)', outline: 'none' }}>
                                <option value="">All Types</option>
                                {reportTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {reportsLoading ? <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><Loader3D text="Loading reports..." /></div>
                        : reportsError ? <div style={{ padding: '40px', textAlign: 'center' }}><AlertTriangle size={28} color="var(--accent-warning)" style={{ marginBottom: '10px' }} /><p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{reportsError}</p></div>
                        : filteredReports.length === 0 ? <div style={{ padding: '56px', textAlign: 'center' }}><FileText size={36} color="var(--text-dim)" style={{ marginBottom: '14px', opacity: 0.4 }} /><p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>No Reports Found</p></div>
                        : (<>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {Object.entries(filteredReports.reduce((acc, r) => { if (!acc[r.tenantId]) acc[r.tenantId] = []; acc[r.tenantId].push(r); return acc; }, {})).map(([tid, curReports]) => {
                                    const tName = tenants.find(t => t.tenantId === tid)?.displayName || 'Unknown Tenant';
                                    return (
                                        <div key={tid} className="table-container" style={{ margin: 0 }}>
                                            <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Building2 size={15} color="var(--accent-blue)" />
                                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{tName}</h3>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto', background: 'var(--glass-bg)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>{curReports.length} report{curReports.length > 1 ? 's' : ''}</span>
                                            </div>
                                            <table className="modern-table" style={{ margin: 0 }}>
                                                <thead><tr><th>Report Title</th><th>Type</th><th>Last Updated</th><th>Actions</th></tr></thead>
                                                <tbody>
                                                    {curReports.map((report, i) => {
                                                        const tColor = TYPE_COLORS[report.type] || '#64748b';
                                                        return (
                                                            <tr key={report._id || i}>
                                                                <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{report.title}</td>
                                                                <td><span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, textTransform: 'capitalize', color: tColor, background: tColor + '22', border: `1px solid ${tColor}44` }}>{report.type}</span></td>
                                                                <td style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{formatDate(report.createdAt)}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                        <button onClick={() => handleNavigateTenant(report.tenantId)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}><ExternalLink size={10} /> View</button>
                                                                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={10} /> Export</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                            {reportsPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--glass-border)' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Page {reportsPage} of {reportsPages} — {reportsTotal.toLocaleString()} records</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => { setReportsPage(p => p - 1); fetchReports(reportsPage - 1); }} disabled={reportsPage <= 1} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', opacity: reportsPage <= 1 ? 0.4 : 1 }}><ChevronLeft size={13} /></button>
                                        <button onClick={() => { setReportsPage(p => p + 1); fetchReports(reportsPage + 1); }} disabled={reportsPage >= reportsPages} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', opacity: reportsPage >= reportsPages ? 0.4 : 1 }}><ChevronRight size={13} /></button>
                                    </div>
                                </div>
                            )}
                        </>)}
                    </div>
                </section>
            )}

            {/* ═══ INSIGHTS TAB ═══ */}
            {activeTab === 'insights' && (
                <section style={{ marginTop: '20px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ padding: '6px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '8px' }}><Zap size={14} color="white" /></div>
                        <div><h2 style={{ fontSize: '15px', fontWeight: 700 }}>Actionable Insights</h2><span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Auto-generated recommendations based on tenant data</span></div>
                    </div>
                    {insights.length === 0 ? (
                        <div className="glass-card" style={{ padding: '56px', textAlign: 'center' }}><CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '14px', opacity: 0.6 }} /><p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>All Clear</p><p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>No actionable insights at this time.</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {insights.map((insight, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                    className="glass-card" style={{ padding: '14px 18px', borderLeft: `3px solid ${insight.color}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ padding: '8px', borderRadius: '8px', background: insight.color + '22', border: `1px solid ${insight.color}44`, flexShrink: 0 }}>
                                        <insight.icon size={16} color={insight.color} />
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, flex: 1, lineHeight: 1.5 }}>{insight.message}</p>
                                    {insight.tenant && (
                                        <button onClick={() => handleNavigateTenant(insight.tenant.tenantId)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                            <ExternalLink size={10} /> View Tenant
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Pulse Animation CSS */}
            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }
            `}</style>
        </div>
    );
};

export default MultiTenantDashboard;
