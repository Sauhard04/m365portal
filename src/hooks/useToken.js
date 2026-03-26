import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { useActiveTenant } from './useActiveTenant';

let interactionPromise = null;

/**
 * Custom hook to safely acquire tokens for the active tenant.
 * Handles authority overrides to support seamless multi-tenant switching.
 */
export const useToken = () => {
    const { instance, accounts } = useMsal();
    const activeTenantId = useActiveTenant();

    const getAccessToken = useCallback(async (request) => {
        if (accounts.length === 0) {
            throw new Error('No active account found');
        }

        const { tenantId, ...msalRequest } = request;

        // Construct authority for the specific tenant
        const targetTenantId = tenantId || activeTenantId;
        const authority = targetTenantId && targetTenantId !== 'organizations'
            ? `https://login.microsoftonline.com/${targetTenantId}`
            : "https://login.microsoftonline.com/organizations";

        // Ensure MSAL uses the correct account for the target tenant if multiple are cached
        let activeAccount = accounts[0];
        if (targetTenantId && targetTenantId !== 'organizations') {
            const matchedAccount = accounts.find(a => a.tenantId === targetTenantId);
            if (matchedAccount) {
                activeAccount = matchedAccount;
            }
        }

        const tokenRequest = {
            ...msalRequest,
            account: activeAccount,
            authority: authority
        };

        // If another component is already handling an interaction, wait for it
        if (interactionPromise) {
            console.log('[useToken] Interaction already in progress, waiting...');
            try {
                await interactionPromise;
                // Once finished, retry silent acquisition
                const retryResponse = await instance.acquireTokenSilent(tokenRequest);
                return retryResponse.accessToken;
            } catch (retryError) {
                console.warn('[useToken] Silent retry after interaction failed:', retryError.errorCode);
                // Fall through to regular logic if silent retry fails
            }
        }

        try {
            const response = await instance.acquireTokenSilent(tokenRequest);
            return response.accessToken;
        } catch (error) {
            const isTimeout = error.errorCode === 'monitor_window_timeout';
            console.error('[useToken] Token acquisition failed:', {
                errorCode: error.errorCode,
                errorMessage: error.errorMessage,
                tenantId: activeTenantId,
                isTimeout
            });

            // Interaction check
            const needsInteraction = error.errorCode === 'consent_required' ||
                error.errorCode === 'interaction_required' ||
                error.errorCode === 'login_required' ||
                error.name === 'InteractionRequiredAuthError';

            // If it's a timeout, it might be transient. 
            // If it's interaction required, we can fallback to popup ONLY if we aren't in a background loop.
            if (needsInteraction) {
                // Double check if someone else started an interaction
                if (interactionPromise) {
                    await interactionPromise;
                    const finalResponse = await instance.acquireTokenSilent(tokenRequest);
                    return finalResponse.accessToken;
                }

                // WARNING: Browser popup blockers often kill this if triggered inside a useEffect.
                // We only attempt it as a last resort, but we log clearly if it fails.
                console.warn('[useToken] Interaction required. Attempting popup fallback...');
                interactionPromise = instance.acquireTokenPopup(tokenRequest);
                try {
                    const popupResponse = await interactionPromise;
                    return popupResponse.accessToken;
                } catch (popupError) {
                    if (popupError.errorCode === 'popup_window_error') {
                        console.error('[useToken] Popup blocked! User must click an interactive element to re-authenticate.');
                    }
                    throw popupError;
                } finally {
                    interactionPromise = null;
                }
            }

            throw error;
        }
    }, [instance, accounts, activeTenantId]);

    return { getAccessToken };
};
