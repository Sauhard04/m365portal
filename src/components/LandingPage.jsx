import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { motion } from 'framer-motion';
import { Shield, Zap, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please ensure your Azure App Registration is configured correctly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden relative">
      {/* Enhanced Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/15 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/15 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2"
        />
      </div>

      <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Branding & Info */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-3 mb-6"
          >
            <div className="grid grid-cols-2 gap-1 p-2 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="w-4 h-4 bg-[#f25022] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#7fba00] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#00a4ef] rounded-sm"></div>
              <div className="w-4 h-4 bg-[#ffb900] rounded-sm"></div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white font-['Outfit'] bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              M365 Portal
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight text-white mb-6"
          >
            Unified <span className="primary-gradient">Operations</span><br />for the Modern Cloud
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-300 max-w-lg leading-relaxed"
          >
            Gain deeper visibility and safer execution for your Microsoft 365 environment.
            Connect your Microsoft account to securely manage your tenant.
          </motion.p>
        </motion.div>

        {/* Right Side: Signin Card */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass p-10 md:p-12 shadow-2xl relative overflow-hidden border border-white/10"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 blur-[80px] rounded-full"></div>

          <motion.div layout className="mb-10 relative z-10">
            <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Enterprise Sign In
            </h2>
            <p className="text-gray-400 text-base">Sign in with your Microsoft 365 Work Account</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 text-sm backdrop-blur-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6 relative z-10">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary w-full py-6 text-lg flex items-center justify-center space-x-4 mt-4 shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-0.5 p-1 bg-white/10 rounded">
                    <div className="w-2 h-2 bg-[#f25022] rounded-sm"></div>
                    <div className="w-2 h-2 bg-[#7fba00] rounded-sm"></div>
                    <div className="w-2 h-2 bg-[#00a4ef] rounded-sm"></div>
                    <div className="w-2 h-2 bg-[#ffb900] rounded-sm"></div>
                  </div>
                  <span className="font-semibold">Sign in with Microsoft</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <span>Secure enterprise connection via Microsoft Identity platform</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-12 text-gray-600 text-sm flex space-x-6"
      ></motion.div>
    </div>
  );
};

export default LandingPage;
