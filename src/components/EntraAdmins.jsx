import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { RolesService } from '../services/entra';
import { ArrowLeft, Search, ShieldCheck, ChevronDown, ChevronRight, User } from 'lucide-react';
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
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await RolesService.getRoles(client);
                    // Filter mainly for roles that have members? Or show all active.
                    // Usually we want to see roles that have assignments.
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

    const toggleExpand = (roleId) => {
        setExpandedRole(expandedRole === roleId ? null : roleId);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/service/entra')}
                    className="group relative px-6 py-2.5 rounded-full text-white font-medium bg-gradient-to-r from-[#00a4ef] to-[#0078d4] hover:from-[#2bbafa] hover:to-[#1089e6] shadow-[0_0_20px_rgba(0,164,239,0.3)] hover:shadow-[0_0_30px_rgba(0,164,239,0.5)] transition-all duration-300 flex items-center gap-2 overflow-hidden border border-white/10 mb-6"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <ArrowLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
                    <span className="relative z-10">Back to Dashboard</span>
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                        Admin Roles
                    </h1>
                    <p className="text-gray-400 mt-1">Privileged roles and assignments</p>
                </div>

                <div className="glass overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 w-12"></th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Role Name</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Description</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Assigned Users</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <React.Fragment key={role.id}>
                                    <tr
                                        className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${expandedRole === role.id ? 'bg-white/5' : ''}`}
                                        onClick={() => toggleExpand(role.id)}
                                    >
                                        <td className="p-4 text-center">
                                            {expandedRole === role.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        <td className="p-4 font-medium text-white flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-red-400" />
                                            {role.displayName}
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm max-w-sm truncate">{role.description}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold">
                                                {role.members ? role.members.length : 0}
                                            </span>
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {expandedRole === role.id && role.members && (
                                            <motion.tr
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <td colSpan="4" className="p-0 bg-black/20 inset-shadow-inner">
                                                    <div className="p-4 pl-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {role.members.map(member => (
                                                            <div key={member.id} className="flex items-center gap-3 p-3 rounded bg-white/5 border border-white/5">
                                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                                                    <User className="w-4 h-4 text-gray-300" />
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <div className="text-sm font-medium text-white truncate">{member.displayName}</div>
                                                                    <div className="text-xs text-gray-500 truncate">{member.userPrincipalName || 'N/A'}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default EntraAdmins;
