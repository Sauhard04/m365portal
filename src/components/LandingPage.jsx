import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import styles from './LandingPage.module.css';
import Logo from './Logo';
import Loader3D from './Loader3D';

const LandingPage = () => {
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically redirect if already signed in
  React.useEffect(() => {
    if (accounts.length > 0) {
      const username = accounts[0].name || accounts[0].username.split('@')[0];
      localStorage.setItem('m365_user', username);
      navigate('/service/overview');
    }
  }, [accounts, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await instance.loginRedirect(loginRequest);
      // Logic after redirect happens when component remounts
    } catch (err) {
      console.error(err);
      setError('Login failed. Please ensure your Azure App Registration is configured correctly.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.landingPage}>
      {/* Dynamic Background */}
      <div className={styles.backgroundDecor}>
        <div className={`${styles.glow} ${styles.glowBlue}`} />
        <div className={`${styles.glow} ${styles.glowPurple}`} />
      </div>

      <div className={styles.landingContent}>
        {/* Left Branding Section */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={styles.brandingSection}
        >
          <div className={styles.logoContainer}>
            <Logo size={48} />
            <span className={styles.logoText}>AdminSphere</span>
          </div>

          <h1 className={styles.heroTitle}>
            Unified <span className="primary-gradient-text">Intelligence</span><br />
            for Microsoft 365
          </h1>

          <p className={styles.heroSubtitle}>
            Deeper visibility, safer execution, and modern analytics for your enterprise tenant.
            Empowering IT teams with real-time insights across your M365 ecosystem.
          </p>
        </motion.div>

        {/* Right Sign In Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <div className={styles.signInCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Enterprise Sign In</h2>
              <p className={styles.cardDescription}>
                Authorize with your Microsoft Corporate Identity
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={styles.errorAlert}
                >
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={styles.loginButton}
              onClick={handleLogin}
              disabled={loading}
            >
              <Shield size={22} className={styles.buttonIcon} />
              <span>Sign in with Microsoft</span>
              <ArrowRight size={20} className={styles.buttonIcon} style={{ marginLeft: 'auto' }} />
            </motion.button>
            {loading && <Loader3D showOverlay={true} text="Connecting to Microsoft..." />}

            <div className={styles.footerInfo}>
              <Zap size={14} className={styles.footerIcon} />
              <span>OAuth 2.0 Secure Connection via Microsoft Entra ID</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
