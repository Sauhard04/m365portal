import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { GraphService } from '../services/graphService';
import { loginRequest } from '../authConfig';
import { Trash2, RefreshCw, AlertCircle, Loader2, Search, ArrowLeft, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DeletedUsersPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterText, setFilterText] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length > 0) {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);
                const data = await graphService.getDeletedUsers();
                setUsers(data || []);
            }
        } catch (err) {
            setError("Failed to synchronize organization recycle bin.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [accounts]);

    const filteredUsers = users.filter(user => {
        const searchStr = filterText.toLowerCase();
        return (user.displayName?.toLowerCase() || '').includes(searchStr) || (user.userPrincipalName?.toLowerCase() || '').includes(searchStr);
    });

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-error)" />
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Directory Recycle Bin</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Restore soft-deleted identities or permanently purge accounts</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchData}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Sync Bin
                </button>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="search-wrapper" style={{ maxWidth: '600px' }}>
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="Search recycle bin by identity..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    <Search size={18} className="search-icon" />
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 className="flex-center flex-gap-4">
                        <UserX size={20} color="var(--accent-error)" />
                        Pending Deletions
                    </h3>
                    <span className="badge badge-error">{filteredUsers.length} IN RECYCLE BIN</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Subject Display Name</th>
                                <th>User Principal Name</th>
                                <th>Object Identifier</th>
                                <th>Purge Date (Automated)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(0, 84%, 60%, 0.1)', color: 'var(--accent-error)', borderRadius: '8px' }}>
                                                <Trash2 size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{user.displayName}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>{user.userPrincipalName}</td>
                                    <td style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>{user.id}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--accent-warning)' }}>
                                        {user.deletedDateTime ? new Date(user.deletedDateTime).toLocaleDateString() : 'Immediate'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Trash2 size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p>Recycle bin is empty. No soft-deleted users found.</p>
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

export default DeletedUsersPage;
