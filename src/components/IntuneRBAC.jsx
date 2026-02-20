import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { ArrowLeft, UserCog, Shield, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import styles from './DetailPage.module.css';
import Loader3D from './Loader3D';

const IntuneRBAC = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRoles, setExpandedRoles] = useState(new Set());

    useEffect(() => {
        fetchRoles();
    }, [activeTenantId]);

    const fetchRoles = async () => {
        if (accounts.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const accessToken = await acquireToken({ ...loginRequest });
            const client = new GraphService(accessToken).client;
            const rbacData = await IntuneService.getRBACData(client);
            setRoles(rbacData);
        } catch (err) {
            console.error('Error fetching RBAC data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = (roleId) => {
        setExpandedRoles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roleId)) {
                newSet.delete(roleId);
            } else {
                newSet.add(roleId);
            }
            return newSet;
        });
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <button onClick={() => navigate('/service/intune')} className={styles.backButton}>
                    <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Back to Dashboard
                </button>

                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <UserCog style={{ width: '2rem', height: '2rem', color: '#a855f7' }} />
                        RBAC & Admin Access
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Role-based access control and administrator permissions
                    </p>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>Admin Roles</h2>
                        <span className={`${styles.badge} ${styles.badgeInfo}`}>
                            {loading ? '...' : roles.length} ROLES
                        </span>
                    </div>

                    {loading && (
                        <div className={styles.emptyState}>
                            <Loader3D />
                            <p className={styles.emptyDescription}>Loading admin roles...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Shield style={{ width: '2.5rem', height: '2.5rem', color: '#f59e0b' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>Missing API Permissions</h3>
                            <p className={styles.emptyDescription}>
                                {error.includes('DeviceManagementRBAC') || error.includes('403') || error.includes('not authorized') ? (
                                    <>
                                        The application requires additional Microsoft Graph API permissions to access RBAC data.
                                        <br /><br />
                                        <strong>Required Scopes:</strong>
                                        <br />
                                        • DeviceManagementRBAC.Read.All
                                        <br />
                                        • DeviceManagementRBAC.ReadWrite.All
                                        <br /><br />
                                        Please contact your administrator to grant these permissions in the Azure Portal.
                                    </>
                                ) : (
                                    error
                                )}
                            </p>
                        </div>
                    )}

                    {!loading && !error && roles.length === 0 && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <UserCog style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280' }} />
                            </div>
                            <h3 className={styles.emptyTitle}>No Admin Roles Found</h3>
                            <p className={styles.emptyDescription}>
                                No Intune administrative roles are configured in this tenant.
                            </p>
                        </div>
                    )}

                    {!loading && !error && roles.length > 0 && (
                        <div className={styles.tableContainer}>
                            <table className={styles.dataTable}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}></th>
                                        <th>Role Name</th>
                                        <th>Type</th>
                                        <th>Permissions</th>
                                        <th>Assignments</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.map((role) => (
                                        <React.Fragment key={role.id}>
                                            <tr
                                                className={styles.clickableRow}
                                                onClick={() => toggleRole(role.id)}
                                            >
                                                <td>
                                                    {expandedRoles.has(role.id) ? (
                                                        <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />
                                                    ) : (
                                                        <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Shield size={16} style={{ color: '#a855f7' }} />
                                                        <strong>{role.displayName}</strong>
                                                    </div>
                                                </td>
                                                <td>
                                                    {role.isBuiltIn ? (
                                                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>Built-in</span>
                                                    ) : (
                                                        <span className={`${styles.badge} ${styles.badgeInfo}`}>Custom</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        {role.permissions} permissions
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Users size={14} style={{ color: 'var(--text-dim)' }} />
                                                        <span>{role.assignmentCount || 0} assignments</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        color: 'var(--text-dim)',
                                                        fontSize: '0.85rem',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {role.description || 'No description available'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {expandedRoles.has(role.id) && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                                                        <div style={{ padding: '1rem' }}>
                                                            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                                                Role Details
                                                            </h4>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                                                        Role ID
                                                                    </div>
                                                                    <div style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                                        {role.id}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                                                                        Type
                                                                    </div>
                                                                    <div style={{ fontSize: '0.85rem' }}>
                                                                        {role.isBuiltIn ? 'Built-in Microsoft Role' : 'Custom Role'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {role.assignments && role.assignments.length > 0 && (
                                                                <div style={{ marginTop: '1rem' }}>
                                                                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                                        Assignments ({role.assignments.length})
                                                                    </h5>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '0.5rem',
                                                                        maxHeight: '200px',
                                                                        overflowY: 'auto'
                                                                    }}>
                                                                        {role.assignments.map((assignment, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                style={{
                                                                                    padding: '0.5rem',
                                                                                    background: 'var(--bg-primary)',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '0.85rem'
                                                                                }}
                                                                            >
                                                                                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                                                                                    {assignment.displayName || 'Unnamed Assignment'}
                                                                                </div>
                                                                                {assignment.description && (
                                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                                                                        {assignment.description}
                                                                                    </div>
                                                                                )}
                                                                                {assignment.members && assignment.members.length > 0 && (
                                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                                                        {assignment.members.length} member(s)
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {(!role.assignments || role.assignments.length === 0) && (
                                                                <div style={{
                                                                    marginTop: '1rem',
                                                                    padding: '0.75rem',
                                                                    background: 'var(--bg-primary)',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.85rem',
                                                                    color: 'var(--text-dim)',
                                                                    textAlign: 'center'
                                                                }}>
                                                                    No assignments for this role
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntuneRBAC;
