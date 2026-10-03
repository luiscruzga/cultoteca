import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { setAuthReady, setAuthTokenProvider } from '../services/mongoDbService';

/**
 * Registers the Clerk session token provider used by MongoDbService to
 * authenticate backend requests. Must be rendered inside <ClerkProvider>.
 */
export function ApiAuthBridge(): null {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  });

  useEffect(() => {
    // Only request a token when there is an active Clerk session.
    if (isSignedIn) {
      setAuthTokenProvider(() => getTokenRef.current());
    } else {
      setAuthTokenProvider(() => Promise.resolve(null));
    }
    // Keep auth "ready" across sign-in/sign-out transitions; resetting it here
    // made every request after login wait the full AUTH_READY timeout.
    if (isLoaded) {
      setAuthReady(true);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    return () => {
      setAuthTokenProvider(null);
      setAuthReady(false);
    };
  }, []);

  return null;
}
