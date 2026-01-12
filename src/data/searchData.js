import { Home, Users, Shield, Smartphone, Globe, CreditCard, Mail, Activity, AlertTriangle, Trash2, Settings, Package, Lock, FileText, TrendingUp, LayoutGrid, Rocket, UserCog, Clock, AlertCircle, BookOpen } from 'lucide-react';

// Comprehensive search index for all pages and features
export const searchableItems = [
    // Overview
    {
        id: 'overview',
        title: 'Overview Dashboard',
        description: 'Main dashboard with insights and analytics',
        path: '/service/overview',
        category: 'Overview',
        icon: Home,
        tags: ['overview', 'dashboard', 'home', 'main', 'analytics', 'insights', 'stats', 'charts']
    },
    {
        id: 'documentation',
        title: 'System Documentation',
        description: 'Guided portal features and operational reference',
        path: '/service/documentation',
        category: 'Support',
        icon: BookOpen,
        tags: ['documentation', 'help', 'guide', 'faq', 'support', 'reference', 'learn']
    },

    // Admin Center
    {
        id: 'admin',
        title: 'Admin Center',
        description: 'Microsoft 365 Admin Center',
        path: '/service/admin',
        category: 'Admin Center',
        icon: Settings,
        tags: ['admin', 'center', 'management', 'settings', 'configuration']
    },
    {
        id: 'mailboxes',
        title: 'Mailbox Report',
        description: 'Exchange mailbox usage and details',
        path: '/service/admin/report',
        category: 'Admin Center',
        icon: Mail,
        tags: ['mailbox', 'exchange', 'email', 'mail', 'usage', 'storage', 'report']
    },
    {
        id: 'domains',
        title: 'Domains',
        description: 'Manage domains and DNS settings',
        path: '/service/admin/domains',
        category: 'Admin Center',
        icon: Globe,
        tags: ['domains', 'dns', 'domain', 'url', 'website', 'settings']
    },
    {
        id: 'licenses',
        title: 'Licenses',
        description: 'License management and assignments',
        path: '/service/admin/licenses',
        category: 'Admin Center',
        icon: CreditCard,
        tags: ['licenses', 'subscription', 'billing', 'plans', 'sku', 'assigned']
    },
    {
        id: 'groups',
        title: 'Groups',
        description: 'Microsoft 365 Groups management',
        path: '/service/admin/groups',
        category: 'Admin Center',
        icon: Users,
        tags: ['groups', 'teams', 'collaboration', 'distribution', 'security']
    },
    {
        id: 'deleted-users',
        title: 'Deleted Users',
        description: 'Restore deleted user accounts',
        path: '/service/admin/deleted-users',
        category: 'Admin Center',
        icon: Trash2,
        tags: ['deleted', 'users', 'restore', 'recycle', 'recovery', 'removed']
    },
    {
        id: 'secure-score',
        title: 'Secure Score',
        description: 'Security posture and recommendations',
        path: '/service/admin/secure-score',
        category: 'Admin Center',
        icon: Shield,
        tags: ['secure', 'score', 'security', 'posture', 'recommendations', 'compliance']
    },
    {
        id: 'service-health',
        title: 'Service Health',
        description: 'Microsoft 365 service health status',
        path: '/service/admin/service-health',
        category: 'Admin Center',
        icon: Activity,
        tags: ['service', 'health', 'status', 'incidents', 'outages', 'advisories', 'uptime']
    },
    {
        id: 'sign-ins',
        title: 'Sign-in Logs',
        description: 'User sign-in activity and failures',
        path: '/service/admin/sign-ins',
        category: 'Admin Center',
        icon: AlertTriangle,
        tags: ['sign-in', 'login', 'authentication', 'logs', 'failed', 'activity', 'audit']
    },
    {
        id: 'email-activity',
        title: 'Email Activity',
        description: 'Email flow analytics and statistics',
        path: '/service/admin/emails',
        category: 'Admin Center',
        icon: Mail,
        tags: ['email', 'activity', 'sent', 'received', 'flow', 'analytics', 'statistics']
    },

    // Entra ID
    {
        id: 'entra',
        title: 'Entra ID Dashboard',
        description: 'Microsoft Entra ID overview',
        path: '/service/entra',
        category: 'Entra ID',
        icon: Shield,
        tags: ['entra', 'azure', 'ad', 'active', 'directory', 'identity', 'dashboard']
    },
    {
        id: 'entra-users',
        title: 'Users',
        description: 'User accounts and management',
        path: '/service/entra/users',
        category: 'Entra ID',
        icon: Users,
        tags: ['users', 'accounts', 'people', 'employees', 'directory', 'profiles']
    },
    {
        id: 'entra-groups',
        title: 'Entra Groups',
        description: 'Security and distribution groups',
        path: '/service/entra/groups',
        category: 'Entra ID',
        icon: Users,
        tags: ['groups', 'security', 'distribution', 'teams', 'memberships']
    },
    {
        id: 'entra-devices',
        title: 'Entra Devices',
        description: 'Registered devices in Entra ID',
        path: '/service/entra/devices',
        category: 'Entra ID',
        icon: Smartphone,
        tags: ['devices', 'registered', 'joined', 'azure', 'ad', 'endpoints']
    },
    {
        id: 'entra-subscriptions',
        title: 'Subscriptions',
        description: 'Azure subscriptions and licenses',
        path: '/service/entra/subscriptions',
        category: 'Entra ID',
        icon: CreditCard,
        tags: ['subscriptions', 'licenses', 'plans', 'sku', 'azure']
    },
    {
        id: 'entra-admins',
        title: 'Admins',
        description: 'Admin roles and assignments',
        path: '/service/entra/admins',
        category: 'Entra ID',
        icon: Shield,
        tags: ['admins', 'administrators', 'roles', 'rbac', 'permissions', 'privileged']
    },
    {
        id: 'entra-apps',
        title: 'Applications',
        description: 'App registrations and enterprise apps',
        path: '/service/entra/apps',
        category: 'Entra ID',
        icon: LayoutGrid,
        tags: ['apps', 'applications', 'registrations', 'enterprise', 'oauth', 'api']
    },

    // Intune
    {
        id: 'intune',
        title: 'Intune Dashboard',
        description: 'Microsoft Intune device management',
        path: '/service/intune',
        category: 'Intune',
        icon: Smartphone,
        tags: ['intune', 'device', 'management', 'mdm', 'mam', 'endpoint']
    },
    {
        id: 'intune-devices',
        title: 'Managed Devices',
        description: 'All managed devices',
        path: '/service/intune/devices',
        category: 'Intune',
        icon: Smartphone,
        tags: ['devices', 'managed', 'enrolled', 'endpoints', 'mobile', 'computers']
    },
    {
        id: 'intune-non-compliant',
        title: 'Non-Compliant Devices',
        description: 'Devices not meeting compliance policies',
        path: '/service/intune/non-compliant',
        category: 'Intune',
        icon: AlertTriangle,
        tags: ['non-compliant', 'compliance', 'violations', 'risk', 'policy']
    },
    {
        id: 'intune-inactive',
        title: 'Inactive Devices',
        description: 'Devices inactive for 30+ days',
        path: '/service/intune/inactive',
        category: 'Intune',
        icon: Clock,
        tags: ['inactive', 'stale', 'offline', 'old', 'unused', 'dormant']
    },
    {
        id: 'intune-compliance',
        title: 'Compliance Policies',
        description: 'Device compliance policies',
        path: '/service/intune/compliance-policies',
        category: 'Intune',
        icon: Shield,
        tags: ['compliance', 'policies', 'rules', 'requirements', 'security']
    },
    {
        id: 'intune-config',
        title: 'Configuration Profiles',
        description: 'Device configuration profiles',
        path: '/service/intune/config-profiles',
        category: 'Intune',
        icon: Settings,
        tags: ['configuration', 'profiles', 'settings', 'policies', 'deploy']
    },
    {
        id: 'intune-apps',
        title: 'Applications',
        description: 'Mobile app management',
        path: '/service/intune/applications',
        category: 'Intune',
        icon: Package,
        tags: ['applications', 'apps', 'software', 'deploy', 'install', 'mam']
    },
    {
        id: 'intune-security',
        title: 'Security Baselines',
        description: 'Security baseline configurations',
        path: '/service/intune/security-baselines',
        category: 'Intune',
        icon: Lock,
        tags: ['security', 'baselines', 'hardening', 'standards', 'compliance']
    },
    {
        id: 'intune-user-devices',
        title: 'User Devices',
        description: 'View devices by user',
        path: '/service/intune/user-devices',
        category: 'Intune',
        icon: Users,
        tags: ['user', 'devices', 'search', 'lookup', 'assignment']
    },
    {
        id: 'intune-rbac',
        title: 'RBAC & Admin Access',
        description: 'Role-based access control',
        path: '/service/intune/rbac',
        category: 'Intune',
        icon: UserCog,
        tags: ['rbac', 'roles', 'permissions', 'access', 'admin', 'security']
    },
    {
        id: 'intune-audit',
        title: 'Audit & Activity Logs',
        description: 'Intune activity audit logs',
        path: '/service/intune/audit-logs',
        category: 'Intune',
        icon: FileText,
        tags: ['audit', 'logs', 'activity', 'history', 'changes', 'events']
    },
    {
        id: 'intune-reports',
        title: 'Reports & Insights',
        description: 'Intune reports and analytics',
        path: '/service/intune/reports',
        category: 'Intune',
        icon: TrendingUp,
        tags: ['reports', 'analytics', 'insights', 'trends', 'statistics']
    }
];

// Categories for filtering
export const categories = [
    { id: 'all', name: 'All', color: 'var(--accent-blue)' },
    { id: 'overview', name: 'Overview', color: 'var(--accent-purple)' },
    { id: 'admin', name: 'Admin Center', color: 'var(--accent-blue)' },
    { id: 'entra', name: 'Entra ID', color: 'var(--accent-cyan)' },
    { id: 'intune', name: 'Intune', color: 'var(--accent-success)' },
    { id: 'support', name: 'Support', color: 'var(--accent-indigo)' }
];

// Simple fuzzy search function
export const fuzzySearch = (query, items) => {
    if (!query || query.trim() === '') return items;

    const lowerQuery = query.toLowerCase().trim();

    return items
        .map(item => {
            let score = 0;

            // Exact title match (highest priority)
            if (item.title.toLowerCase() === lowerQuery) {
                score += 1000;
            }

            // Title starts with query
            if (item.title.toLowerCase().startsWith(lowerQuery)) {
                score += 500;
            }

            // Title contains query
            if (item.title.toLowerCase().includes(lowerQuery)) {
                score += 200;
            }

            // Description contains query
            if (item.description.toLowerCase().includes(lowerQuery)) {
                score += 100;
            }

            // Tag matches
            item.tags.forEach(tag => {
                if (tag === lowerQuery) score += 400;
                if (tag.startsWith(lowerQuery)) score += 150;
                if (tag.includes(lowerQuery)) score += 50;
            });

            // Category match
            if (item.category.toLowerCase().includes(lowerQuery)) {
                score += 80;
            }

            return { ...item, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
};
