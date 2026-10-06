import { UserProfile } from '../types';
import { StorageService } from './storageService';

function generateUserCode() {
  return `#CULTO-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function isClerkSessionExistsError(err: any): boolean {
  const code = err?.errors?.[0]?.code || '';
  const message = `${err?.errors?.[0]?.longMessage || ''} ${err?.errors?.[0]?.message || ''} ${err?.message || ''}`.toLowerCase();
  return (
    code === 'session_exists' ||
    message.includes('session already exists') ||
    message.includes('already signed in') ||
    message.includes('sesión ya existe') ||
    message.includes('ya has iniciado sesión')
  );
}

export async function buildProfileFromClerkSession(input: {
  userId: string;
  email?: string;
  name?: string;
  handle?: string;
  avatar?: string;
}): Promise<UserProfile> {
  const stored = await StorageService.getProfile();
  const directory = await StorageService.getUsersDirectory();
  const email = input.email?.trim().toLowerCase();
  const existing = [stored, ...directory].find(profile => {
    if (!profile) return false;
    if (profile.id === input.userId || profile.clerkId === input.userId) return true;
    return Boolean(email && profile.email?.trim().toLowerCase() === email);
  });

  const resolvedEmail = input.email?.trim() || existing?.email;
  const localPart = (resolvedEmail || 'usuario').split('@')[0];
  const name = input.name?.trim() || existing?.name || localPart;
  const handle =
    input.handle ||
    existing?.handle ||
    `@${localPart.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  return {
    ...(existing || {}),
    id: input.userId,
    clerkId: input.userId,
    email: resolvedEmail,
    name,
    handle,
    // A user-chosen avatar ('' = initials) is authoritative; the Clerk image only
    // seeds profiles that never had an avatar value.
    avatar: existing && existing.avatar !== undefined ? existing.avatar : input.avatar,
    userCode: existing?.userCode || generateUserCode(),
    cultoScore: existing?.cultoScore ?? 100,
    badges: existing?.badges || [],
    // An explicitly emptied selection is kept; 'Netflix' only seeds new profiles.
    activeSubscriptions: existing?.activeSubscriptions ?? ['Netflix'],
  };
}

const inFlightLogins = new Map<string, Promise<UserProfile>>();

/**
 * Builds and persists the profile for an activated Clerk session exactly once per
 * userId, even if several callers (session gate, auth modal) trigger it concurrently.
 */
export function completeClerkLogin(input: {
  userId: string;
  email?: string;
  name?: string;
  handle?: string;
  avatar?: string;
}): Promise<UserProfile> {
  const pending = inFlightLogins.get(input.userId);
  if (pending) return pending;

  const promise = (async () => {
    const profile = await buildProfileFromClerkSession(input);
    await StorageService.updateProfile(profile);
    await StorageService.saveUserToDirectory(profile);
    return profile;
  })().finally(() => {
    inFlightLogins.delete(input.userId);
  });

  inFlightLogins.set(input.userId, promise);
  return promise;
}
