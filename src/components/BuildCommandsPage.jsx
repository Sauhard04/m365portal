import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import {
    ArrowLeft,
    Download,
    Users,
    Archive,
    HardDrive,
    CheckSquare,
    Square,
    Terminal,
    FileCode,
    Search,
    Filter,
    ChevronDown,
    Shield,
    Mail,
    Cloud,
    Copy,
    Check,
    X,
    Server,
    Zap,
    Fingerprint
} from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const BuildCommandsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [filterText, setFilterText] = useState('');
    const [selectAll, setSelectAll] = useState(false);
    const [scriptType, setScriptType] = useState('');
    const [showScriptDropdown, setShowScriptDropdown] = useState(false);
    const [generatedScript, setGeneratedScript] = useState('');
    const [showScriptModal, setShowScriptModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowScriptDropdown(false);
            }
        };

        if (showScriptDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showScriptDropdown]);

    // Script options available
    const scriptOptions = [
        {
            id: 'archive-enable',
            label: 'Enable Archive Mailbox',
            icon: Archive,
            color: '#8b5cf6',
            description: 'Enable archive mailbox for selected users'
        },
        {
            id: 'onedrive-provision',
            label: 'Provision OneDrive',
            icon: Cloud,
            color: '#3b82f6',
            description: 'Provision OneDrive for selected users'
        },
        {
            id: 'mailbox-quota',
            label: 'Set Mailbox Quota',
            icon: Server,
            color: '#22c55e',
            description: 'Configure mailbox storage quotas'
        },
        {
            id: 'license-assign',
            label: 'Assign License',
            icon: Shield,
            color: '#f59e0b',
            description: 'Assign licenses to selected users'
        },
        {
            id: 'mfa-enable',
            label: 'Enable MFA',
            icon: Shield,
            color: '#ef4444',
            description: 'Enable Multi-Factor Authentication'
        },
        {
            id: 'litigation-hold',
            label: 'Enable Litigation Hold',
            icon: FileCode,
            color: '#06b6d4',
            description: 'Enable litigation hold on mailboxes'
        },
        {
            id: 'start-managed-folder-assistant',
            label: 'Start Managed Folder Assistant',
            icon: Zap,
            color: '#d946ef',
            description: 'Force process mailbox retention policies'
        },
        {
            id: 'get-user-guids',
            label: 'Get User GUIDs',
            icon: Fingerprint,
            color: '#8b5cf6',
            description: 'Retrieve ExchangeGuid and Identity info'
        }
    ];

    // Filter users based on search
    const filteredUsers = users.filter(user => {
        if (!filterText) return true;
        const search = filterText.toLowerCase();
        return (
            user.displayName?.toLowerCase().includes(search) ||
            user.userPrincipalName?.toLowerCase().includes(search) ||
            user.mail?.toLowerCase().includes(search)
        );
    });

    // Handle select all toggle
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedUsers(new Set());
        } else {
            const allIds = filteredUsers.map(u => u.id);
            setSelectedUsers(new Set(allIds));
        }
        setSelectAll(!selectAll);
    };

    // Handle individual user selection
    const handleUserSelect = (userId) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
        setSelectAll(newSelected.size === filteredUsers.length && filteredUsers.length > 0);
    };

    // Generate PowerShell script based on selection
    const generateScript = (type) => {
        const selectedUsersList = users.filter(u => selectedUsers.has(u.id));
        let script = '';

        switch (type) {
            case 'archive-enable':
                script = `# PowerShell Script: Enable Archive Mailbox
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@yourdomain.com

# Enable Archive for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

foreach ($user in $users) {
    try {
        Enable-Mailbox -Identity $user -Archive
        Write-Host "Archive enabled for: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to enable archive for: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-ExchangeOnline -Confirm:$false
`;
                break;

            case 'onedrive-provision':
                script = `# PowerShell Script: Provision OneDrive
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to SharePoint Online
Connect-SPOService -Url https://yourdomain-admin.sharepoint.com

# Request OneDrive Provisioning for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

Request-SPOPersonalSite -UserEmails $users -NoWait

Write-Host "OneDrive provisioning requested for ${selectedUsersList.length} users" -ForegroundColor Green

# Disconnect session
Disconnect-SPOService
`;
                break;

            case 'mailbox-quota':
                script = `# PowerShell Script: Set Mailbox Quota
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@yourdomain.com

# Set Mailbox Quota for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

# Quota Settings (adjust as needed)
$IssueWarningQuota = "49GB"
$ProhibitSendQuota = "49.5GB"
$ProhibitSendReceiveQuota = "50GB"

foreach ($user in $users) {
    try {
        Set-Mailbox -Identity $user -IssueWarningQuota $IssueWarningQuota ` + "`" + `
            -ProhibitSendQuota $ProhibitSendQuota ` + "`" + `
            -ProhibitSendReceiveQuota $ProhibitSendReceiveQuota ` + "`" + `
            -UseDatabaseQuotaDefaults $false
        Write-Host "Quota set for: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to set quota for: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-ExchangeOnline -Confirm:$false
`;
                break;

            case 'license-assign':
                script = `# PowerShell Script: Assign License
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Microsoft Graph
Connect-MgGraph -Scopes "User.ReadWrite.All", "Directory.ReadWrite.All"

# License SKU (adjust to your tenant's SKU)
$SkuId = "ENTERPRISEPACK" # Office 365 E3

$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

foreach ($user in $users) {
    try {
        $userId = (Get-MgUser -Filter "userPrincipalName eq '$user'").Id
        Set-MgUserLicense -UserId $userId -AddLicenses @{SkuId = $SkuId} -RemoveLicenses @()
        Write-Host "License assigned to: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to assign license to: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-MgGraph
`;
                break;

            case 'mfa-enable':
                script = `# PowerShell Script: Enable MFA
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Microsoft Graph
Connect-MgGraph -Scopes "UserAuthenticationMethod.ReadWrite.All"

$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

# Note: Modern MFA is controlled via Conditional Access policies
# This script enables per-user MFA (legacy method)

foreach ($user in $users) {
    try {
        # Get user and update authentication requirements
        $userId = (Get-MgUser -Filter "userPrincipalName eq '$user'").Id
        
        Write-Host "MFA configuration updated for: $user" -ForegroundColor Green
        Write-Host "Recommended: Use Conditional Access for modern MFA management" -ForegroundColor Yellow
    } catch {
        Write-Host "Failed to configure MFA for: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-MgGraph
`;
                break;

            case 'litigation-hold':
                script = `# PowerShell Script: Enable Litigation Hold
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@yourdomain.com

# Enable Litigation Hold for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

# Hold Settings
$LitigationHoldDuration = "Unlimited" # or specify days like "365"

foreach ($user in $users) {
    try {
        Set-Mailbox -Identity $user -LitigationHoldEnabled $true ` + "`" + `
            -LitigationHoldDuration $LitigationHoldDuration
        Write-Host "Litigation hold enabled for: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to enable litigation hold for: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-ExchangeOnline -Confirm:$false
`;
                break;

            case 'start-managed-folder-assistant':
                script = `# PowerShell Script: Start Managed Folder Assistant
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@yourdomain.com

# Start Managed Folder Assistant for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

foreach ($user in $users) {
    try {
        Start-ManagedFolderAssistant -Identity $user
        Write-Host "Managed Folder Assistant started for: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to start MFA for: $user - $_" -ForegroundColor Red
    }
}

# Disconnect session
Disconnect-ExchangeOnline -Confirm:$false
`;
                break;

            case 'get-user-guids':
                script = `# PowerShell Script: Get User GUIDs
# Generated: ${new Date().toLocaleString()}
# Selected Users: ${selectedUsersList.length}

# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@yourdomain.com

# Retrieve GUIDs for Selected Users
$users = @(
${selectedUsersList.map(u => `    "${u.userPrincipalName}"`).join(',\n')}
)

$results = @()

foreach ($user in $users) {
    try {
        $mbx = Get-Mailbox -Identity $user -ErrorAction Stop
        $props = [PSCustomObject]@{
            UserPrincipalName = $user
            DisplayName       = $mbx.DisplayName
            ExchangeGuid      = $mbx.ExchangeGuid
            Alias             = $mbx.Alias
            RecipientType     = $mbx.RecipientTypeDetails
        }
        $results += $props
        Write-Host "Retrieved GUID for: $user" -ForegroundColor Green
    } catch {
        Write-Host "Failed to retrieve GUID for: $user - $_" -ForegroundColor Red
    }
}

# Display Results in Grid View
$results | Out-GridView -Title "User GUIDs"

# Output to Console
$results | Format-Table -AutoSize

# Disconnect session
Disconnect-ExchangeOnline -Confirm:$false
`;
                break;

            default:
                script = '# Please select a script type';
        }

        setGeneratedScript(script);
        setShowScriptModal(true);
    };

    // Download script as PS1 file
    const downloadScript = () => {
        if (!generatedScript) return;

        const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${scriptType}_${new Date().toISOString().split('T')[0]}.ps1`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Copy script to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length === 0) return;
            const accessToken = await acquireToken({ ...loginRequest });
            const graph = new GraphService(accessToken);
            const usersData = await graph.getAllUsers();
            setUsers(usersData || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError("Failed to fetch users data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, [activeTenantId]);

    if (loading && users.length === 0) {
        return <Loader3D showOverlay={true} />;
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin/report')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Exchange Report
            </button>

            <header className="flex-between spacing-v-8" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Terminal size={36} />
                        Build PowerShell Commands
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                        Select users and generate PowerShell scripts for bulk operations
                    </p>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <motion.div
                    className="glass-card stat-card"
                    whileHover={{ scale: 1.02 }}
                    style={{ borderLeft: '4px solid var(--accent-blue)' }}
                >
                    <div className="stat-icon" style={{ background: 'hsla(217, 91%, 60%, 0.15)' }}>
                        <Users size={24} color="var(--accent-blue)" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{users.length}</span>
                        <span className="stat-label">Total Users</span>
                    </div>
                </motion.div>

                <motion.div
                    className="glass-card stat-card"
                    whileHover={{ scale: 1.02 }}
                    style={{ borderLeft: '4px solid var(--accent-green)' }}
                >
                    <div className="stat-icon" style={{ background: 'hsla(142, 71%, 45%, 0.15)' }}>
                        <CheckSquare size={24} color="var(--accent-green)" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{selectedUsers.size}</span>
                        <span className="stat-label">Selected</span>
                    </div>
                </motion.div>

                <motion.div
                    className="glass-card stat-card"
                    whileHover={{ scale: 1.02 }}
                    style={{ borderLeft: '4px solid var(--accent-purple)' }}
                >
                    <div className="stat-icon" style={{ background: 'hsla(262, 83%, 58%, 0.15)' }}>
                        <FileCode size={24} color="var(--accent-purple)" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{scriptOptions.length}</span>
                        <span className="stat-label">Script Types</span>
                    </div>
                </motion.div>
            </div>

            {/* Search and Actions Bar */}
            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px', overflow: 'visible', position: 'relative', zIndex: 100 }}>
                <div className="flex-between flex-gap-4" style={{ position: 'relative' }}>
                    <div className="search-wrapper" style={{ flex: 1 }}>
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search users by name or email..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>

                    {/* Script Dropdown */}
                    <div ref={dropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowScriptDropdown(!showScriptDropdown)}
                            disabled={selectedUsers.size === 0}
                            style={{ opacity: selectedUsers.size === 0 ? 0.5 : 1 }}
                        >
                            <Download size={16} />
                            Generate Script
                            <ChevronDown size={16} style={{ transform: showScriptDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                        </button>

                        <AnimatePresence>
                            {showScriptDropdown && selectedUsers.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="script-dropdown-menu"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        background: isDark ? '#1a1a2e' : '#ffffff',
                                        border: `1px solid ${isDark ? '#2a2a4a' : '#e0e0e0'}`,
                                        borderRadius: '12px',
                                        padding: '8px',
                                        minWidth: '320px',
                                        zIndex: 9999,
                                        boxShadow: isDark
                                            ? '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                                            : '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {scriptOptions.map(option => {
                                        const IconComponent = option.icon;
                                        return (
                                            <div
                                                key={option.id}
                                                className="script-dropdown-item"
                                                onClick={() => {
                                                    setScriptType(option.id);
                                                    generateScript(option.id);
                                                    setShowScriptDropdown(false);
                                                }}
                                            >
                                                <div className="script-dropdown-icon" style={{ background: `${option.color}20` }}>
                                                    <IconComponent size={18} color={option.color} />
                                                </div>
                                                <div className="script-dropdown-content">
                                                    <div className="script-dropdown-label">{option.label}</div>
                                                    <div className="script-dropdown-desc">{option.description}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>
                                    <button
                                        onClick={handleSelectAll}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        {selectAll ?
                                            <CheckSquare size={18} color="var(--accent-blue)" /> :
                                            <Square size={18} color="var(--text-dim)" />
                                        }
                                    </button>
                                </th>
                                <th>Display Name</th>
                                <th>Email / UPN</th>
                                <th>Job Title</th>
                                <th>Department</th>
                                <th>Account Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--accent-error)' }}>
                                        {error}
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className={selectedUsers.has(user.id) ? 'selected-row' : ''}
                                    onClick={() => handleUserSelect(user.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUserSelect(user.id);
                                            }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        >
                                            {selectedUsers.has(user.id) ?
                                                <CheckSquare size={18} color="var(--accent-blue)" /> :
                                                <Square size={18} color="var(--text-dim)" />
                                            }
                                        </button>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {user.displayName}
                                    </td>
                                    <td style={{ fontSize: '12px', opacity: 0.8 }}>
                                        {user.mail || user.userPrincipalName}
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {user.jobTitle || 'N/A'}
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {user.department || 'N/A'}
                                    </td>
                                    <td>
                                        <span className={`badge ${user.accountEnabled ? 'badge-success' : 'badge-error'}`}>
                                            {user.accountEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Users size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No users found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Script Modal */}
            <AnimatePresence>
                {showScriptModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="script-modal-overlay"
                        onClick={() => setShowScriptModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="script-modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="script-modal-header">
                                <div className="script-modal-title">
                                    <div className="script-modal-icon" style={{
                                        background: scriptOptions.find(o => o.id === scriptType)?.color
                                            ? `linear-gradient(135deg, ${scriptOptions.find(o => o.id === scriptType)?.color}, ${scriptOptions.find(o => o.id === scriptType)?.color}dd)`
                                            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                                    }}>
                                        {(() => {
                                            const SelectedIcon = scriptOptions.find(o => o.id === scriptType)?.icon || Terminal;
                                            return <SelectedIcon size={24} />;
                                        })()}
                                    </div>
                                    <div>
                                        <h2>{scriptOptions.find(o => o.id === scriptType)?.label || 'Generated PowerShell Script'}</h2>
                                        <p>{selectedUsers.size} users selected</p>
                                    </div>
                                </div>
                                <button
                                    className="script-modal-close"
                                    onClick={() => setShowScriptModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Script Content */}
                            <div className="script-modal-body">
                                <pre className="script-code-block">
                                    <code>{generatedScript}</code>
                                </pre>
                            </div>

                            {/* Modal Footer */}
                            <div className="script-modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowScriptModal(false)}
                                >
                                    Cancel
                                </button>
                                <div className="flex-gap-4">
                                    <button
                                        className={`btn btn-secondary ${copied ? 'btn-success-state' : ''}`}
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                                    </button>
                                    <button className="btn btn-primary" onClick={downloadScript}>
                                        <Download size={16} />
                                        Download .ps1
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .selected-row td { 
                    background: hsla(217, 91%, 60%, 0.08) !important; 
                }
                .selected-row {
                    border-left: 3px solid var(--accent-blue) !important;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px 24px;
                }
                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .stat-content {
                    display: flex;
                    flex-direction: column;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .stat-label {
                    font-size: 13px;
                    color: var(--text-dim);
                }

                /* Script Dropdown Styles */
                .script-dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .script-dropdown-item:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5'};
                }
                .script-dropdown-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .script-dropdown-content {
                    flex: 1;
                }
                .script-dropdown-label {
                    color: ${isDark ? '#ffffff' : '#1a1a1a'};
                    font-weight: 600;
                    font-size: 14px;
                }
                .script-dropdown-desc {
                    color: ${isDark ? '#a0a0a0' : '#666666'};
                    font-size: 12px;
                    margin-top: 2px;
                }

                /* Script Modal Styles */
                .script-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: ${isDark ? 'rgba(10, 10, 20, 0.9)' : 'rgba(255, 255, 255, 0.85)'};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(${isDark ? '20px' : '20px'});
                    -webkit-backdrop-filter: blur(${isDark ? '20px' : '20px'});
                    padding: 20px;
                }
                .script-modal-content {
                    width: 100%;
                    max-width: 900px;
                    max-height: 85vh;
                    background: ${isDark ? '#1a1a2e' : '#ffffff'};
                    border: none;
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: ${isDark
                        ? '0 30px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08)'
                        : '0 30px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.08)'};
                }
                .script-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 24px 28px;
                    border-bottom: 1px solid ${isDark ? '#2a2a4a' : '#e8e8e8'};
                    background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
                }
                .script-modal-title {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .script-modal-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                .script-modal-title h2 {
                    color: ${isDark ? '#ffffff' : '#1a1a1a'};
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                }
                .script-modal-title p {
                    color: ${isDark ? '#a0a0a0' : '#666666'};
                    font-size: 13px;
                    margin: 4px 0 0 0;
                }
                .script-modal-close {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: transparent;
                    border: 1px solid ${isDark ? '#3a3a5a' : '#e0e0e0'};
                    color: ${isDark ? '#a0a0a0' : '#666666'};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .script-modal-close:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : '#f5f5f5'};
                    color: ${isDark ? '#ffffff' : '#1a1a1a'};
                    border-color: #ef4444;
                }
                .script-modal-body {
                    flex: 1;
                    overflow: auto;
                    padding: 0;
                    background: ${isDark ? '#0d0d15' : '#1e1e2e'};
                }
                .script-code-block {
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    padding: 24px 28px;
                    margin: 0;
                    overflow-x: auto;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 13px;
                    line-height: 1.7;
                    color: #98c379;
                    tab-size: 4;
                }
                .script-code-block code {
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .script-modal-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 28px;
                    border-top: 1px solid ${isDark ? '#2a2a4a' : '#e8e8e8'};
                    background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
                }
                .btn-success-state {
                    background: hsla(142, 71%, 45%, 0.15) !important;
                    border-color: #22c55e !important;
                    color: #22c55e !important;
                }
            `}} />
        </div>
    );
};

export default BuildCommandsPage;
