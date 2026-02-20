import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { PurviewService } from '../services/purview';
import { motion } from 'framer-motion';
import { GitBranch, Database, ArrowLeft, ArrowRight, Filter, FileText } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';

const LineagePage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();

    const [lineageData, setLineageData] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [direction, setDirection] = useState('BOTH');

    useEffect(() => {
        fetchLineage();
    }, [activeTenantId]);

    const fetchLineage = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const accessToken = await acquireToken({
                scopes: ['https://purview.azure.net/.default']
            });

            // Production: Lineage requires a specific asset GUID
            // This should ideally come from navigation state or a search selection
            const queryParams = new URLSearchParams(window.location.search);
            const assetGuid = queryParams.get('guid');

            if (!assetGuid) {
                setLineageData({ nodes: [], edges: [], message: 'Please select an asset from the catalog to view its lineage.' });
                setLoading(false);
                return;
            }

            const lineage = await PurviewService.getLineage(accessToken, assetGuid, direction);
            setLineageData(lineage);
        } catch (error) {
            console.error('Error fetching lineage:', error);
            setLineageData({ nodes: [], edges: [] });
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            'Azure SQL Database': '#3b82f6',
            'Azure Data Factory': '#8b5cf6',
            'Azure Data Lake': '#06b6d4',
            'Azure Databricks': '#f59e0b',
            'Power BI': '#ec4899',
            default: '#10b981'
        };
        return colors[type] || colors.default;
    };

    // Generate Mermaid diagram syntax
    const generateMermaidDiagram = () => {
        if (!lineageData || !lineageData.nodes) return '';

        let diagram = 'graph LR\n';

        // Add nodes
        lineageData.nodes.forEach(node => {
            const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
            diagram += `    ${nodeId}["${node.name}"]\n`;
        });

        // Add edges
        lineageData.edges?.forEach(edge => {
            const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, '_');
            const toId = edge.to.replace(/[^a-zA-Z0-9]/g, '_');
            diagram += `    ${fromId} --> ${toId}\n`;
        });

        return diagram;
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '22px' }}>Data Lineage</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>End-to-end data flow visualization</p>
                    </div>
                </div>
                <div className="flex-gap-2">
                    <select
                        value={direction}
                        onChange={(e) => { setDirection(e.target.value); fetchLineage(); }}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="BOTH">Both Directions</option>
                        <option value="INPUT">Upstream Only</option>
                        <option value="OUTPUT">Downstream Only</option>
                    </select>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : (
                <>
                    {/* Lineage Flow Visualization */}
                    <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GitBranch size={16} color="var(--accent-cyan)" />
                                Lineage Flow
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Visual representation of data flow from source to destination</p>
                        </div>

                        {/* Node Flow */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {lineageData?.nodes?.map((node, idx) => (
                                <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    style={{ position: 'relative', paddingLeft: `${node.level * 40}px` }}
                                >
                                    <div
                                        className="glass-card"
                                        style={{
                                            padding: '16px 20px',
                                            background: `linear-gradient(135deg, ${getTypeColor(node.type)}15, transparent)`,
                                            border: `1px solid ${getTypeColor(node.type)}40`,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => setSelectedAsset(node)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateX(8px)';
                                            e.currentTarget.style.borderColor = getTypeColor(node.type);
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateX(0)';
                                            e.currentTarget.style.borderColor = `${getTypeColor(node.type)}40`;
                                        }}
                                    >
                                        <div className="flex-between">
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                    {node.name}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: getTypeColor(node.type),
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    background: `${getTypeColor(node.type)}20`,
                                                    borderRadius: '4px'
                                                }}>
                                                    {node.type}
                                                </div>
                                            </div>
                                            <Database size={20} style={{ color: getTypeColor(node.type), opacity: 0.6 }} />
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    {idx < (lineageData?.nodes?.length || 0) - 1 && (
                                        <div style={{
                                            marginLeft: `${(node.level * 40) + 20}px`,
                                            marginTop: '8px',
                                            marginBottom: '8px',
                                            color: 'var(--accent-cyan)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <ArrowRight size={16} />
                                            <div style={{
                                                flex: 1,
                                                height: '2px',
                                                background: 'linear-gradient(90deg, var(--accent-cyan), transparent)',
                                                borderRadius: '1px'
                                            }}></div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Lineage Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>TOTAL NODES</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                {lineageData?.nodes?.length || 0}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>TRANSFORMATIONS</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-purple)' }}>
                                {lineageData?.nodes?.filter(n => n.type.includes('Factory') || n.type.includes('Databricks'))?.length || 0}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>DATA SOURCES</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                {lineageData?.nodes?.filter(n => n.type.includes('SQL') || n.type.includes('Lake') || n.type.includes('Storage'))?.length || 0}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>OUTPUTS</div>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-success)' }}>
                                {lineageData?.nodes?.filter(n => n.type.includes('Power BI') || n.type.includes('Report'))?.length || 0}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LineagePage;
