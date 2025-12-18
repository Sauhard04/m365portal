import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card3D from '../components/Card3D';
import { Mail, Shield, FileText, Server } from 'lucide-react';
import { useMsal } from "@azure/msal-react";

const Dashboard = () => {
    const navigate = useNavigate();
    const { accounts } = useMsal();
    const user = accounts[0];

    const portals = [
        {
            id: 'exchange',
            name: 'Exchange Portal',
            icon: <Mail size={32} />,
            desc: 'Mailbox stats, migration status, and usage reports.',
            path: '/exchange'
        },
        {
            id: 'intune',
            name: 'Intune Portal',
            icon: <Server size={32} />,
            desc: 'Device compliance, configuration, and enrollment.',
            path: '/intune'
        },
        {
            id: 'security',
            name: 'Security Portal',
            icon: <Shield size={32} />,
            desc: 'Threat protection, alerts, and security score.',
            path: '/security'
        },
        {
            id: 'compliance',
            name: 'Compliance Portal',
            icon: <FileText size={32} />,
            desc: 'Data governance, eDiscovery, and audit logs.',
            path: '/compliance'
        },
    ];

    return (
        <div className="container py-10">
            <header className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Welcome, {user?.name || 'Admin'}</h1>
                    <p className="text-gray-400">Select a portal to generate reports.</p>
                </div>
            </header>

            <div className="grid-responsive">
                {portals.map((portal) => (
                    <div key={portal.id} onClick={() => navigate(portal.path)} className="cursor-pointer">
                        <Card3D className="h-full flex flex-col items-center text-center hover:bg-white/5 transition-colors">
                            <div className="mb-4 p-3 bg-blue-900/30 rounded-full text-primary">
                                {portal.icon}
                            </div>
                            <h2 className="text-xl font-bold mb-2 text-white">{portal.name}</h2>
                            <p className="text-gray-400">{portal.desc}</p>
                        </Card3D>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
