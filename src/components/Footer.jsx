import React, { useState } from 'react';
import { Shield, Book, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PolicyModal = ({ isOpen, onClose, title, content }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    style={{ 
                        position: 'fixed', inset: 0, zIndex: 99999, 
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' 
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                        animate={{ scale: 1, opacity: 1, y: 0 }} 
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="glass-card"
                        style={{ 
                            width: '100%', maxWidth: '800px', maxHeight: '85vh', 
                            display: 'flex', flexDirection: 'column', 
                            background: 'var(--bg-light)', position: 'relative' 
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ 
                            padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            background: 'var(--glass-bg)', borderRadius: '20px 20px 0 0'
                        }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                {title === 'Privacy Policy' ? <Shield size={18} color="var(--accent-indigo)" /> : <Book size={18} color="var(--accent-blue)" />}
                                {title}
                            </h2>
                            <button onClick={onClose} className="btn-secondary" style={{ padding: '6px', borderRadius: '8px', background: 'var(--glass-bg)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ 
                            padding: '24px', overflowY: 'auto', fontSize: '13px', 
                            lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-line' 
                        }}>
                            {content}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Footer = () => {
    const [openModal, setOpenModal] = useState(null);

    const privacyContent = `Last updated: 12 March 2026

1. Overview
This Privacy Policy explains how Meridian Solutions Private Limited (“Meridian”) collects, uses, and protects personal data when you use license.onmeridian.com.

2. Data Fiduciary / Controller
Meridian Solutions Private Limited
Tower B, Office No 1103 & 1104, 11th Floor,
Spaze IT Tech Park, Sohna Road,
Gurugram, Haryana, India
Phone: 1800‑102‑2150

Official Contact (Support, Privacy & Grievance):
techsupport@onmeridian.com

3. Information We Collect
• Business contact information (name, email, phone, organization)
• Licensing‑related inputs and requests
• Support communications
• Technical usage data (IP address, browser, timestamps)

4. Purpose of Processing
• Operate and secure the Platform
• Process licensing and support requests
• Improve service quality and reliability
• Meet legal and regulatory obligations

5. Legal Basis
Processing is based on contractual necessity, legitimate business interests, legal obligations, or user consent, as applicable under GDPR and India’s Digital Personal Data Protection Act, 2023.

6. Data Sharing
Personal data is not sold. It may be shared with trusted service providers, Microsoft or distributors (for CSP transactions), or authorities where legally required.

7. Data Retention & Security
Data is retained only as long as necessary and protected using reasonable technical and organizational safeguards.

8. Your Rights (GDPR & DPDP)
• Access, correction, and deletion of personal data
• Restriction or objection to processing (where applicable)
• Grievance redressal under India DPDP Act
Requests can be made by emailing:
techsupport@onmeridian.com
(Subject: “Privacy Request – License Portal”)

9. Updates
This Policy may be updated periodically. Continued use of the Platform constitutes acceptance of the updated Policy.`;

    const termsContent = `Last updated: 12 March 2026

1. Introduction
These Terms & Conditions govern access to and use of license.onmeridian.com (the “Platform”), operated by Meridian Solutions Private Limited (“Meridian”). By using the Platform, you agree to these Terms.

2. Platform Purpose
The Platform provides informational tools and workflows related to Microsoft and cloud licensing requests, comparisons, and coordination. The Platform is intended for business and enterprise users only.

3. Important Disclaimer (Accuracy & Finality)
• Information displayed on this Platform may include estimates, comparisons, recommendations, or inputs based on customer‑provided data.
• The information may not represent final, complete, or contractually binding data.
• Meridian does not guarantee the accuracy, completeness, or current validity of information shown on the Platform.
• Final licensing terms, quantities, pricing, and entitlements are governed solely by Microsoft agreements and official confirmations.
• Meridian shall not be responsible for decisions made based on information presented on this Platform.

4. Microsoft CSP & Customer Agreements
Microsoft products and services are licensed under Microsoft’s own agreements (e.g., Microsoft Customer Agreement). Where Meridian acts as a Cloud Solution Provider (CSP), customers must accept the applicable Microsoft agreements prior to order fulfillment.
Certain subscriptions may be non‑cancellable or subject to limited cancellation windows under Microsoft commercial rules.

5. Access & Security
Users are responsible for maintaining the confidentiality of their credentials and for all activities performed under their access. Unauthorized use is prohibited.

6. Intellectual Property
All content, workflows, and branding on this Platform are the intellectual property of Meridian or its licensors. No rights are granted except for permitted business use.

7. Limitation of Liability
To the maximum extent permitted by law, Meridian shall not be liable for any indirect, incidental, consequential, or business losses arising from use of the Platform.

8. Governing Law
These Terms are governed by the laws of India. Courts in Gurugram, Haryana shall have exclusive jurisdiction.

9. Contact
For support, licensing, legal, or privacy‑related queries:
techsupport@onmeridian.com`;

    return (
        <>
            <footer className="app-footer" style={{
                marginTop: 'auto',
                padding: '16px 32px',
                borderTop: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-dim)',
                backdropFilter: 'blur(10px)',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                        onClick={() => setOpenModal('terms')} 
                        className="footer-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', transition: 'color 0.2s', padding: 0 }}
                    >
                        Terms & Conditions
                    </button>
                </div>

                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
                    <span>© 2026 Meridian Solutions Private Limited. All rights reserved.</span>
                    <span className="footer-powered" style={{ fontWeight: 600 }}>Powered by Meridian Solutions</span>
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={() => setOpenModal('privacy')} 
                        className="footer-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', transition: 'color 0.2s', padding: 0 }}
                    >
                        Privacy Policy
                    </button>
                </div>
            </footer>

            <PolicyModal 
                isOpen={openModal === 'privacy'} 
                onClose={() => setOpenModal(null)} 
                title="Privacy Policy" 
                content={privacyContent} 
            />
            
            <PolicyModal 
                isOpen={openModal === 'terms'} 
                onClose={() => setOpenModal(null)} 
                title="Terms & Conditions" 
                content={termsContent} 
            />
        </>
    );
};

export default Footer;
