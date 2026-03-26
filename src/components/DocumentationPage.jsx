import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, CheckCircle, XCircle } from 'lucide-react';
import './DocumentationPage.css';

const DocumentationPage = () => {
    const navigate = useNavigate();
    const [pdfFiles, setPdfFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message: string }
    const fileInputRef = useRef(null);

    const loadPDFs = async () => {
        try {
            const response = await fetch('/api/pdfs');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            if (Array.isArray(files)) {
                setPdfFiles(files);
            } else {
                console.error('API did not return an array:', files);
                setPdfFiles([]);
            }
        } catch (error) {
            console.error('Error loading PDFs:', error);
            setPdfFiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPDFs();
    }, []);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.includes('pdf')) {
            setUploadStatus({
                type: 'error',
                message: 'Please upload a PDF file'
            });
            setTimeout(() => setUploadStatus(null), 3000);
            return;
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            setUploadStatus({
                type: 'error',
                message: 'File size must be less than 50MB'
            });
            setTimeout(() => setUploadStatus(null), 3000);
            return;
        }

        setUploading(true);
        setUploadStatus(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/pdfs/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setUploadStatus({
                    type: 'success',
                    message: `Successfully uploaded ${result.fileName}`
                });
                // Reload the PDF list
                await loadPDFs();
                // Clear the file input
                event.target.value = '';
                // Clear success message after 3 seconds
                setTimeout(() => setUploadStatus(null), 3000);
            } else {
                setUploadStatus({
                    type: 'error',
                    message: result.error || 'Upload failed'
                });
                setTimeout(() => setUploadStatus(null), 3000);
            }
        } catch (error) {
            setUploadStatus({
                type: 'error',
                message: 'Failed to upload file'
            });
            console.error('Upload error:', error);
            setTimeout(() => setUploadStatus(null), 3000);
        } finally {
            setUploading(false);
        }
    };

    const handlePDFClick = (pdfId) => {
        // Navigate to the viewer page
        navigate(`/service/documentation/view/${pdfId}`);
    };

    return (
        <div className="page-content">
            <div className="doc-container">
                <div className="doc-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1>Documentation</h1>
                            <p className="doc-content" style={{ marginTop: '12px' }}>
                                Browse and access all available documentation files
                            </p>
                        </div>
                        <button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="upload-button"
                        >
                            {uploading ? (
                                <>
                                    <div className="spinner-sm" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px', borderRadius: '50%' }}></div>
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    <span>Upload PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {/* Upload status notification */}
                {uploadStatus && (
                    <div
                        className="glass-card upload-status"
                        style={{
                            background: uploadStatus.type === 'success'
                                ? 'linear-gradient(135deg, hsla(142, 76%, 36%, 0.15), hsla(142, 76%, 46%, 0.15))'
                                : 'linear-gradient(135deg, hsla(0, 76%, 46%, 0.15), hsla(0, 76%, 56%, 0.15))',
                            borderLeft: `4px solid ${uploadStatus.type === 'success' ? '#22c55e' : '#ef4444'}`
                        }}
                    >
                        {uploadStatus.type === 'success' ? (
                            <CheckCircle size={24} style={{ color: '#22c55e' }} />
                        ) : (
                            <XCircle size={24} style={{ color: '#ef4444' }} />
                        )}
                        <p className="doc-content" style={{ margin: 0 }}>
                            {uploadStatus.message}
                        </p>
                    </div>
                )}


                {loading ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <FileText size={48} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
                        <p className="doc-content">Loading documentation...</p>
                    </div>
                ) : pdfFiles.length === 0 ? (
                    <div className="glass-card flex-center-col" style={{ padding: '80px 20px', minHeight: '400px' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'var(--glass-border)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
                        }}>
                            <FileText size={40} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No Documentation Found</h3>
                        <p className="doc-content" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
                            Upload PDF manuals, guides, or reports to make them accessible here.
                        </p>
                        <button onClick={handleUploadClick} className="secondary-button" style={{ fontSize: '14px', padding: '8px 20px' }}>
                            Upload First Document
                        </button>
                    </div>
                ) : (
                    <div className="doc-grid">
                        {pdfFiles.map((pdf, index) => (
                            <div
                                key={index}
                                className="glass-card doc-card"
                                onClick={() => handlePDFClick(pdf.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div
                                    className="doc-icon-box"
                                    style={{
                                        background: 'linear-gradient(135deg, hsla(217, 91%, 60%, 0.15), hsla(186, 100%, 69%, 0.15))'
                                    }}
                                >
                                    <FileText size={24} style={{ color: 'var(--accent-blue)' }} />
                                </div>
                                <h3 className="doc-title">{pdf.name}</h3>
                                <p className="doc-content">Click to view PDF document</p>
                                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="tag-label">PDF</span>
                                    {pdf.uploadedAt && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            {new Date(pdf.uploadedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}


            </div>
        </div>
    );
};

export default DocumentationPage;
