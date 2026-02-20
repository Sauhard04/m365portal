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

        // Construct authority for the specific tenant
        const authority = activeTenantId && activeTenantId !== 'organizations'
            ? `https://login.microsoftonline.com/${activeTenantId}`
            : "https://login.microsoftonline.com/organizations";

        const tokenRequest = {
            ...request,
            account: accounts[0],
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
            console.error('[useToken] Token acquisition failed:', {
                errorCode: error.errorCode,
                errorMessage: error.errorMessage,
                tenantId: activeTenantId
            });

            // If it's a consent or interaction error, try interactive fallback
            if (error.errorCode === 'consent_required' || error.errorCode === 'interaction_required' || error.errorCode === 'login_required' || error.name === 'InteractionRequiredAuthError') {

                // Double check if someone else started an interaction while we were failing silent fetch
                if (interactionPromise) {
                    await interactionPromise;
                    const finalResponse = await instance.acquireTokenSilent(tokenRequest);
                    return finalResponse.accessToken;
                }

                console.warn('[useToken] Interaction required for tenant consent, launching popup...');
                interactionPromise = instance.acquireTokenPopup(tokenRequest);
                try {
                    const popupResponse = await interactionPromise;
                    return popupResponse.accessToken;
                } catch (popupError) {
                    console.error('[useToken] Interactive acquisition failed:', popupError);
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
