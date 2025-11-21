'use client';

import { useAuthDialog } from '@/contexts/AuthDialogContext';

/**
 * Hook to check if user is authenticated and show login dialog if not
 * @returns Function to check authentication before making API calls
 */
export function useRequireAuth() {
  const { openLoginDialog } = useAuthDialog();

  const requireAuth = async (apiCall: () => Promise<Response>): Promise<Response | null> => {
    try {
      const response = await apiCall();
      
      // Check if response is unauthorized (401)
      if (response.status === 401) {
        const json = await response.json().catch(() => ({}));
        // If it's an unauthorized error, show login dialog
        if (json.error === 'unauthorized' || response.status === 401) {
          openLoginDialog();
          return null;
        }
      }
      
      return response;
    } catch (error) {
      // If fetch fails, it might be a network error, so we don't show login dialog
      throw error;
    }
  };

  return { requireAuth };
}

