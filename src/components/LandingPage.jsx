import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, ArrowRight, AlertCircle, Check, Building2, ChevronRight } from 'lucide-react';
import styles from './LandingPage.module.css';
import Logo from './Logo';
import Loader3D from './Loader3D';
import RuntimeConfig from '../config';

const LandingPage = () => {
  const navigate = useNavigate();
  const { instance, accounts, inProgress } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [switchingTenant, setSwitchingTenant] = useState(false);

  // Tenant selection state (shown before login)
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Fetch available tenants for pre-login selection
  useEffect(() => {
    fetch('/api/tenants')
      .then(r => r.json())
      .then(data => {
        setTenants(data);
        // If only one tenant, auto-select it
        if (data.length === 1) setSelectedTenant(data[0]);
      })
      .catch(err => {
        console.error('[LandingPage] Could not load tenants:', err);
      })
      .finally(() => setTenantsLoading(false));
  }, []);

  // After a successful login, redirect into the portal.
  // Wait for MSAL to finish handling any redirect (inProgress === None) before navigating.
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return; // MSAL still processing redirect
    if (accounts.length > 0) {
      const account = accounts[0];
      localStorage.setItem('m365_user', account.name || account.username.split('@')[0]);

      const pendingTenant = RuntimeConfig.getPendingTenant();
      if (pendingTenant && pendingTenant.tenantId) {
        RuntimeConfig.setActiveTenant(pendingTenant.tenantId, account.homeAccountId);
        RuntimeConfig.clearPendingTenant();
        console.log(`[LandingPage] ✅ Login complete. Active tenant: ${pendingTenant.tenantId}`);
      }

      RuntimeConfig.setCurrentUser(account.homeAccountId);
      navigate('/service/overview');
    }
  }, [accounts, navigate, inProgress]);

  // Auto-trigger login ONLY when pendingTenant.autoLogin === true AND MSAL is idle.
  // Checking inProgress === None prevents calling loginRedirect while MSAL is
  // still processing an auth redirect callback (which would throw interaction_in_progress).
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return; // Wait for MSAL to finish
    if (accounts.length > 0) return;                   // Already logged in

    const pendingTenant = RuntimeConfig.getPendingTenant();

    if (pendingTenant && pendingTenant.tenantId && pendingTenant.autoLogin === true) {
      console.log(`[LandingPage] 🔄 Auto-login for: ${pendingTenant.displayName} (clientId: ${pendingTenant.clientId})`);
      setSwitchingTenant(true);
      const timer = setTimeout(() => {
        instance.loginRedirect(loginRequest).catch(err => {
          console.error('[LandingPage] Auto-login failed, auto-resetting environment:', err);
          RuntimeConfig.clearPendingTenant();
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        });
      }, 400);
      return () => clearTimeout(timer);
    } else if (pendingTenant && !pendingTenant.autoLogin) {
      console.log('[LandingPage] Stale pending tenant found (no autoLogin) — clearing.');
      RuntimeConfig.clearPendingTenant();
    }
  }, [accounts, instance, inProgress]);

  const handleLogin = () => {
    if (!selectedTenant) {
      setError('Please select your environment first.');
      return;
    }

    setError('');
    setLoading(true);

    // Store the full tenant config in localStorage so initialize() on next page
    // load configures MSAL with the correct clientId and authority.
    // autoLogin: true signals LandingPage to auto-trigger loginRedirect after reload.
    RuntimeConfig.setPendingTenant(
      selectedTenant.tenantId,
      selectedTenant.clientId,
      selectedTenant.displayName,
      true   // autoLogin — only set on explicit user Sign In action
    );

    // Reload so main.jsx re-runs RuntimeConfig.initialize() with the pending tenant
    // and MSAL boots with the correct credentials for the selected environment.
    window.location.reload();
  };

  // Unique color per tenant (consistent hash)
  const getTenantColor = (name = '') => {
    const palettes = [
      { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', dot: '#818cf8', solid: '#6366f1' },
      { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', dot: '#34d399', solid: '#10b981' },
      { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', dot: '#fbbf24', solid: '#f59e0b' },
      { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', dot: '#f472b6', solid: '#ec4899' },
      { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.35)', dot: '#38bdf8', solid: '#0ea5e9' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palettes[Math.abs(hash) % palettes.length];
  };

  return (
    <div className={styles.landingPage}>
      {/* Full-screen overlay during redirect */}
      {(switchingTenant || loading) && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(6,8,20,0.96)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            width: 48, height: 48, border: '3px solid rgba(255,255,255,0.08)',
            borderTop: '3px solid #818cf8', borderRadius: '50%',
            animation: 'spin 0.9s linear infinite', marginBottom: 20,
          }} />
          <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>
            {loading ? `Connecting to ${selectedTenant?.displayName || 'Environment'}…` : 'Redirecting to Microsoft Login…'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
            Setting up secure session
          </div>
        </div>
      )}

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
          transition={{ duration: 0.8, ease: 'easeOut' }}
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
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          <div className={styles.signInCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Enterprise Sign In</h2>
              <p className={styles.cardDescription}>
                Select your environment, then authorize with Microsoft
              </p>
            </div>

            {/* ── Tenant Picker ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#4b5563',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Building2 size={11} style={{ color: '#6366f1' }} />
                Select Environment
              </div>

              {tenantsLoading ? (
                <div style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                  Loading environments…
                </div>
              ) : tenants.length === 0 ? (
                <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                  No environments found. Check server connection.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tenants.map(tenant => {
                    const color = getTenantColor(tenant.displayName);
                    const isSelected = selectedTenant?.tenantId === tenant.tenantId;
                    const initials = (tenant.displayName || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={tenant.tenantId}
                        onClick={() => { setSelectedTenant(tenant); setError(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                          background: isSelected ? color.bg : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${isSelected ? color.border : 'rgba(255,255,255,0.08)'}`,
                          transition: 'all 0.18s ease', textAlign: 'left',
                          boxShadow: isSelected ? `0 0 0 1px ${color.border}` : 'none',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 9,
                          background: color.bg, border: `1px solid ${color.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: color.dot, flexShrink: 0,
                        }}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? color.dot : '#e2e8f0' }}>
                            {tenant.displayName}
                          </div>
                          <div style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace', marginTop: 1 }}>
                            {tenant.tenantId.substring(0, 8)}…
                          </div>
                        </div>

                        {/* Check */}
                        {isSelected && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: color.bg, border: `1.5px solid ${color.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={11} style={{ color: color.dot }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
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
              disabled={loading || tenantsLoading || !selectedTenant}
              style={{ opacity: selectedTenant ? 1 : 0.5 }}
            >
              <Shield size={22} className={styles.buttonIcon} />
              <span>Sign in with Microsoft</span>
              <ArrowRight size={20} className={styles.buttonIcon} style={{ marginLeft: 'auto' }} />
            </motion.button>

            {/* Reset Recovery Path */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-secondary)', fontSize: '11px',
                  cursor: 'pointer', textDecoration: 'underline', opacity: 0.7
                }}
              >
                Trouble signing in? Reset environment
              </button>
            </div>

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
