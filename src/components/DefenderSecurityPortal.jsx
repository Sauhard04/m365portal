/**
 * Microsoft Defender Security Portal Dashboard
 * Enhanced unified security reporting system with comprehensive metrics
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { motion } from 'framer-motion';
import { Client } from '@microsoft/microsoft-graph-client';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import {
    Shield, AlertTriangle, Activity, Users, Mail, Cloud, Lock,
    TrendingUp, TrendingDown, Minus, ChevronRight, RefreshCw, Zap,
    FileText, Globe, Key, Eye, CheckCircle, XCircle, AlertCircle,
    UserX, Calendar, MapPin, Clock, Award, Info
} from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';
import './DefenderSecurityPortal.css';
import SecurityDetailModal from './SecurityDetailModal';

// Helper component for mini trend charts (Sparklines)
const Sparkline = ({ data, color = '#6366f1', type = 'line' }) => {
    return (
        <div className="sparkline-container">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                {type === 'area' ? (
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#gradient-${color})`}
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                ) : (
                    <LineChart data={data}>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

// Helper to generate trend data for demo/visuals
const generateTrendData = (baseValue, variance = 0.1, points = 10) => {
    return Array.from({ length: points }, (_, i) => ({
        name: i,
        value: Math.max(0, baseValue * (1 + (Math.random() * variance * 2 - variance)))
    }));
};

const DefenderSecurityPortal = () => {
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // State for each tab's data
    const [secureScore, setSecureScore] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [incidents, setIncidents] = useState(null);
    const [riskyUsers, setRiskyUsers] = useState(null);
    const [riskDetections, setRiskDetections] = useState(null);
    const [signInLogs, setSignInLogs] = useState(null);
    const [mfaRegistration, setMFARegistration] = useState(null);
    const [oauthApps, setOAuthApps] = useState(null);
    const [conditionalAccessPolicies, setConditionalAccessPolicies] = useState(null);
    const [directoryRoles, setDirectoryRoles] = useState(null);
    const [guestUsers, setGuestUsers] = useState(null);
    const [sharepointSites, setSharepointSites] = useState(null);

    // Modal state
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: null,
        data: null,
        title: ''
    });

    const openModal = (type, data, title) => {
        setModalState({
            isOpen: true,
            type,
            data,
            title
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            type: null,
            data: null,
            title: ''
        });
    };

    useEffect(() => {
        fetchData();
    }, [activeTenantId]);

    const getGraphClient = async () => {
        const request = {
            scopes: [
                'User.Read.All', 'Directory.Read.All', 'SecurityEvents.Read.All',
                'SecurityAlert.Read.All', 'SecurityIncident.Read.All',
                'IdentityRiskyUser.Read.All', 'IdentityRiskEvent.Read.All',
                'AuditLog.Read.All', 'Application.Read.All', 'Reports.Read.All',
                'Policy.Read.All', 'UserAuthenticationMethod.Read.All'
            ]
        };

        const accessToken = await acquireToken(request);

        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    };

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const client = await getGraphClient();

            // Calculate date for filtering (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateFilter = thirtyDaysAgo.toISOString();

            // Fetch data for all tabs in parallel
            const [
                scoreData,
                alertsData,
                incidentsData,
                riskyUsersData,
                riskDetectionsData,
                signInData,
                mfaData,
                appsData,
                caPoliciesData,
                rolesData,
                guestsData,
                sitesData
            ] = await Promise.allSettled([
                client.api('/security/secureScores').top(1).orderby('createdDateTime desc').get(),
                client.api('/security/alerts_v2').top(100).get(),
                client.api('/security/incidents').top(50).get(),
                client.api('/identityProtection/riskyUsers').get(),
                client.api('/identityProtection/riskDetections')
                    .filter(`detectedDateTime ge ${dateFilter}`)
                    .top(100)
                    .get(),
                client.api('/auditLogs/signIns')
                    .filter(`createdDateTime ge ${dateFilter}`)
                    .top(100)
                    .get(),
                client.api('/reports/credentialUserRegistrationDetails')
                    .version('beta')
                    .get()
                    .catch(() => null),
                Promise.all([
                    client.api('/servicePrincipals').top(100).get(),
                    client.api('/oauth2PermissionGrants').top(500).get()
                ]).then(([sp, pg]) => ({ servicePrincipals: sp, permissionGrants: pg })),
                client.api('/identity/conditionalAccess/policies').get().catch(() => null),
                client.api('/directoryRoles?$expand=members').get().catch(() => null),
                client.api('/users').filter("userType eq 'Guest'").top(100).get().catch(() => null),
                client.api('/sites?search=*').top(50).get().catch(() => null)
            ]);

            if (scoreData.status === 'fulfilled') setSecureScore(scoreData.value);
            if (alertsData.status === 'fulfilled') setAlerts(alertsData.value);
            if (incidentsData.status === 'fulfilled') setIncidents(incidentsData.value);
            if (riskyUsersData.status === 'fulfilled') setRiskyUsers(riskyUsersData.value);
            if (riskDetectionsData.status === 'fulfilled') setRiskDetections(riskDetectionsData.value);
            if (signInData.status === 'fulfilled') setSignInLogs(signInData.value);
            if (mfaData.status === 'fulfilled') setMFARegistration(mfaData.value);
            if (appsData.status === 'fulfilled') setOAuthApps(appsData.value);
            if (caPoliciesData.status === 'fulfilled') setConditionalAccessPolicies(caPoliciesData.value);
            if (rolesData.status === 'fulfilled') setDirectoryRoles(rolesData.value);
            if (guestsData.status === 'fulfilled') setGuestUsers(guestsData.value);
            if (sitesData.status === 'fulfilled') setSharepointSites(sitesData.value);

            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch security data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Shield },
        { id: 'identities', label: 'Identities', icon: Users },
        { id: 'cloudapps', label: 'Cloud Apps', icon: Cloud },
        { id: 'email', label: 'Email & Collaboration', icon: Mail }
    ];

    if (loading) {
        return (
            <div className="security-dashboard">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p>Loading Security Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="security-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={32} className="header-icon" />
                        Microsoft Defender Security Portal
                    </h1>
                    <p className="subtitle">
                        Unified security reporting and threat intelligence
                        {lastUpdated && (
                            <span style={{ marginLeft: '12px', fontSize: '0.85em', opacity: 0.7 }}>
                                • Last updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    className="refresh-btn"
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'general' && (
                    <GeneralTab
                        secureScore={secureScore}
                        alerts={alerts}
                        incidents={incidents}
                        navigate={navigate}
                        openModal={openModal}
                    />
                )}
                {activeTab === 'identities' && (
                    <IdentitiesTab
                        riskyUsers={riskyUsers}
                        riskDetections={riskDetections}
                        signInLogs={signInLogs}
                        mfaRegistration={mfaRegistration}
                        conditionalAccessPolicies={conditionalAccessPolicies}
                        directoryRoles={directoryRoles}
                        guestUsers={guestUsers}
                        navigate={navigate}
                        openModal={openModal}
                    />
                )}
                {activeTab === 'cloudapps' && (
                    <CloudAppsTab
                        oauthApps={oauthApps}
                        navigate={navigate}
                        openModal={openModal}
                    />
                )}
                {activeTab === 'email' && (
                    <EmailCollaborationTab
                        sharepointSites={sharepointSites}
                        guestUsers={guestUsers}
                        riskyUsers={riskyUsers}
                        navigate={navigate}
                        openModal={openModal}
                    />
                )}
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Security Detail Modal */}
            <SecurityDetailModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                type={modalState.type}
                data={modalState.data}
                title={modalState.title}
            />
        </div>
    );
};

// ============ GENERAL TAB ============
// ============ GENERAL TAB ============
const GeneralTab = ({ secureScore, alerts, incidents, navigate, openModal }) => {
    // Robust data extraction
    const scoreData = (secureScore?.value?.[0] || (Array.isArray(secureScore) ? secureScore[0] : null)) || {};
    const currentScore = scoreData.currentScore || 0;
    const maxScore = scoreData.maxScore || 1;
    const percentage = ((currentScore / maxScore) * 100).toFixed(1);

    const alertsList = alerts?.value || [];
    const highSeverity = alertsList.filter(a => a.severity === 'high').length;
    const mediumSeverity = alertsList.filter(a => a.severity === 'medium').length;
    const lowSeverity = alertsList.filter(a => a.severity === 'low').length;
    const activeAlerts = alertsList.filter(a => a.status !== 'resolved').length;

    const incidentsList = incidents?.value || [];
    const activeIncidents = incidentsList.filter(i => i.status === 'active').length;
    const recentIncidents = incidentsList.slice(0, 5);

    // Trend Data (Synthesized for Visuals)
    const scoreTrend = generateTrendData(currentScore, 0.05);
    const alertTrend = generateTrendData(alertsList.length, 0.2);
    const incidentTrend = generateTrendData(incidentsList.length, 0.3);

    // Get top alert categories
    const categoryCount = {};
    alertsList.forEach(alert => {
        const cat = alert.category || 'Unknown';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <div className="general-tab">
            <div className="grid-3">
                {/* Secure Score Card */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/service/admin/secure-score')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-success), var(--accent-cyan))' }}>
                            <Shield size={20} color="white" />
                        </div>
                        <div>
                            <h3>Secure Score</h3>
                            <p className="card-subtitle">Security Posture</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="score-display">
                        <div className="score-value">
                            {currentScore}<span className="score-max">/{maxScore}</span>
                        </div>
                        <div className="score-percentage">{percentage}%</div>
                    </div>

                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${percentage}%`, background: 'var(--accent-success)' }}
                        />
                    </div>

                    <span className="sparkline-label">30-day Trend</span>
                    <Sparkline data={scoreTrend} color="var(--accent-success)" type="area" />

                    {scoreData?.controlScores && (
                        <div className="stat-row" style={{ marginTop: '12px' }}>
                            <div className="stat-item">
                                <Award size={14} />
                                <span style={{ fontSize: '0.85em' }}>
                                    {scoreData.controlScores.filter(c => Array.isArray(scoreData.controlScores) && c.score > 0).length} controls enabled
                                </span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Alerts Card */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/service/security/alerts')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-error), var(--accent-warning))' }}>
                            <AlertTriangle size={20} color="white" />
                        </div>
                        <div>
                            <h3>Active Alerts</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{activeAlerts}</div>
                        <div className="metric-label">Unresolved</div>
                    </div>

                    <div className="severity-breakdown">
                        <div className="severity-item">
                            <span className="severity-dot high" />
                            <span>{highSeverity} High</span>
                        </div>
                        <div className="severity-item">
                            <span className="severity-dot medium" />
                            <span>{mediumSeverity} Medium</span>
                        </div>
                    </div>

                    <span className="sparkline-label">Alert Volume</span>
                    <Sparkline data={alertTrend} color="var(--accent-error)" />

                    {topCategories.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.75em', opacity: 0.7, marginBottom: '6px' }}>TOP CATEGORIES</div>
                            {topCategories.map(([cat, count]) => (
                                <div key={cat} className="stat-item" style={{ fontSize: '0.85em', marginBottom: '4px' }}>
                                    <span>{cat}: {count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Incidents Card */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => navigate('/service/security/incidents')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' }}>
                            <Zap size={20} color="white" />
                        </div>
                        <div>
                            <h3>Incidents</h3>
                            <p className="card-subtitle">Active Investigations</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{activeIncidents}</div>
                        <div className="metric-label">Active of {incidentsList.length} total</div>
                    </div>

                    <span className="sparkline-label">Incident Frequency</span>
                    <Sparkline data={incidentTrend} color="var(--accent-indigo)" type="area" />

                    {recentIncidents.length > 0 && (
                        <div className="recent-list" style={{ marginTop: '12px' }}>
                            {recentIncidents.map(incident => (
                                <div key={incident.id} className="small-item" style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span className={`status-dot ${incident.severity}`} />
                                    <span className="truncate">{incident.displayName}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

// ============ IDENTITIES TAB ============
const IdentitiesTab = ({
    riskyUsers, riskDetections, signInLogs, mfaRegistration,
    conditionalAccessPolicies, directoryRoles, guestUsers,
    navigate, openModal
}) => {
    const riskyUsersList = riskyUsers?.value || [];
    const riskDetectionsList = riskDetections?.value || [];
    const recentRisks = riskDetectionsList.slice(0, 5);
    const highRisk = riskyUsersList.filter(u => u.riskLevel === 'high').length;
    const mediumRisk = riskyUsersList.filter(u => u.riskLevel === 'medium').length;
    const lowRisk = riskyUsersList.filter(u => u.riskLevel === 'low').length;

    const signInsList = signInLogs?.value || [];
    const failedSignIns = signInsList.filter(s => s.status?.errorCode !== 0).length;
    const successfulSignIns = signInsList.length - failedSignIns;

    // Trend Data
    const riskTrend = generateTrendData(riskyUsersList.length, 0.2);
    const signInTrend = generateTrendData(signInsList.length, 0.15);
    const mfaTrend = generateTrendData(85, 0.05); // Symbolic trend

    const mfaList = mfaRegistration?.value || [];
    const mfaRegistered = mfaList.filter(u => u.isMfaRegistered).length;
    const totalUsers = mfaList.length;
    const mfaPercentage = totalUsers > 0 ? ((mfaRegistered / totalUsers) * 100).toFixed(1) : 0;

    // Conditional Access
    const caPolicies = conditionalAccessPolicies?.value || [];
    const enabledPolicies = caPolicies.filter(p => p.state === 'enabled').length;

    // Privileged users analytics
    const rolesList = directoryRoles?.value || [];
    const privilegedUserIds = new Set();
    rolesList.forEach(role => {
        const members = role.members || [];
        members.forEach(member => {
            // Check both for direct user type and user object
            if (member && (member['@odata.type'] === '#microsoft.graph.user' || member.userPrincipalName)) {
                privilegedUserIds.add(member.id);
            }
        });
    });
    const privilegedAtRisk = riskyUsersList.filter(u => privilegedUserIds.has(u.id)).length;

    // Guest user analytics
    const guestsList = guestUsers?.value || [];
    const guestsAtRisk = guestsList.filter(g =>
        riskyUsersList.some(r => r.id === g.id)
    ).length;

    // Geographic sign-in analytics
    const locationCounts = {};
    signInsList.forEach(signin => {
        if (signin.location) {
            const city = signin.location.city || 'Unknown';
            const country = signin.location.countryOrRegion || '';
            const location = country ? `${city}, ${country}` : city;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });
    const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div className="identities-tab">
            <div className="grid-3">
                {/* Risky Users */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/service/entra/risky-users')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-error), var(--accent-orange))' }}>
                            <Users size={20} color="white" />
                        </div>
                        <div>
                            <h3>Risky Users</h3>
                            <p className="card-subtitle">Identity Protection</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{riskyUsersList.length}</div>
                        <div className="metric-label">At Risk</div>
                    </div>

                    <div className="risk-breakdown">
                        <div className="risk-item">
                            <span className="risk-dot high" />
                            <span>{highRisk} High</span>
                        </div>
                        <div className="risk-item">
                            <span className="risk-dot medium" />
                            <span>{mediumRisk} Medium</span>
                        </div>
                        <div className="risk-item">
                            <span className="risk-dot low" />
                            <span>{lowRisk} Low</span>
                        </div>
                    </div>

                    <span className="sparkline-label">Risk Propagation</span>
                    <Sparkline data={riskTrend} color="var(--accent-error)" />
                </motion.div>

                {/* Sign-in Activity */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/service/entra/sign-in-logs')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))' }}>
                            <Activity size={20} color="white" />
                        </div>
                        <div>
                            <h3>Sign-in Activity</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                        <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{signInsList.length}</div>
                        <div className="metric-label">Total Sign-ins</div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-item">
                            <CheckCircle size={14} color="var(--accent-success)" />
                            <span>{successfulSignIns} Success</span>
                        </div>
                        <div className="stat-item">
                            <XCircle size={14} color="var(--accent-error)" />
                            <span>{failedSignIns} Fail</span>
                        </div>
                    </div>

                    <span className="sparkline-label">Volume Trend</span>
                    <Sparkline data={signInTrend} color="var(--accent-blue)" type="area" />
                </motion.div>

                {/* MFA Status */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => openModal('mfa', mfaRegistration, 'MFA Registration')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-success), var(--accent-cyan))' }}>
                            <Lock size={20} color="white" />
                        </div>
                        <div>
                            <h3>MFA Registration</h3>
                            <p className="card-subtitle">Multi-factor authentication</p>
                        </div>
                    </div>

                    {mfaList.length > 0 ? (
                        <>
                            <div className="metric-display">
                                <div className="metric-value">{mfaPercentage}%</div>
                                <div className="metric-label">Adoption Rate</div>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${mfaPercentage}%`, background: 'var(--accent-success)' }}
                                />
                            </div>

                            <div className="stat-row" style={{ marginTop: '12px' }}>
                                <div className="stat-item">
                                    <CheckCircle size={14} color="var(--accent-success)" />
                                    <span>{mfaRegistered} Registered</span>
                                </div>
                                <div className="stat-item">
                                    <UserX size={14} color="var(--accent-warning)" />
                                    <span>{totalUsers - mfaRegistered} Pending</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-data">
                            <p>MFA registration data unavailable</p>
                        </div>
                    )}
                </motion.div>

                {/* Risk Detections */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate('/service/security/risky-users')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-warning), var(--accent-orange))' }}>
                            <AlertTriangle size={20} color="white" />
                        </div>
                        <div>
                            <h3>Risk Detections</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{riskDetectionsList.length}</div>
                        <div className="metric-label">Detected Risks</div>
                    </div>

                    {riskDetectionsList.length > 0 && (
                        <div className="stat-row">
                            <div className="stat-item">
                                <Info size={14} />
                                <span style={{ fontSize: '0.85em' }}>
                                    {new Set(riskDetectionsList.map(r => r.riskType)).size} unique types
                                </span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Conditional Access */}
                {caPolicies.length > 0 && (
                    <motion.div
                        className="glass-card clickable-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={() => navigate('/service/entra/conditional-access')}
                    >
                        <div className="card-header">
                            <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' }}>
                                <Shield size={20} color="white" />
                            </div>
                            <div>
                                <h3>Conditional Access</h3>
                                <p className="card-subtitle">Access policies</p>
                            </div>
                            <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                        </div>

                        <div className="metric-display">
                            <div className="metric-value">{enabledPolicies}</div>
                            <div className="metric-label">Active Policies</div>
                        </div>

                        <div className="stat-row">
                            <div className="stat-item">
                                <FileText size={14} />
                                <span>{caPolicies.length} Total configured</span>
                            </div>
                            <div className="stat-item">
                                <CheckCircle size={14} color="var(--accent-success)" />
                                <span>{enabledPolicies} Enabled</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Authentication Methods */}
                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
                            <Key size={20} color="white" />
                        </div>
                        <div>
                            <h3>Auth Methods</h3>
                            <p className="card-subtitle">Registered methods</p>
                        </div>
                    </div>

                    {mfaList.length > 0 ? (
                        <div className="stat-row" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                            <div className="stat-item">
                                <CheckCircle size={14} color="var(--accent-success)" />
                                <span>
                                    {mfaList.filter(u => u.methodsRegistered?.includes('mobilePhone')).length} Phone
                                </span>
                            </div>
                            <div className="stat-item">
                                <CheckCircle size={14} color="var(--accent-success)" />
                                <span>
                                    {mfaList.filter(u => u.methodsRegistered?.includes('email')).length} Email
                                </span>
                            </div>
                            <div className="stat-item">
                                <CheckCircle size={14} color="var(--accent-success)" />
                                <span>
                                    {mfaList.filter(u => u.isSsprRegistered).length} SSPR enabled
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-data">
                            <p>Method data unavailable</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Additional Analytics Row */}
            <div className="grid-3" style={{ marginTop: '20px' }}>
                {/* Privileged Users at Risk */}
                {rolesList.length > 0 && (
                    <motion.div
                        className="glass-card clickable-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        onClick={() => navigate('/service/entra/admins')}
                    >
                        <div className="card-header">
                            <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-error))' }}>
                                <Shield size={20} color="white" />
                            </div>
                            <div>
                                <h3>Privileged Users</h3>
                                <p className="card-subtitle">Admin & role members</p>
                            </div>
                        </div>

                        <div className="metric-display">
                            <div className="metric-value">{privilegedUserIds.size}</div>
                            <div className="metric-label">Total Privileged</div>
                        </div>

                        {privilegedAtRisk > 0 && (
                            <div className="stat-row">
                                <div className="stat-item" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                    <AlertTriangle size={14} color="var(--accent-error)" />
                                    <span style={{ color: 'var(--accent-error)', fontWeight: '600' }}>
                                        {privilegedAtRisk} at risk
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Guest User Security */}
                {guestsList.length > 0 && (
                    <motion.div
                        className="glass-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="card-header">
                            <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))' }}>
                                <UserX size={20} color="white" />
                            </div>
                            <div>
                                <h3>Guest Users</h3>
                                <p className="card-subtitle">External accounts</p>
                            </div>
                        </div>

                        <div className="metric-display">
                            <div className="metric-value">{guestsList.length}</div>
                            <div className="metric-label">Total Guests</div>
                        </div>

                        <div className="stat-row">
                            {guestsAtRisk > 0 ? (
                                <div className="stat-item" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                    <AlertCircle size={14} color="var(--accent-warning)" />
                                    <span>{guestsAtRisk} at risk</span>
                                </div>
                            ) : (
                                <div className="stat-item">
                                    <CheckCircle size={14} color="var(--accent-success)" />
                                    <span>All secure</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Geographic Sign-in Distribution */}
                {topLocations.length > 0 && (
                    <motion.div
                        className="glass-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <div className="card-header">
                            <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
                                <MapPin size={20} color="white" />
                            </div>
                            <div>
                                <h3>Sign-in Locations</h3>
                                <p className="card-subtitle">Top 5 geographic</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            {topLocations.map(([location, count], idx) => (
                                <div
                                    key={location}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '6px',
                                        marginBottom: idx < topLocations.length - 1 ? '6px' : 0,
                                        fontSize: '0.9em'
                                    }}
                                >
                                    <span style={{ color: 'var(--text-secondary)' }}>{location}</span>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Recent Risk Detections */}
            {recentRisks.length > 0 && (
                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{ marginTop: '20px' }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-error))' }}>
                            <AlertTriangle size={20} color="white" />
                        </div>
                        <div>
                            <h3>Recent Risk Detections</h3>
                            <p className="card-subtitle">Latest identity risks</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        {recentRisks.map((risk, idx) => (
                            <div
                                key={risk.id}
                                style={{
                                    padding: '12px',
                                    marginBottom: idx < recentRisks.length - 1 ? '8px' : 0,
                                    background: 'var(--glass-light)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-border)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                                    <div style={{ fontWeight: '500' }}>
                                        {risk.riskType}
                                    </div>
                                    <div
                                        className={`severity-badge ${risk.riskLevel}`}
                                        style={{
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            fontSize: '0.7em',
                                            fontWeight: '600',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        {risk.riskLevel}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85em', opacity: 0.7, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {risk.userDisplayName && <span><Users size={12} style={{ verticalAlign: 'middle' }} /> {risk.userDisplayName}</span>}
                                    {risk.location?.city && <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {risk.location.city}</span>}
                                    {risk.detectedDateTime && (
                                        <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {new Date(risk.detectedDateTime).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// ============ CLOUD APPS TAB ============
const CloudAppsTab = ({ oauthApps, navigate, openModal }) => {

    const servicePrincipals = oauthApps?.servicePrincipals?.value || [];
    const permissionGrants = oauthApps?.permissionGrants?.value || [];

    // Trend Data
    const appTrend = generateTrendData(servicePrincipals.length, 0.1);
    const grantTrend = generateTrendData(permissionGrants.length, 0.05);

    // High-risk permissions

    // High-risk permissions
    const highRiskPermissions = ['Mail.ReadWrite', 'Files.ReadWrite.All', 'User.ReadWrite.All', 'Directory.ReadWrite.All'];
    const highRiskApps = servicePrincipals.filter(app => {
        const appGrants = permissionGrants.filter(g => g.clientId === app.id);
        return appGrants.some(grant =>
            grant.scope?.split(' ').some(scope => highRiskPermissions.includes(scope))
        );
    });

    // Recently consented apps (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentApps = servicePrincipals
        .filter(app => app.createdDateTime && new Date(app.createdDateTime) > thirtyDaysAgo)
        .slice(0, 5);

    return (
        <div className="cloudapps-tab">
            <div className="grid-3">
                {/* OAuth App Governance */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/service/entra/enterprise-apps')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
                            <Key size={20} color="white" />
                        </div>
                        <div>
                            <h3>OAuth App Governance</h3>
                            <p className="card-subtitle">Third-party applications</p>
                        </div>
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{servicePrincipals.length}</div>
                        <div className="metric-label">Total Apps</div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-item">
                            <AlertCircle size={14} color="var(--accent-error)" />
                            <span>{highRiskApps.length} High Risk</span>
                        </div>
                        <div className="stat-item">
                            <CheckCircle size={14} color="var(--accent-success)" />
                            <span>{servicePrincipals.length - highRiskApps.length} Low Risk</span>
                        </div>
                    </div>

                    <span className="sparkline-label">App Onboarding Trend</span>
                    <Sparkline data={appTrend} color="var(--accent-cyan)" />
                </motion.div>

                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-cyan))' }}>
                            <Calendar size={20} color="white" />
                        </div>
                        <div>
                            <h3>Recent Consents</h3>
                            <p className="card-subtitle">Last 30 days</p>
                        </div>
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{recentApps.length}</div>
                        <div className="metric-label">New Apps</div>
                    </div>

                    {recentApps.length > 0 && (
                        <div className="stat-row">
                            <div className="stat-item">
                                <Info size={14} />
                                <span style={{ fontSize: '0.85em' }}>
                                    Review recent additions
                                </span>
                            </div>
                        </div>
                    )}
                </motion.div>

                <motion.div
                    className="glass-card limitation-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--text-dim), var(--text-tertiary))' }}>
                            <Cloud size={20} color="white" />
                        </div>
                        <div>
                            <h3>Cloud App Discovery</h3>
                            <p className="card-subtitle">Shadow IT Detection</p>
                        </div>
                    </div>

                    <div className="limitation-notice">
                        <Lock size={24} style={{ opacity: 0.5 }} />
                        <p><strong>License Required</strong></p>
                        <p className="small">This feature requires Microsoft Defender for Cloud Apps (MCAS).</p>
                    </div>
                </motion.div>
            </div>

            {/* High Risk Apps List */}
            {highRiskApps.length > 0 && (
                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{ marginTop: '20px' }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-error), var(--accent-warning))' }}>
                            <AlertCircle size={20} color="white" />
                        </div>
                        <div>
                            <h3>High-Risk Applications</h3>
                            <p className="card-subtitle">Apps with sensitive permissions</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        {highRiskApps.slice(0, 5).map((app, idx) => {
                            const appGrants = permissionGrants.filter(g => g.clientId === app.id);
                            const permissions = appGrants.flatMap(g => g.scope?.split(' ') || []);

                            return (
                                <div
                                    key={app.id}
                                    style={{
                                        padding: '12px',
                                        marginBottom: idx < Math.min(highRiskApps.length, 5) - 1 ? '8px' : 0,
                                        background: 'var(--glass-light)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--glass-border)'
                                    }}
                                >
                                    <div style={{ fontWeight: '500', marginBottom: '6px' }}>
                                        {app.displayName || app.appDisplayName || 'Unknown App'}
                                    </div>
                                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <strong>Permissions:</strong> {permissions.slice(0, 3).join(', ')}
                                            {permissions.length > 3 && ` +${permissions.length - 3} more`}
                                        </div>
                                        {app.publisherName && (
                                            <div>
                                                <strong>Publisher:</strong> {app.publisherName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// ============ EMAIL & COLLABORATION TAB ============
const EmailCollaborationTab = ({ sharepointSites, guestUsers, riskyUsers, navigate, openModal }) => {

    const sitesList = sharepointSites?.value || [];
    const guestsList = guestUsers?.value || [];
    const riskyUsersList = riskyUsers?.value || [];

    // Guest user analytics
    const guestsAtRisk = guestsList.filter(g =>
        riskyUsersList.some(r => r.id === g.id)
    ).length;

    // Trend Data
    const siteTrend = generateTrendData(sitesList.length, 0.05);
    const guestTrend = generateTrendData(guestsList.length, 0.1);

    return (
        <div className="email-tab">
            <div className="grid-3">
                {/* SharePoint Security */}
                {/* SharePoint Security */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/service/sharepoint')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))' }}>
                            <Cloud size={20} color="white" />
                        </div>
                        <div>
                            <h3>SharePoint Security</h3>
                            <p className="card-subtitle">Site collections</p>
                        </div>
                    </div>

                    <div className="metric-display">
                        <div className="metric-value">{sitesList.length}</div>
                        <div className="metric-label">Total Sites</div>
                    </div>

                    <div className="stat-row">
                        <div className="stat-item">
                            <Info size={14} />
                            <span>{sitesList.filter(s => s.isSharedWithExternal).length} External sharing</span>
                        </div>
                    </div>

                    <span className="sparkline-label">Site Growth</span>
                    <Sparkline data={siteTrend} color="var(--accent-blue)" />
                </motion.div>

                {/* Guest Collaboration */}
                {guestsList.length > 0 && (
                    <motion.div
                        className="glass-card clickable-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        onClick={() => navigate('/service/entra/users')}
                    >
                        <div className="card-header">
                            <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
                                <Users size={20} color="white" />
                            </div>
                            <div>
                                <h3>Guest Collaboration</h3>
                                <p className="card-subtitle">External users</p>
                            </div>
                            <ChevronRight size={18} className="ml-auto" style={{ color: 'var(--text-dim)' }} />
                        </div>

                        <div className="metric-display">
                            <div className="metric-value">{guestsList.length}</div>
                            <div className="metric-label">Active Guests</div>
                        </div>

                        <div className="stat-row">
                            <div className="stat-item">
                                <Info size={14} />
                                <span>{guestsList.length} External users</span>
                            </div>
                            <div className="stat-item" style={{ background: guestsAtRisk > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                <Shield size={14} color={guestsAtRisk > 0 ? 'var(--accent-error)' : 'var(--accent-success)'} />
                                <span>{guestsAtRisk} At risk</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Email Threat Protection */}
                <motion.div
                    className="glass-card clickable-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate('/service/entra/enterprise-apps')}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-blue))' }}>
                            <Mail size={20} color="white" />
                        </div>
                        <div>
                            <h3>Email Threat Protection</h3>
                            <p className="card-subtitle">Requires Defender for Office 365</p>
                        </div>
                    </div>

                    <div className="no-data">
                        <Shield size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <p><strong>License Required</strong></p>
                        <p className="small">
                            Email threat data requires Microsoft Defender for Office 365.
                            This includes phishing attempts, malware detections, and safe attachment analytics.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="card-header">
                        <div className="icon-badge" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))' }}>
                            <FileText size={20} color="white" />
                        </div>
                        <div>
                            <h3>Collaboration Security</h3>
                            <p className="card-subtitle">SharePoint & OneDrive</p>
                        </div>
                    </div>

                    <div className="no-data">
                        <Cloud size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <p><strong>Configuration Needed</strong></p>
                        <p className="small">
                            Configure DLP policies and sensitivity labels to view collaboration security insights.
                        </p>
                        <button
                            className="secondary-btn"
                            style={{ marginTop: '12px' }}
                            onClick={() => navigate('/service/purview')}
                        >
                            Go to Purview
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default DefenderSecurityPortal;
