import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const loginResponse = await instance.loginPopup(loginRequest);
      localStorage.setItem('m365_user', loginResponse.account.name || loginResponse.account.username.split('@')[0]);
      navigate('/service/admin');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please ensure your Azure App Registration is configured correctly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Background Glows */}
      <div className="background-decor">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="glow glow-blue"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="glow glow-purple"
        />
      </div>

      <div className="landing-content">
        {/* Left Section */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="branding-section"
        >
          <div className="flex-center flex-gap-4 spacing-v-8">
            <div className="logo-grid">
              <div style={{ backgroundColor: '#f25022' }}></div>
              <div style={{ backgroundColor: '#7fba00' }}></div>
              <div style={{ backgroundColor: '#00a4ef' }}></div>
              <div style={{ backgroundColor: '#ffb900' }}></div>
            </div>
            <span className="font-bold" style={{ fontSize: '24px' }}>M365 Operations</span>
          </div>

          <h1 className="hero-title">
            Unified <span className="primary-gradient-text">Intelligence</span><br />
            for Microsoft 365
          </h1>

          <p className="hero-subtitle">
            Deeper visibility, safer execution, and modern analytics for your enterprise tenant.
            Sign in with your work account to get started.
          </p>
        </motion.div>

        {/* Right Section: Sign In Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="glass-card sign-in-card">
            <h2 className="spacing-v-4 title-gradient">Enterprise Sign In</h2>
            <p className="spacing-v-8" style={{ color: 'var(--text-secondary)' }}>
              Authorize with your Microsoft Identity
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="error-alert spacing-v-8"
                >
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className="btn btn-primary w-full"
              onClick={handleLogin}
              disabled={loading}
              style={{ padding: '20px', fontSize: '16px' }}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Shield size={20} />
                  <span>Sign in with Microsoft</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="flex-center flex-gap-2 mt-8" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '24px' }}>
              <Zap size={12} />
              <span>OAuth 2.0 Secure Connection via Microsoft Entra</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .landing-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
          position: relative;
          overflow: hidden;
          background: var(--bg-darker);
        }
        .background-decor {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.1;
        }
        .glow-blue { top: -10%; right: -10%; background: var(--accent-blue); }
        .glow-purple { bottom: -10%; left: -10%; background: var(--accent-purple); }

        .landing-content {
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          max-width: 1400px;
          align-items: center;
        }

        .hero-title {
          font-size: 84px;
          line-height: 1.1;
          margin-bottom: 32px;
        }
        .hero-subtitle {
          font-size: 20px;
          color: var(--text-secondary);
          max-width: 500px;
          line-height: 1.6;
        }

        .sign-in-card {
          padding: 60px;
          max-width: 500px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.5);
        }

        .logo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 8px;
          background: hsla(0,0%,100%,0.05);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }
        .logo-grid div { width: 14px; height: 14px; border-radius: 2px; }

        .error-alert {
          background: hsla(0, 84%, 60%, 0.1);
          border: 1px solid hsla(0, 84%, 60%, 0.2);
          color: var(--accent-error);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        @media (max-width: 1024px) {
          .landing-content { grid-template-columns: 1fr; gap: 60px; text-align: center; }
          .hero-subtitle { margin: 0 auto; }
          .hero-title { font-size: 56px; }
          .branding-section { order: 2; }
          .landing-page { padding: 40px 20px; }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
