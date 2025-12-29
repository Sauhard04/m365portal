import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'
import './index.css'
import App from './App.jsx'

// Suppress harmless 'AbortError' from media playback (often caused by browser extensions or HMR interruptions)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.name === 'AbortError' && typeof event.reason.message === 'string' && event.reason.message.includes('play()')) {
    event.preventDefault();
  }
});

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL before rendering
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  );
});
