import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { PurviewService } from '../services/purview';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Folder, FileText, Link as LinkIcon } from 'lucide-react';
import Loader3D from './Loader3D';

const GlossaryPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [terms, setTerms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('terms'); // 'terms' or 'categories'

    useEffect(() => {
        fetchGlossary();
    }, [accounts]);

    const fetchGlossary = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const response = await instance.acquireTokenSilent({
                scopes: ['https://purview.azure.net/.default'],
                account: accounts[0]
            });

            const [termsData, categoriesData] = await Promise.all([
                PurviewService.getGlossaryTerms(response.accessToken),
                PurviewService.getGlossaryCategories(response.accessToken)
            ]);

            setTerms(termsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error fetching glossary:', error);
            console.warn('Purview API call failed. Please configure Purview endpoint in .env');
            setTerms([]);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        return status === 'Approved' ? 'var(--accent-success)' : 'var(--accent-warning)';
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '32px' }}>Business Glossary</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Standardized business terminology and definitions</p>
                    </div>
                </div>
                <div className="flex-gap-2">
                    <button
                        onClick={() => setView('terms')}
                        style={{
                            padding: '8px 16px',
                            background: view === 'terms' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${view === 'terms' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Terms ({terms.length})
                    </button>
                    <button
                        onClick={() => setView('categories')}
                        style={{
                            padding: '8px 16px',
                            background: view === 'categories' ? 'var(--accent-purple)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${view === 'categories' ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Categories ({categories.length})
                    </button>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : (
                <>
                    {view === 'terms' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                            {terms.map((term, idx) => (
                                <motion.div
                                    key={term.guid}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="glass-card"
                                    style={{ padding: '20px', cursor: 'pointer' }}
                                >
                                    <div className="flex-between" style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={18} color="var(--accent-indigo)" />
                                            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{term.name}</span>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: `${getStatusColor(term.status)}20`,
                                            border: `1px solid ${getStatusColor(term.status)}`,
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: getStatusColor(term.status)
                                        }}>
                                            {term.status}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                                        {term.definition}
                                    </p>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Folder size={12} />
                                            {term.category}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <LinkIcon size={12} />
                                            {term.relatedTerms} related
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                            {categories.map((category, idx) => (
                                <motion.div
                                    key={category.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="glass-card"
                                    style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}
                                >
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        margin: '0 auto 16px',
                                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 8px 16px rgba(139, 92, 246, 0.2)'
                                    }}>
                                        <Folder size={28} color="white" />
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        {category.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                                        {category.termCount} terms
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default GlossaryPage;
