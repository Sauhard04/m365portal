import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import './DocumentationPage.css'; // Reuse existing styles

const PDFViewerPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    // Add parameters to hide toolbar, nav panes, and scrollbars
    // Note: This works in Chrome/Edge/Firefox for their default PDF viewers
    const pdfUrl = `/api/pdfs/view/${id}#toolbar=0&navpanes=0&scrollbar=0`;

    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    return (
        <div
            className="page-content"
            style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}
            onContextMenu={handleContextMenu}
        >
            <div className="doc-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/service/documentation')}
                            className="glass-card"
                            style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Document Viewer</h1>
                    </div>


                </div>
            </div>

            <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden', borderRadius: '16px', position: 'relative' }}>
                {/* Transparent overlay for extra click protection if needed, though interaction is usually desired for scrolling */}
                <iframe
                    src={pdfUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: '#fff'
                    }}
                    title="PDF Viewer"
                />
            </div>
        </div>
    );
};

export default PDFViewerPage;
