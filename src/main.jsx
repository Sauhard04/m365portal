import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { getMsalConfig } from './authConfig'
import './index.css'
import App from './App.jsx'

// Suppress harmless 'AbortError' from media playback (often caused by browser extensions or HMR interruptions)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'AbortError' && typeof event.reason.message === 'string' && event.reason.message.includes('play()')) {
    event.preventDefault();
  }
});

import RuntimeConfig from './config'

// Initialize runtime configuration, then MSAL, then render
RuntimeConfig.initialize().then(async () => {
  const msalInstance = new PublicClientApplication(getMsalConfig());

  // Initialize MSAL before rendering
  await msalInstance.initialize();

  // Handle any incoming redirect BEFORE rendering the app
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response && response.account) {
      console.log('[main] 🏁 Redirect login successful:', response.account.username);
      msalInstance.setActiveAccount(response.account);

      // Centralized cleanup via RuntimeConfig
      RuntimeConfig.finishLogin(response.account);
    }
  } catch (err) {
    console.error('[main] MSAL redirect error:', err);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
});
