import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, ArrowRight, AlertCircle, Check, Building2, ChevronRight, X } from 'lucide-react';
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
  const switchAttempted = React.useRef(false); // Prevent duplicate attempts in one mount cycle

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

    // Valid login means we have an account AND it matches the current active tenant
    const activeTenantId = RuntimeConfig.getActiveTenantId();
    const matchingAccount = accounts.find(acc => acc.tenantId === activeTenantId);

    if (matchingAccount) {
      console.log(`[LandingPage] ✅ Valid session found for tenant: ${activeTenantId}`);

      // Centralized cleanup and context setting
      RuntimeConfig.finishLogin(matchingAccount);
      instance.setActiveAccount(matchingAccount);

      localStorage.setItem('m365_user', matchingAccount.name || matchingAccount.username.split('@')[0]);
      navigate('/service/overview');
    }
  }, [accounts, navigate, inProgress, instance]);

  // Handle auto-login flow (The "Soft Switch" continuation)
  useEffect(() => {
    const pendingTenant = RuntimeConfig.getPendingTenant();

    if (pendingTenant && pendingTenant.tenantId && pendingTenant.autoLogin === true) {
      if (switchAttempted.current) return;

      const attemptKey = `m365_switch_attempts_${pendingTenant.tenantId}`;
      const attempts = parseInt(localStorage.getItem(attemptKey) || '0', 10);

      if (attempts >= 1) {
        console.warn(`[LandingPage] 🛡️ Automated switch attempt already failed for ${pendingTenant.tenantId}. Awaiting manual intervention.`);
        setSwitchingTenant(false);
        return;
      }

      console.log(`[LandingPage] 🔄 Attempting seamless transition for: ${pendingTenant.displayName}`);
      setSwitchingTenant(true);
      switchAttempted.current = true;
      localStorage.setItem(attemptKey, '1');

      const timer = setTimeout(async () => {
        try {
          const allAccounts = instance.getAllAccounts();
          const targetAccount = allAccounts.find(acc => acc.tenantId === pendingTenant.tenantId);

          if (targetAccount) {
            console.log(`[LandingPage] 💡 Found cached account for ${pendingTenant.displayName}, attempting silent SSO...`);
            const response = await instance.ssoSilent({ ...loginRequest, account: targetAccount });
            RuntimeConfig.finishLogin(response.account);
            navigate('/service/overview');
            return;
          }

          // USE LOGIN HINT: If we don't have a cached account but know the email, use it as a hint.
          const loginHint = RuntimeConfig.getLoginHint(pendingTenant.tenantId);
          if (loginHint) {
            console.log(`[LandingPage] 🎯 Targeting switch with silent SSO for: ${loginHint}`);
            try {
              const response = await instance.ssoSilent({
                ...loginRequest,
                loginHint
              });
              RuntimeConfig.finishLogin(response.account);
              navigate('/service/overview');
              return;
            } catch (ssoErr) {
              console.warn('[LandingPage] Silent SSO failed. Stopping auto-login to prevent loop.', ssoErr);
              setSwitchingTenant(false);
              // Stop auto-login for this tenant to avoid reloading and re-failing
              RuntimeConfig.setPendingTenant(pendingTenant.tenantId, pendingTenant.clientId, pendingTenant.displayName, false);
            }
            return;
          }

          // IF NO HINT: Stop auto-flow to prevent Microsoft from over-guessing.
          console.warn(`[LandingPage] 🛡️ No reliable hint for ${pendingTenant.displayName}. Waiting for manual login.`);
          setSwitchingTenant(false);
          RuntimeConfig.setPendingTenant(pendingTenant.tenantId, pendingTenant.clientId, pendingTenant.displayName, false);
        } catch (err) {
          console.warn('[LandingPage] Seamless SSO sequence failed.', err);
          setSwitchingTenant(false);
          RuntimeConfig.setPendingTenant(pendingTenant.tenantId, pendingTenant.clientId, pendingTenant.displayName, false);
        }
      }, 1500); // Slight buffer to ensure MSAL state is settled

      return () => clearTimeout(timer);
    } else if (pendingTenant && !pendingTenant.autoLogin) {
      console.log('[LandingPage] Stale pending tenant found (no autoLogin) — clearing.');
      RuntimeConfig.clearPendingTenant();
    }
  }, [accounts, instance, inProgress]);

  const handleLogin = (loginType) => {
    if (!selectedTenant) {
      setError('Please select your environment first.');
      return;
    }

    setError('');
    setLoading(true);

    // Reset loop counter on manual action to ensure user can recover
    const attemptKey = `m365_switch_attempts_${selectedTenant.tenantId}`;
    localStorage.removeItem(attemptKey);

    const activeTenantId = RuntimeConfig.getActiveTenantId();
    const activeClientId = RuntimeConfig.get('VITE_CLIENT_ID');
    const loginHint = RuntimeConfig.getLoginHint(selectedTenant.tenantId);

    // If we are already configured for this tenant, trigger direct login instead of reloading
    if (activeTenantId === selectedTenant.tenantId && activeClientId === selectedTenant.clientId) {
      console.log(`[LandingPage] 🎯 Targeting manual login for: ${selectedTenant.displayName}`);

      const request = { ...loginRequest };

      if (loginHint) {
        console.log(`[LandingPage] 💡 Using login hint: ${loginHint}`);
        request.loginHint = loginHint;
      } else {
        // CRITICAL FIX: If we don't have a hint, FORCE Microsoft to show the account picker.
        // This stops it from auto-picking the first session it finds (which might be the wrong tenant).
        console.log(`[LandingPage] 🛡️ No hint available. Enforcing 'select_account' prompt to prevent cross-tenant errors.`);
        request.prompt = 'select_account';
      }

      instance.loginRedirect(request).catch(err => {
        console.error('Manual login failed:', err);
        setError('Login failed. Please try again.');
        setLoading(false);
      });
      return;
    }

    // This is the "Soft Switch" entry point.
    // We store the target config and RELOAD so MSAL reboots with the target ClientID.
    console.log(`[LandingPage] Switching to ${selectedTenant.displayName}, reloading with new config...`);
    RuntimeConfig.setPendingTenant(
      selectedTenant.tenantId,
      selectedTenant.clientId,
      selectedTenant.displayName,
      true   // autoLogin — triggers the useEffect after reload
    );

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
          
          <button
              onClick={() => {
                  setLoading(false);
                  setSwitchingTenant(false);
                  sessionStorage.removeItem('msal_login_attempt');
                  RuntimeConfig.clearPendingTenant();
                  // Force a full location reload to reset MSAL state completely
                  window.location.reload();
              }}
              style={{
                  marginTop: '28px', padding: '8px 20px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: '20px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = '#9ca3af';
              }}
          >
              <X size={14} /> Cancel Connection
          </button>
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
