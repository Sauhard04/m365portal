/**
 * Security Detail Modal Component
 * Reusable modal for displaying detailed security information
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Shield, Users, Activity, Cloud, Mail, MapPin, Globe, Key, Download } from 'lucide-react';
import './SecurityDetailModal.css';

const SecurityDetailModal = ({ isOpen, onClose, type, data, title }) => {
    // CSV Export Logic
    const exportToCSV = () => {
        if (!data) return;

        const list = data.value || data || [];
        if (!Array.isArray(list) || list.length === 0) return;

        // Generate headers from the first object
        const headers = Object.keys(list[0]).filter(k => typeof list[0][k] !== 'object');
        const csvRows = [headers.join(',')];

        for (const row of list) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `security_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Render different content based on type
    const renderContent = () => {
        switch (type) {
            case 'secureScore':
                return <SecureScoreDetails data={data} />;
            case 'alerts':
                return <AlertsDetails data={data} />;
            case 'incidents':
                return <IncidentsDetails data={data} />;
            case 'riskyUsers':
                return <RiskyUsersDetails data={data} />;
            case 'signIns':
                return <SignInsDetails data={data} />;
            case 'mfa':
                return <MFADetails data={data} />;
            case 'conditionalAccess':
                return <ConditionalAccessDetails data={data} />;
            case 'privilegedUsers':
                return <PrivilegedUsersDetails data={data} />;
            case 'guestUsers':
                return <GuestUsersDetails data={data} />;
            case 'geographic':
                return <GeographicDetails data={data} />;
            case 'oauthApps':
                return <OAuthAppsDetails data={data} />;
            case 'sharepoint':
                return <SharePointDetails data={data} />;
            default:
                return <div className="no-data">No details available</div>;
        }
    };

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose}>
                <motion.div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="modal-header">
                        <h2>{title}</h2>
                        <div className="modal-header-actions">
                            <button className="export-btn" onClick={exportToCSV} title="Export to CSV">
                                <Download size={18} />
                                <span>Export</span>
                            </button>
                            <button className="modal-close" onClick={onClose}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    <div className="modal-content">
                        {renderContent()}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// Detail view components for each type

const SecureScoreDetails = ({ data }) => {
    const scoreValue = data?.value?.[0];
    const controls = scoreValue?.controlScores || [];
    const topControls = controls.slice(0, 10);

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{scoreValue?.currentScore || 0}</div>
                    <div className="stat-label">Current Score</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{scoreValue?.maxScore || 0}</div>
                    <div className="stat-label">Maximum Score</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{controls.length}</div>
                    <div className="stat-label">Total Controls</div>
                </div>
            </div>

            <h3>Top Improvement Opportunities</h3>
            <div className="detail-table">
                {topControls.map((control, idx) => (
                    <div key={idx} className="detail-row">
                        <div className="control-info">
                            <div className="control-name">{control.controlName}</div>
                            <div className="control-category">{control.controlCategory}</div>
                        </div>
                        <div className="control-score">
                            <span className={`score-badge ${control.score >= control.max ? 'complete' : 'incomplete'}`}>
                                {control.score} / {control.max}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AlertsDetails = ({ data }) => {
    const alerts = data?.value || [];

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{alerts.length}</div>
                    <div className="stat-label">Total Alerts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{alerts.filter(a => a.severity === 'high').length}</div>
                    <div className="stat-label">High Severity</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{alerts.filter(a => a.status !== 'resolved').length}</div>
                    <div className="stat-label">Active</div>
                </div>
            </div>

            <h3>All Security Alerts</h3>
            <div className="detail-table">
                {alerts.map((alert) => (
                    <div key={alert.id} className="detail-row alert-row">
                        <div className="alert-info">
                            <div className="alert-title">
                                {alert.title}
                                <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
                            </div>
                            <div className="alert-meta">
                                {alert.category} • {new Date(alert.createdDateTime).toLocaleString()}
                            </div>
                        </div>
                        <div className={`status-badge ${alert.status}`}>
                            {alert.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IncidentsDetails = ({ data }) => {
    const incidents = data?.value || [];

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{incidents.length}</div>
                    <div className="stat-label">Total Incidents</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{incidents.filter(i => i.status === 'active').length}</div>
                    <div className="stat-label">Active</div>
                </div>
            </div>

            <h3>All Security Incidents</h3>
            <div className="detail-table">
                {incidents.map((incident) => (
                    <div key={incident.id} className="detail-row incident-row">
                        <div className="incident-info">
                            <div className="incident-title">
                                {incident.displayName}
                                <span className={`severity-badge ${incident.severity}`}>{incident.severity}</span>
                            </div>
                            <div className="incident-meta">
                                {incident.classification || 'Unclassified'} • {new Date(incident.createdDateTime).toLocaleString()}
                            </div>
                            {incident.assignedTo && (
                                <div className="incident-assigned">Assigned to: {incident.assignedTo}</div>
                            )}
                        </div>
                        <div className={`status-badge ${incident.status}`}>
                            {incident.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RiskyUsersDetails = ({ data }) => {
    const users = data?.value || [];

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{users.length}</div>
                    <div className="stat-label">Total Risky Users</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{users.filter(u => u.riskLevel === 'high').length}</div>
                    <div className="stat-label">High Risk</div>
                </div>
            </div>

            <h3>All Risky Users</h3>
            <div className="detail-table">
                {users.map((user) => (
                    <div key={user.id} className="detail-row">
                        <div className="user-info">
                            <div className="user-name">
                                {user.userPrincipalName}
                                <span className={`severity-badge ${user.riskLevel}`}>{user.riskLevel}</span>
                            </div>
                            <div className="user-meta">
                                State: {user.riskState} • Last Updated: {new Date(user.riskLastUpdatedDateTime).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SignInsDetails = ({ data }) => {
    const signIns = data?.value || [];

    return (
        <div className="detail-view">
            <h3>Recent Sign-in Activity</h3>
            <div className="detail-table">
                {signIns.map((signin, idx) => (
                    <div key={idx} className="detail-row signin-row">
                        <div className="signin-info">
                            <div className="signin-user">{signin.userPrincipalName}</div>
                            <div className="signin-meta">
                                {signin.appDisplayName} • {signin.location?.city || 'Unknown'}, {signin.location?.countryOrRegion || 'Unknown'}
                            </div>
                            <div className="signin-time">{new Date(signin.createdDateTime).toLocaleString()}</div>
                        </div>
                        <div className={`status-badge ${signin.status?.errorCode === 0 ? 'success' : 'error'}`}>
                            {signin.status?.errorCode === 0 ? 'Success' : 'Failed'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Placeholder components for other detail views (to be enhanced)
const MFADetails = ({ data }) => {
    const users = data?.value || [];
    const total = users.length;
    const registered = users.filter(u => u.isMfaRegistered).length;
    const rate = total > 0 ? ((registered / total) * 100).toFixed(1) : 0;

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{rate}%</div>
                    <div className="stat-label">Adoption Rate</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{registered}</div>
                    <div className="stat-label">Registered</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{total - registered}</div>
                    <div className="stat-label">Pending</div>
                </div>
            </div>

            <h3>User Registration Status</h3>
            <div className="detail-table">
                {users.slice(0, 50).map((user) => (
                    <div key={user.id} className="detail-row">
                        <div className="user-info">
                            <div className="user-name">
                                {user.userDisplayName || user.userPrincipalName}
                                <span className={`status-badge ${user.isMfaRegistered ? 'success' : 'warning'}`}>
                                    {user.isMfaRegistered ? 'Registered' : 'Not Registered'}
                                </span>
                            </div>
                            <div className="user-meta">
                                {user.userPrincipalName} • Methods: {user.authMethods?.join(', ') || 'None'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {users.length > 50 && <p className="table-footer">Showing first 50 of {users.length} users</p>}
        </div>
    );
};

const ConditionalAccessDetails = ({ data }) => {
    const policies = data?.value || data || [];
    const enabled = policies.filter(p => p.state === 'enabled').length;

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{enabled}</div>
                    <div className="stat-label">Enabled</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{policies.length - enabled}</div>
                    <div className="stat-label">Disabled/Report Only</div>
                </div>
            </div>

            <h3>Access Policies</h3>
            <div className="detail-table">
                {policies.map((policy) => (
                    <div key={policy.id} className="detail-row policy-row">
                        <div className="policy-info">
                            <div className="policy-name">
                                {policy.displayName}
                                <span className={`status-badge ${policy.state}`}>
                                    {policy.state}
                                </span>
                            </div>
                            <div className="policy-meta">
                                Grants: {policy.grantControls?.builtInControls?.join(', ') || 'None'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
const PrivilegedUsersDetails = ({ data }) => {
    const roles = data || [];
    const privilegedMap = new Map();

    roles.forEach(role => {
        const members = role.members || [];
        members.forEach(member => {
            if (!privilegedMap.has(member.id)) {
                privilegedMap.set(member.id, {
                    ...member,
                    roles: [role.displayName]
                });
            } else {
                privilegedMap.get(member.id).roles.push(role.displayName);
            }
        });
    });

    const privilegedUsers = Array.from(privilegedMap.values());

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{privilegedUsers.length}</div>
                    <div className="stat-label">Total Privileged</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{roles.length}</div>
                    <div className="stat-label">Active Roles</div>
                </div>
            </div>

            <h3>Privileged Accounts Audit</h3>
            <div className="detail-table">
                {privilegedUsers.map((user) => (
                    <div key={user.id} className="detail-row">
                        <div className="user-info">
                            <div className="user-name">
                                {user.displayName}
                                {user.userPrincipalName?.includes('admin') && (
                                    <span className="severity-badge high" style={{ marginLeft: '8px' }}>Admin</span>
                                )}
                            </div>
                            <div className="user-meta">
                                {user.userPrincipalName} • Roles: {user.roles.join(', ')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GuestUsersDetails = ({ data }) => {
    const guests = data?.value || data || [];

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{guests.length}</div>
                    <div className="stat-label">Total Guests</div>
                </div>
            </div>

            <h3>External Guest Accounts</h3>
            <div className="detail-table">
                {guests.map((guest) => (
                    <div key={guest.id} className="detail-row">
                        <div className="user-info">
                            <div className="user-name">{guest.displayName}</div>
                            <div className="user-meta">
                                {guest.userPrincipalName} • Source: {guest.externalUserState || 'External'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GeographicDetails = ({ data }) => {
    const signIns = data?.value || data || [];
    const locationCounts = {};

    signIns.forEach(signin => {
        if (signin.location) {
            const city = signin.location.city || 'Unknown';
            const country = signin.location.countryOrRegion || '';
            const location = country ? `${city}, ${country}` : city;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
    });

    const locations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    return (
        <div className="detail-view">
            <h3>Geographic Distribution</h3>
            <div className="detail-table">
                <div className="detail-row header">
                    <div className="col">Location</div>
                    <div className="col">Sign-in Count</div>
                </div>
                {locations.map((loc, idx) => (
                    <div key={idx} className="detail-row">
                        <div className="col">{loc.name}</div>
                        <div className="col" style={{ fontWeight: '600' }}>{loc.count}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
const OAuthAppsDetails = ({ data }) => {
    const servicePrincipals = data?.servicePrincipals?.value || [];
    const permissionGrants = data?.permissionGrants?.value || [];

    const highRiskPermissions = ['Mail.ReadWrite', 'Files.ReadWrite.All', 'User.ReadWrite.All', 'Directory.ReadWrite.All'];

    const appsWithDetails = servicePrincipals.map(app => {
        const appGrants = permissionGrants.filter(g => g.clientId === app.id);
        const scopes = appGrants.flatMap(g => g.scope?.split(' ') || []);
        const isHighRisk = scopes.some(s => highRiskPermissions.includes(s));
        return { ...app, scopes, isHighRisk };
    });

    const highRiskApps = appsWithDetails.filter(a => a.isHighRisk);

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{servicePrincipals.length}</div>
                    <div className="stat-label">Total Apps</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{highRiskApps.length}</div>
                    <div className="stat-label">High Risk</div>
                </div>
            </div>

            <h3>Application Governance</h3>
            <div className="detail-table">
                {appsWithDetails.slice(0, 30).map((app) => (
                    <div key={app.id} className="detail-row">
                        <div className="app-info">
                            <div className="app-name">
                                {app.displayName}
                                {app.isHighRisk && <span className="severity-badge high" style={{ marginLeft: '8px' }}>High Risk</span>}
                            </div>
                            <div className="app-meta">
                                Permissions: {app.scopes.slice(0, 5).join(', ')}
                                {app.scopes.length > 5 && ` +${app.scopes.length - 5} more`}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {appsWithDetails.length > 30 && <p className="table-footer">Showing first 30 of {appsWithDetails.length} apps</p>}
        </div>
    );
};

const SharePointDetails = ({ data }) => {
    const sites = data?.value || data || [];

    return (
        <div className="detail-view">
            <div className="detail-stats">
                <div className="stat-card">
                    <div className="stat-value">{sites.length}</div>
                    <div className="stat-label">Total Sites</div>
                </div>
            </div>

            <h3>SharePoint Site Collections</h3>
            <div className="detail-table">
                {sites.map((site) => (
                    <div key={site.id} className="detail-row">
                        <div className="site-info">
                            <div className="site-name">{site.displayName || site.name}</div>
                            <div className="site-meta">
                                {site.webUrl} • {site.root ? 'Root Site' : 'Subsite/Collection'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SecurityDetailModal;
