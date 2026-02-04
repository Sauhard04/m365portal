import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mail, User, Building, MessageSquare } from 'lucide-react';
import './SupportPage.css';

const SupportPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, sending, success

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');

        // Web3Forms API - FREE (250 submissions/month)
        // Access key is stored in .env file as VITE_WEB3FORMS_ACCESS_KEY
        const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    access_key: WEB3FORMS_ACCESS_KEY,
                    subject: `AdminSphere Support Request from ${formData.name}`,
                    from_name: formData.name,
                    email: formData.email,
                    message: formData.message
                })
            });

            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' });
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                console.error('Web3Forms Error:', result);
                setStatus('error');
                setTimeout(() => setStatus('idle'), 3000);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="support-page-container">
            <div className="support-glass-card">

                {/* Header with Back Button */}
                <div className="support-header">
                    <div>
                        <h1 className="support-title">Get Support</h1>
                        <p className="support-subtitle">We are here to help. Send us a message.</p>
                    </div>
                    <button onClick={() => navigate(-1)} className="back-button" title="Go Back">
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </button>
                </div>

                {/* Success Message */}
                {status === 'success' ? (
                    <div className="success-message">
                        <div className="success-icon">✓</div>
                        <h2>Thank you for your Query!</h2>
                        <p>Our team will contact you soon.</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="send-button"
                            style={{ marginTop: '20px' }}
                        >
                            Send Another Message
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="support-form">

                        <div className="form-group">
                            <label htmlFor="name">
                                <User size={16} /> Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                                className="glass-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <Building size={16} /> Company Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@company.com"
                                required
                                className="glass-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">
                                <MessageSquare size={16} /> Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="How can we assist you today?"
                                required
                                rows={5}
                                className="glass-input"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className={`send-button ${status}`} disabled={status === 'sending'}>
                                {status === 'sending' ? (
                                    <span>Sending...</span>
                                ) : status === 'error' ? (
                                    <span>✕ Failed to Send - Try Again</span>
                                ) : (
                                    <>
                                        <Send size={18} /> Send Message
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SupportPage;
