import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User, Mail, Shield, ShieldCheck, Key,
    Globe, Phone, Building, Briefcase,
    CheckCircle2, AlertCircle, ArrowLeft,
    LogOut, ExternalLink
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';

const UserDetailsPage = () => {
    const navigate = useNavigate();
    const { accounts, instance } = useMsal();
    const user = accounts[0] || { name: 'Admin User', username: 'admin@company.onmicrosoft.com' };

    const handleLogout = () => {
        instance.logoutRedirect();
    };

    const permissions = [
        { role: 'Global Administrator', description: 'Full access to all administrative features in Microsoft 365.', status: 'Active' },
        { role: 'Exchange Administrator', description: 'Manage mailboxes, groups, and anti-spam policies.', status: 'Inherited' },
        { role: 'User Administrator', description: 'Reset passwords, manage users and groups.', status: 'Active' },
        { role: 'Security Administrator', description: 'Monitor threats and manage security policies.', status: 'Active' }
    ];

    const profileDetails = [
        { icon: Mail, label: 'Email', value: user.username },
        { icon: Building, label: 'Organization', value: 'Meridian Solutions' },
        { icon: Briefcase, label: 'Job Title', value: 'Security Specialist' },
        { icon: Globe, label: 'Location', value: 'Gurugram, India' },
        { icon: Phone, label: 'Mobile', value: '+91 98XXX XXXXX' },
    ];

    return (
        <div className="animate-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header className="flex-between spacing-v-4">
                <div className="flex-center flex-gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '22px' }}>Account Profile</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Manage your profile and security permissions</p>
                    </div>
                </div>
                <div>
                    <button onClick={handleLogout} className="btn btn-error" style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Profile Card */}
            <div className="glass-card" style={{ padding: '32px', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingBottom: '24px', borderBottom: '1px solid hsla(0,0%,100%,0.05)' }}>
                    <div className="avatar" style={{
                        width: '64px',
                        height: '64px',
                        fontSize: '24px',
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        border: '2px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{user.name}</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{user.username}</p>
                        <div style={{
                            marginTop: '12px',
                            padding: '4px 12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--accent-blue)',
                            borderRadius: '100px',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'inline-block',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                            Global Admin
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)' }}>Contact Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {profileDetails.map((detail, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                background: 'hsla(0,0%,100%,0.02)',
                                borderRadius: '12px',
                                border: '1px solid hsla(0,0%,100%,0.05)',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'hsla(0,0%,100%,0.04)';
                                    e.currentTarget.style.borderColor = 'hsla(0,0%,100%,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'hsla(0,0%,100%,0.02)';
                                    e.currentTarget.style.borderColor = 'hsla(0,0%,100%,0.05)';
                                }}
                            >
                                <div style={{
                                    padding: '10px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '10px',
                                    color: 'var(--accent-blue)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <detail.icon size={18} />
                                </div>
                                <div style={{ overflow: 'hidden', width: '100%', flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{detail.label}</div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }} title={detail.value}>
                                        {detail.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Roles & Permissions Card */}
            <div className="glass-card" style={{ padding: '32px', marginTop: '24px' }}>
                <div className="flex-between" style={{ marginBottom: '24px' }}>
                    <div className="flex-center flex-gap-3">
                        <div style={{
                            padding: '10px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '10px',
                            color: '#10b981',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)'
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Roles & Permissions</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Access levels assigned to this account</p>
                        </div>
                    </div>
                    <span style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        background: 'hsla(0,0%,100%,0.05)',
                        borderRadius: '20px',
                        border: '1px solid hsla(0,0%,100%,0.1)',
                        color: 'var(--text-secondary)'
                    }}>{permissions.length} Roles Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {permissions.map((perm, idx) => (
                        <div key={idx} style={{
                            padding: '20px',
                            background: 'linear-gradient(145deg, hsla(0,0%,100%,0.03) 0%, hsla(0,0%,100%,0.01) 100%)',
                            border: '1px solid hsla(0,0%,100%,0.05)',
                            borderRadius: '16px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'default',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = 'hsla(0,0%,100%,0.15)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                                e.currentTarget.style.background = 'linear-gradient(145deg, hsla(0,0%,100%,0.05) 0%, hsla(0,0%,100%,0.02) 100%)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'hsla(0,0%,100%,0.05)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.background = 'linear-gradient(145deg, hsla(0,0%,100%,0.03) 0%, hsla(0,0%,100%,0.01) 100%)';
                            }}
                        >
                            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '8px',
                                    background: 'hsla(0,0%,100%,0.05)',
                                    borderRadius: '8px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    <Shield size={16} />
                                </div>
                                <span style={{
                                    fontSize: '10px',
                                    padding: '4px 8px',
                                    background: perm.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    color: perm.status === 'Active' ? '#10b981' : '#3b82f6',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>{perm.status}</span>
                            </div>
                            <h4 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: 'var(--text-primary)' }}>{perm.role}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6' }}>{perm.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Session & Security Card */}
            <div className="glass-card" style={{ padding: '32px', marginTop: '24px', marginBottom: '40px' }}>
                <div className="flex-center flex-gap-3" style={{ marginBottom: '24px' }}>
                    <div style={{
                        padding: '10px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '10px',
                        color: '#f59e0b',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)'
                    }}>
                        <Key size={20} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Session & Security</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Authentication methods and history</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div style={{
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.01))',
                        borderRadius: '16px',
                        border: '1px solid rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6'
                        }}>
                            <Key size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password Last Changed</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>14 Days Ago</div>
                        </div>
                    </div>

                    <div style={{
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.01))',
                        borderRadius: '16px',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981'
                        }}>
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MFA Status</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>Enabled</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>via Microsoft Authenticator</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsPage;
