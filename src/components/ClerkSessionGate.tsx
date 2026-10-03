import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { UserProfile } from '../types';
import { completeClerkLogin } from '../services/clerkProfile';

interface ClerkSessionGateProps {
  hasProfile: boolean;
  suppressRestore: boolean;
  onRestore: (user: UserProfile) => void;
  onSignedOut?: () => void;
  onRestoreFailed?: () => void;
}

/**
 * Single source of truth for restoring a session on launch: the profile is only
 * restored from an active Clerk session (never from the local cache alone).
 * If Clerk already has a session while the app is still on the login/landing
 * screen, restore the profile and enter the main section.
 * Must be rendered inside <ClerkProvider>.
 */
export function ClerkSessionGate({
  hasProfile,
  suppressRestore,
  onRestore,
  onSignedOut,
  onRestoreFailed,
}: ClerkSessionGateProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const onRestoreRef = useRef(onRestore);
  const onSignedOutRef = useRef(onSignedOut);
  const onRestoreFailedRef = useRef(onRestoreFailed);
  const startedFor = useRef<string | null>(null);
  onRestoreRef.current = onRestore;
  onSignedOutRef.current = onSignedOut;
  onRestoreFailedRef.current = onRestoreFailed;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !userLoaded || hasProfile || suppressRestore) {
      if (isLoaded && !isSignedIn) {
        startedFor.current = null;
        onSignedOutRef.current?.();
      }
      return;
    }
    if (startedFor.current === userId) return;
    startedFor.current = userId;

    (async () => {
      // isSignedIn guarantees an active session; the API bridge obtains (cached)
      // tokens on demand, so no forced token refresh loop is needed here.
      const email = user?.primaryEmailAddress?.emailAddress;
      const name = user?.fullName || user?.firstName || undefined;
      const handle = user?.username ? `@${user.username}` : undefined;
      const profile = await completeClerkLogin({
        userId,
        email,
        name,
        handle,
        avatar: user?.imageUrl,
      });
      // Do not tie completion to effect cleanup: Clerk's `user` object reference
      // changes often, which would cancel the restore forever. Only discard the
      // result if the signed-in user changed (or signed out) meanwhile.
      if (startedFor.current === userId) onRestoreRef.current(profile);
    })().catch(err => {
      console.warn('[ClerkSessionGate] No se pudo reanudar la sesión:', err);
      startedFor.current = null;
      onRestoreFailedRef.current?.();
    });
  }, [isLoaded, isSignedIn, userId, userLoaded, hasProfile, suppressRestore, user]);

  return null;
}
