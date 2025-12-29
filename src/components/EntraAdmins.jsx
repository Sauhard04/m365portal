import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { RolesService } from '../services/entra';
import { ArrowLeft, ShieldCheck, ChevronDown, ChevronRight, User, Loader2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EntraAdmins = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRole, setExpandedRole] = useState(null);

    useEffect(() => {
        const fetchRoles = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const client = new GraphService(response.accessToken).client;
                    const data = await RolesService.getRoles(client);
                    const activeRoles = data.filter(r => r.members && r.members.length > 0);
                    setRoles(activeRoles);
                } catch (error) {
                    console.error("Role fetch error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchRoles();
    }, [accounts, instance]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-error)" />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Privileged Roles</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Administrative authority and security group attribution</p>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 className="flex-center flex-gap-4">
                        <ShieldAlert size={20} color="var(--accent-error)" />
                        Active Assignments
                    </h3>
                    <span className="badge badge-error">{roles.length} ROLES DETECTED</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Role Identity</th>
                                <th>Function Description</th>
                                <th style={{ textAlign: 'center' }}>Subject Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.length > 0 ? roles.map((role) => (
                                <React.Fragment key={role.id}>
                                    <tr
                                        onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{expandedRole === role.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                                        <td>
                                            <div className="flex-center justify-start flex-gap-4">
                                                <div style={{ padding: '8px', background: 'hsla(0, 84%, 60%, 0.1)', color: 'var(--accent-error)', borderRadius: '8px' }}>
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{role.displayName}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '12px', opacity: 0.7, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {role.description}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="badge badge-error">{role.members?.length || 0}</span>
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {expandedRole === role.id && (
                                            <tr>
                                                <td colSpan="4" style={{ background: 'hsla(0,0%,100%,0.01)', padding: '24px' }}>
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                                        {role.members?.map(member => (
                                                            <div key={member.id} className="glass-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <User size={14} color="var(--text-dim)" />
                                                                </div>
                                                                <div style={{ overflow: 'hidden' }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{member.displayName}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.userPrincipalName}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <ShieldCheck size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p>No active administrative roles found.</p>
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

export default EntraAdmins;
