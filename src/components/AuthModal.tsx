import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FavoriteItem, MediaItem, UserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { completeClerkLogin, isClerkSessionExistsError } from '../services/clerkProfile';
import { ConfirmModal } from './ConfirmModal';
import { UserAvatar } from './UserAvatar';
import { AvatarPickerModal } from './AvatarPickerModal';
import { UpdateService } from '../services/updateService';
import { remoteImageSource } from '../utils/remoteImage';

// Safely try importing Clerk hooks if configured
const AUTH_UNAVAILABLE_MESSAGE = 'El inicio de sesión no está disponible: la autenticación (Clerk) no está configurada.';

let useSignInHook: any = null;
let useSignUpHook: any = null;
let useAuthHook: any = null;
let useUserHook: any = null;

try {
  const clerk = require('@clerk/clerk-expo');
  useSignInHook = clerk.useSignIn;
  useSignUpHook = clerk.useSignUp;
  useAuthHook = clerk.useAuth;
  useUserHook = clerk.useUser;
} catch {
  // Clerk not loaded or native modules unavailable
}

interface AuthModalProps {
  visible: boolean;
  onClose?: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  isClerkConfigured: boolean;
  onViewBadges?: () => void;
  onOpenSearchUsers?: () => void;
  onProfileUpdated?: (user: UserProfile) => void;
  favorites?: FavoriteItem[];
  onSelectFavoriteItem?: (item: MediaItem) => void;
  onRemoveFavorite?: (item: MediaItem) => void;
  onOpenUpdates?: () => void;
  initialMode?: 'signin' | 'signup';
}

type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp' | 'backup_code';

interface SecondFactorChallenge {
  strategy: SecondFactorStrategy;
  /** Masked email/phone the code was sent to (code strategies only). */
  target?: string;
  /** Clerk id of the email/phone to send the code to. */
  factorId?: string;
}

const SECOND_FACTOR_PRIORITY: SecondFactorStrategy[] = ['email_code', 'phone_code', 'totp', 'backup_code'];

/** Picks the preferred second factor Clerk offers for this sign-in attempt. */
const pickSecondFactor = (supported: any[] | null | undefined): SecondFactorChallenge | null => {
  for (const strategy of SECOND_FACTOR_PRIORITY) {
    const factor = supported?.find(f => f?.strategy === strategy);
    if (factor) {
      return {
        strategy,
        target: factor.safeIdentifier,
        factorId: factor.emailAddressId || factor.phoneNumberId,
      };
    }
  }
  return null;
};

const SECOND_FACTOR_PROMPTS: Record<SecondFactorStrategy, (target?: string) => string> = {
  email_code: target =>
    `Por seguridad, confirma este dispositivo con el código que enviamos a ${target || 'tu correo'}:`,
  phone_code: target =>
    `Por seguridad, ingresa el código que enviamos por SMS a ${target || 'tu teléfono'}:`,
  totp: () => 'Ingresa el código de 6 dígitos de tu app de autenticación:',
  backup_code: () => 'Ingresa uno de tus códigos de respaldo:',
};

interface ClerkHooksContext {
  clerkSignIn: any;
  clerkSignUp: any;
  clerkAuth: any;
}

const ClerkBridge: React.FC<{
  children: (context: ClerkHooksContext) => React.ReactElement | null;
}> = ({ children }) => {
  const clerkSignIn = useSignInHook ? useSignInHook() : null;
  const clerkSignUp = useSignUpHook ? useSignUpHook() : null;
  const clerkAuth = useAuthHook ? useAuthHook() : null;

  return children({ clerkSignIn, clerkSignUp, clerkAuth });
};

interface AuthModalContentProps extends AuthModalProps {
  clerkSignIn: any;
  clerkSignUp: any;
  clerkAuth: any;
}

const AuthModalContent: React.FC<AuthModalContentProps> = ({
  visible,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  isClerkConfigured,
  onViewBadges,
  onOpenSearchUsers,
  onProfileUpdated,
  favorites,
  onSelectFavoriteItem,
  onRemoveFavorite,
  onOpenUpdates,
  initialMode = 'signin',
  clerkSignIn,
  clerkSignUp,
  clerkAuth,
}) => {
  const appVersion = UpdateService.getCurrentVersion();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [codeVerification, setCodeVerification] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [secondFactor, setSecondFactor] = useState<SecondFactorChallenge | null>(null);
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAvatarPickerVisible, setIsAvatarPickerVisible] = useState(false);

  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (visible && initialMode) {
      setMode(initialMode);
      setErrorMessage(null);
    }
  }, [visible, initialMode]);

  useEffect(() => {
    if (visible && currentUser) {
      loadFriends();
    }
  }, [visible, currentUser?.friends, currentUser?.id]);

  const loadFriends = async () => {
    if (!currentUser?.friends?.length) {
      setFriendsList([]);
      return;
    }
    setLoadingFriends(true);
    try {
      const directory = await StorageService.getUsersDirectory();
      const userFriends = directory.filter(
        u =>
          u.id !== currentUser.id &&
          (currentUser.friends?.includes(u.id) ||
            currentUser.friends?.includes(u.userCode) ||
            currentUser.friends?.includes(u.handle))
      );
      setFriendsList(userFriends);
    } catch (e) {
      console.warn('Error loading friends list:', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleToggleFriend = async (friend: UserProfile) => {
    if (!currentUser) return;
    try {
      const updated = await StorageService.toggleFriend(currentUser, friend.id);
      onProfileUpdated?.(updated);
      setFriendsList(prev => prev.filter(f => f.id !== friend.id));
    } catch (e) {
      console.warn('Error toggling friend:', e);
    }
  };


  /**
   * Wait for Clerk to finish activating the session and produce a JWT.
   * Reads the latest Clerk state through a ref: the `clerkAuth` captured by an
   * async handler is a stale render snapshot and would never see the new userId.
   */
  const resumingSession = useRef(false);
  const clerkAuthRef = useRef(clerkAuth);
  useEffect(() => {
    clerkAuthRef.current = clerkAuth;
  });

  const ensureClerkSession = async (): Promise<{ userId: string } | null> => {
    for (let i = 0; i < 20; i++) {
      const auth = clerkAuthRef.current;
      if (auth?.userId && auth?.getToken) {
        const token = await auth.getToken();
        if (token) return { userId: auth.userId };
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    return null;
  };

  const signUpProfileHints = () => ({
    email: email.trim() || undefined,
    name: name.trim() || undefined,
    handle: handle.trim()
      ? handle.trim().replace(/^@?/, '@')
      : name.trim()
        ? `@${name.trim().toLowerCase().replace(/\s+/g, '')}`
        : undefined,
  });

  /**
   * Completes login for an activated Clerk session: builds/persists the profile
   * once (shared with ClerkSessionGate), logs the login and enters the app.
   */
  const finishClerkLogin = async (
    hints: { email?: string; name?: string; handle?: string } = {},
    missingSessionMessage = 'No se pudo obtener la sesión activa de Clerk. Inténtalo de nuevo.'
  ): Promise<boolean> => {
    const session = await ensureClerkSession();
    if (!session) {
      setErrorMessage(missingSessionMessage);
      return false;
    }
    const userProfile = await completeClerkLogin({ userId: session.userId, ...hints });
    StorageService.logLogin({
      userId: userProfile.id,
      userCode: userProfile.userCode,
      email: userProfile.email,
      authProvider: 'clerk',
    }).catch(err => console.warn('Error logging login:', err));
    onLoginSuccess(userProfile);
    onClose?.();
    return true;
  };

  const enterWithActiveSession = async (fallback?: { email?: string; name?: string }) => {
    await finishClerkLogin(
      {
        email: fallback?.email || email.trim() || undefined,
        name: fallback?.name || name.trim() || undefined,
      },
      'Ya hay una sesión activa, pero no pudimos recuperarla. Recarga la página.'
    );
  };

  useEffect(() => {
    if (!visible || currentUser || !isClerkConfigured) return;
    if (!clerkAuth?.isSignedIn || !clerkAuth?.userId || resumingSession.current) return;
    resumingSession.current = true;
    enterWithActiveSession()
      .catch(err => console.warn('No se pudo reanudar la sesión de Clerk:', err))
      .finally(() => {
        resumingSession.current = false;
      });
  }, [visible, currentUser, isClerkConfigured, clerkAuth?.isSignedIn, clerkAuth?.userId]);

  const handleClerkSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isClerkConfigured && clerkSignIn?.isLoaded) {
        const result = await clerkSignIn.signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === 'complete') {
          await clerkSignIn.setActive({ session: result.createdSessionId });
          await finishClerkLogin({ email: email.trim() });
        } else if (result.status === 'needs_second_factor' || result.status === 'needs_client_trust') {
          // Clerk asks for a second factor on MFA accounts and on unrecognized devices (Client Trust)
          const challenge = pickSecondFactor(result.supportedSecondFactors);
          if (!challenge) {
            setErrorMessage('Tu cuenta requiere un método de verificación adicional que la app no admite.');
            return;
          }
          await sendSecondFactorCode(challenge);
          setSecondFactorCode('');
          setSecondFactor(challenge);
        } else if (result.status === 'needs_new_password') {
          setErrorMessage('Debes restablecer tu contraseña antes de iniciar sesión.');
        } else {
          setErrorMessage(`No se pudo completar el inicio de sesión (estado: ${result.status}). Inténtalo de nuevo.`);
        }
      } else {
        setErrorMessage(AUTH_UNAVAILABLE_MESSAGE);
      }
    } catch (err: any) {
      if (isClerkSessionExistsError(err)) {
        await enterWithActiveSession({ email: email.trim(), name: name.trim() });
        return;
      }
      const msg = err.errors?.[0]?.message || err.message || 'Error al iniciar sesión con Clerk';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClerkSignUp = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (isClerkConfigured && clerkSignUp?.isLoaded) {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || name.trim();
        const lastName = nameParts.slice(1).join(' ') || undefined;
        const cleanHandle = (handle.trim() || `@${firstName.toLowerCase()}`)
          .replace(/^@/, '')
          .replace(/[^a-zA-Z0-9_]/g, '');

        const signUpParams: any = {
          emailAddress: email.trim(),
          password,
        };
        if (firstName) signUpParams.firstName = firstName;
        if (lastName) signUpParams.lastName = lastName;
        if (cleanHandle) signUpParams.username = cleanHandle;

        try {
          await clerkSignUp.signUp.create(signUpParams);
        } catch (createErr: any) {
          const errCode = createErr.errors?.[0]?.code || '';
          const errMsg = createErr.errors?.[0]?.message || createErr.message || '';

          if (isClerkSessionExistsError(createErr)) {
            await enterWithActiveSession({ email: email.trim(), name: name.trim() });
            return;
          }

          // If email is already taken / exists in Clerk, suggest signing in
          if (
            errCode === 'form_identifier_exists' ||
            errMsg.toLowerCase().includes('taken') ||
            errMsg.toLowerCase().includes('already exists')
          ) {
            setErrorMessage('Este correo ya está registrado en Clerk. Ingresa tu contraseña en Iniciar Sesión.');
            setMode('signin');
            return;
          }

          // If username is not an enabled attribute in Clerk dashboard, retry without username
          if (errMsg.toLowerCase().includes('username') || errCode.includes('username')) {
            delete signUpParams.username;
            await clerkSignUp.signUp.create(signUpParams);
          } else {
            throw createErr;
          }
        }

        await clerkSignUp.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      } else {
        setErrorMessage(AUTH_UNAVAILABLE_MESSAGE);
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || err.message || 'Error al registrar usuario';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  /** Code strategies need Clerk to send the code first; TOTP and backup codes don't. */
  const sendSecondFactorCode = async (challenge: SecondFactorChallenge) => {
    if (challenge.strategy === 'email_code') {
      await clerkSignIn.signIn.prepareSecondFactor({
        strategy: 'email_code',
        emailAddressId: challenge.factorId,
      });
    } else if (challenge.strategy === 'phone_code') {
      await clerkSignIn.signIn.prepareSecondFactor({
        strategy: 'phone_code',
        phoneNumberId: challenge.factorId,
      });
    }
  };

  const handleResendSecondFactor = async () => {
    if (!secondFactor) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await sendSecondFactorCode(secondFactor);
    } catch (err: any) {
      setErrorMessage(err.errors?.[0]?.message || err.message || 'No se pudo reenviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySecondFactor = async () => {
    if (!secondFactor) return;
    if (!secondFactorCode.trim()) {
      setErrorMessage('Ingresa el código de verificación.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await clerkSignIn.signIn.attemptSecondFactor({
        strategy: secondFactor.strategy,
        code: secondFactorCode.trim(),
      });
      if (result.status === 'complete') {
        await clerkSignIn.setActive({ session: result.createdSessionId });
        if (await finishClerkLogin({ email: email.trim() })) {
          setSecondFactor(null);
          setSecondFactorCode('');
        }
      } else {
        setErrorMessage('Código de verificación incorrecto.');
      }
    } catch (err: any) {
      if (isClerkSessionExistsError(err)) {
        await enterWithActiveSession({ email: email.trim() });
        return;
      }
      setErrorMessage(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Código de verificación incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!codeVerification.trim()) {
      setErrorMessage('Ingresa el código enviado a tu correo.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (clerkSignUp?.isLoaded) {
        let currentSignUp = clerkSignUp.signUp;
        const isAlreadyVerified =
          currentSignUp.verifications?.emailAddress?.status === 'verified';

        if (!isAlreadyVerified) {
          try {
            currentSignUp = await clerkSignUp.signUp.attemptEmailAddressVerification({
              code: codeVerification.trim(),
            });
          } catch (verifyErr: any) {
            const verifyMsg = verifyErr.errors?.[0]?.message || verifyErr.message || '';
            const verifyCode = verifyErr.errors?.[0]?.code || '';
            if (
              verifyCode === 'verification_already_verified' ||
              verifyMsg.toLowerCase().includes('already verified')
            ) {
              // Code was already verified on the server, proceed with current state
              currentSignUp = clerkSignUp.signUp;
            } else {
              throw verifyErr;
            }
          }
        }

        // Check if missing requirements (e.g., name or username)
        if (
          currentSignUp.status === 'missing_requirements' &&
          currentSignUp.missingFields &&
          currentSignUp.missingFields.length > 0
        ) {
          const nameParts = name.trim().split(/\s+/);
          const firstName = nameParts[0] || name.trim() || 'Usuario';
          const lastName = nameParts.slice(1).join(' ') || undefined;
          const cleanHandle = (handle.trim() || `@${firstName.toLowerCase()}`)
            .replace(/^@/, '')
            .replace(/[^a-zA-Z0-9_]/g, '');

          const updatePayload: any = {};
          if (currentSignUp.missingFields.includes('first_name')) updatePayload.firstName = firstName;
          if (currentSignUp.missingFields.includes('last_name') && lastName) updatePayload.lastName = lastName;
          if (currentSignUp.missingFields.includes('username')) updatePayload.username = cleanHandle;
          if (currentSignUp.missingFields.includes('password') && password) updatePayload.password = password;

          if (Object.keys(updatePayload).length > 0) {
            try {
              currentSignUp = await clerkSignUp.signUp.update(updatePayload);
            } catch (updateErr) {
              console.warn('Could not update missing Clerk fields:', updateErr);
            }
          }
        }

        // If sign-up is complete, activate session directly
        if (currentSignUp.status === 'complete' && currentSignUp.createdSessionId) {
          await clerkSignUp.setActive({ session: currentSignUp.createdSessionId });
          if (await finishClerkLogin(signUpProfileHints())) {
            setPendingVerification(false);
          }
          return;
        }

        // If email is verified but sign-up session wasn't activated directly, log in using signIn
        if (
          currentSignUp.verifications?.emailAddress?.status === 'verified' &&
          clerkSignIn?.isLoaded &&
          email &&
          password
        ) {
          try {
            const signInRes = await clerkSignIn.signIn.create({
              identifier: email.trim(),
              password,
            });
            if (signInRes.status === 'complete') {
              await clerkSignIn.setActive({ session: signInRes.createdSessionId });
              if (await finishClerkLogin(signUpProfileHints())) {
                setPendingVerification(false);
              }
              return;
            }
          } catch (autoSignInErr) {
            console.warn('Auto sign-in after verification failed:', autoSignInErr);
          }
        }

        if (currentSignUp.status === 'missing_requirements') {
          const missing = currentSignUp.missingFields?.join(', ') || 'campos adicionales';
          setErrorMessage(`Faltan requisitos para completar tu cuenta: ${missing}.`);
          return;
        }

        setErrorMessage('Código de verificación incorrecto.');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || err.message || 'Error al verificar código';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async (newAvatar?: string) => {
    if (!currentUser) return;
    // '' marks an explicit "initials" choice so the Clerk image never overrides it.
    const updated: UserProfile = { ...currentUser, avatar: newAvatar ?? '' };
    // Update UI first; backend persistence must not delay the visible change.
    onLoginSuccess(updated);
    try {
      await StorageService.updateProfile(updated);
      await StorageService.saveUserToDirectory(updated);
    } catch (err) {
      console.warn('Error persisting avatar:', err);
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    if (clerkAuth?.signOut) {
      try {
        await clerkAuth.signOut();
      } catch (e) {
        console.warn('Error signing out from Clerk:', e);
      }
    }
    setMode('signin');
    onLogout();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.logoBadge}>
                <Ionicons name="film-outline" size={18} color="#E50914" />
              </View>
              <Text style={styles.title}>
                {currentUser ? 'Mi Perfil & Cuenta' : 'Acceso Cultoteca'}
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Clerk Banner */}
            {!isClerkConfigured && (
              <View style={styles.devBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#FF9F0A" />
                <Text style={styles.devBannerText}>
                  El inicio de sesión no está disponible: falta configurar{' '}
                  <Text style={{ fontWeight: 'bold' }}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY</Text> en{' '}
                  <Text style={{ fontWeight: 'bold' }}>.env</Text>.
                </Text>
              </View>
            )}

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF453A" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {currentUser ? (
              // Current Logged-in User View
              <View style={styles.loggedUserSection}>
                <View style={styles.userCard}>
                  <TouchableOpacity
                    style={styles.avatarLargeContainer}
                    onPress={() => setIsAvatarPickerVisible(true)}
                    activeOpacity={0.8}
                    accessibilityLabel="Cambiar foto de perfil"
                  >
                    <UserAvatar
                      name={currentUser.name}
                      avatar={currentUser.avatar}
                      size={62}
                      borderColor="#E50914"
                      borderWidth={2}
                    />
                    <View style={styles.avatarEditBadge}>
                      <Ionicons name="camera" size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, marginLeft: 14 }}
                    onPress={() => {
                      onClose?.();
                      onViewBadges?.();
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.userNameLarge}>{currentUser.name}</Text>
                    <Text style={styles.userHandleLarge}>{currentUser.handle}</Text>
                    <View style={styles.userCodeBadge}>
                      <Ionicons name="sparkles" size={13} color="#F59E0B" />
                      <Text style={styles.userCodeText}>Ver Rango & Medallas</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onClose?.();
                      onViewBadges?.();
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Change Avatar Button */}
                <TouchableOpacity
                  style={styles.changeAvatarBtn}
                  onPress={() => setIsAvatarPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={16} color="#38BDF8" />
                  <Text style={styles.changeAvatarBtnText}>
                    Elegir Avatar Cultural (Anime, Cine, Memes)
                  </Text>
                </TouchableOpacity>

                {currentUser.bio && (
                  <Text style={styles.userBioText}>{currentUser.bio}</Text>
                )}

                {/* Favorites Section */}
                <View style={styles.favoritesSection}>
                  <View style={styles.favoritesHeaderRow}>
                    <View style={styles.favoritesHeaderTitleRow}>
                      <Ionicons name="heart" size={17} color="#EF4444" />
                      <Text style={styles.favoritesTitle}>Mis Favoritos Guardados</Text>
                    </View>
                    <View style={styles.favoritesCountBadge}>
                      <Text style={styles.favoritesCountText}>{favorites?.length || 0}</Text>
                    </View>
                  </View>

                  {(!favorites || favorites.length === 0) ? (
                    <View style={styles.emptyFavoritesBox}>
                      <Ionicons name="heart-outline" size={26} color="#475569" />
                      <Text style={styles.emptyFavoritesText}>
                        Aún no tienes obras en favoritos. Toca el corazón en cualquier obra de tus listas para guardarla aquí.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.favoritesScrollContent}
                    >
                      {favorites.map(fav => (
                        <TouchableOpacity
                          key={fav.id}
                          style={styles.favoriteCard}
                          onPress={() => {
                            onClose?.();
                            onSelectFavoriteItem?.(fav.item);
                          }}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={remoteImageSource(fav.item.posterUrl)}
                            style={styles.favoritePoster}
                            resizeMode="cover"
                          />
                          <View style={styles.favoriteCardInfo}>
                            <Text style={styles.favoriteCardTitle} numberOfLines={1}>
                              {fav.item.title}
                            </Text>
                            <View style={styles.favoriteOriginRow}>
                              <Ionicons name="albums-outline" size={11} color="#38BDF8" />
                              <Text style={styles.favoriteOriginText} numberOfLines={1}>
                                {fav.listTitle}
                              </Text>
                            </View>
                          </View>
                          {onRemoveFavorite && (
                            <TouchableOpacity
                              style={styles.removeFavMiniBtn}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                onRemoveFavorite(fav.item);
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Friends Section */}
                <View style={styles.friendsSection}>
                  <View style={styles.friendsHeaderRow}>
                    <View style={styles.friendsHeaderTitleRow}>
                      <Ionicons name="people" size={17} color="#38BDF8" />
                      <Text style={styles.friendsTitle}>Mis Amigos</Text>
                      <View style={styles.friendsCountBadge}>
                        <Text style={styles.friendsCountText}>{friendsList.length}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.findFriendsHeaderBtn}
                      onPress={() => {
                        onClose?.();
                        onOpenSearchUsers?.();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                      <Text style={styles.findFriendsHeaderBtnText}>Buscar</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingFriends ? (
                    <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 14 }} />
                  ) : friendsList.length === 0 ? (
                    <View style={styles.emptyFriendsBox}>
                      <Ionicons name="people-outline" size={26} color="#64748B" />
                      <Text style={styles.emptyFriendsText}>
                        Aún no tienes amigos agregados. Busca usuarios por su código o handle para compartir recomendaciones directas.
                      </Text>
                      <TouchableOpacity
                        style={styles.addFriendsPromptBtn}
                        onPress={() => {
                          onClose?.();
                          onOpenSearchUsers?.();
                        }}
                      >
                        <Ionicons name="search" size={14} color="#0284C7" />
                        <Text style={styles.addFriendsPromptBtnText}>Buscar en la Comunidad</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.friendsListContainer}>
                      {friendsList.map(friend => (
                        <View key={friend.id} style={styles.friendCard}>
                          <UserAvatar name={friend.name} avatar={friend.avatar} size={42} />
                          <View style={styles.friendInfo}>
                            <View style={styles.friendNameRow}>
                              <Text style={styles.friendNameText} numberOfLines={1}>{friend.name}</Text>
                              {friend.userCode && (
                                <View style={styles.friendCodeBadge}>
                                  <Text style={styles.friendCodeBadgeText}>{friend.userCode}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.friendHandleText} numberOfLines={1}>{friend.handle}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.friendConnectedBtn}
                            onPress={() => handleToggleFriend(friend)}
                            accessibilityLabel={`Dejar de ser amigo de ${friend.name}`}
                          >
                            <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                            <Text style={styles.friendConnectedBtnText}>Amigo</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={styles.webApkDownloadBtn}
                      onPress={() => UpdateService.openApkDownload()}
                      activeOpacity={0.8}
                      accessibilityLabel="Descargar APK para Android"
                    >
                      <Ionicons name="logo-android" size={19} color="#10B981" />
                      <Text style={styles.webApkDownloadBtnText}>Descargar App Android (APK)</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.updatesBtn}
                    onPress={() => {
                      onClose?.();
                      onOpenUpdates?.();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sync-circle-outline" size={18} color="#38BDF8" />
                    <Text style={styles.updatesBtnText}>Versión & Actualizaciones</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogoutPress}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#FF453A" />
                    <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : secondFactor ? (
              // Sign-in second factor (MFA or new-device verification)
              <View>
                <Text style={styles.sectionSubtitle}>
                  {SECOND_FACTOR_PROMPTS[secondFactor.strategy](secondFactor.target)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Código de verificación"
                  placeholderTextColor="#8E8E93"
                  keyboardType={secondFactor.strategy === 'backup_code' ? 'default' : 'number-pad'}
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  value={secondFactorCode}
                  onChangeText={setSecondFactorCode}
                  onSubmitEditing={handleVerifySecondFactor}
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleVerifySecondFactor}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Confirmar y Entrar</Text>
                  )}
                </TouchableOpacity>

                {(secondFactor.strategy === 'email_code' || secondFactor.strategy === 'phone_code') && (
                  <TouchableOpacity
                    style={[styles.backBtn, { marginTop: 14 }]}
                    onPress={handleResendSecondFactor}
                    disabled={loading}
                  >
                    <Text style={styles.backBtnText}>Reenviar código</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.backBtn, { marginTop: 14 }]}
                  onPress={() => {
                    setSecondFactor(null);
                    setSecondFactorCode('');
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.backBtnText}>Volver al inicio de sesión</Text>
                </TouchableOpacity>
              </View>
            ) : pendingVerification ? (
              // Code Verification
              <View>
                <Text style={styles.sectionSubtitle}>
                  Ingresa el código de 6 dígitos que Clerk envió a {email}:
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Código de verificación"
                  placeholderTextColor="#8E8E93"
                  keyboardType="number-pad"
                  value={codeVerification}
                  onChangeText={setCodeVerification}
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Confirmar y Entrar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.backBtn, { marginTop: 14 }]}
                  onPress={() => {
                    setPendingVerification(false);
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.backBtnText}>Volver al inicio de sesión</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Sign In or Sign Up Form
              <View>
                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
                    onPress={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                  >
                    <Text
                      style={[styles.tabBtnText, mode === 'signin' && styles.tabBtnTextActive]}
                    >
                      Iniciar Sesión
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
                    onPress={() => {
                      setMode('signup');
                      setErrorMessage(null);
                    }}
                  >
                    <Text
                      style={[styles.tabBtnText, mode === 'signup' && styles.tabBtnTextActive]}
                    >
                      Crear Cuenta
                    </Text>
                  </TouchableOpacity>
                </View>

                {mode === 'signup' && (
                  <>
                    <Text style={styles.inputLabel}>Nombre completo</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Sofía Morales"
                      placeholderTextColor="#636366"
                      value={name}
                      onChangeText={setName}
                    />
                    <Text style={styles.inputLabel}>Usuario / Handle</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. @sofia_cine"
                      placeholderTextColor="#636366"
                      autoCapitalize="none"
                      value={handle}
                      onChangeText={setHandle}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#636366"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />

                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#636366"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={mode === 'signin' ? handleClerkSignIn : handleClerkSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signin' ? 'Iniciar Sesión' : 'Registrar Perfil'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* App Version & Updates Footer */}
            <TouchableOpacity
              style={styles.versionFooterBtn}
              onPress={() => {
                onClose?.();
                onOpenUpdates?.();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="cube-outline" size={14} color="#64748B" />
              <Text style={styles.versionFooterText}>
                Cultoteca v{appVersion} · Ver actualizaciones
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Custom Logout Confirmation Dialog */}
      <ConfirmModal
        visible={showLogoutConfirm}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas salir de tu cuenta de Cultoteca?"
        icon="log-out-outline"
        destructive
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Cultural Avatar Picker Modal */}
      <AvatarPickerModal
        visible={isAvatarPickerVisible}
        onClose={() => setIsAvatarPickerVisible(false)}
        currentAvatar={currentUser?.avatar}
        userName={currentUser?.name || 'Usuario'}
        onSelectAvatar={handleUpdateAvatar}
      />
    </Modal>
  );
};

export const AuthModal: React.FC<AuthModalProps> = (props) => {
  if (!props.isClerkConfigured || !useSignInHook) {
    return <AuthModalContent {...props} clerkSignIn={null} clerkSignUp={null} clerkAuth={null} />;
  }

  return (
    <ClerkBridge>
      {(clerkContext) => <AuthModalContent {...props} {...clerkContext} />}
    </ClerkBridge>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2C1B1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    marginBottom: 16,
  },
  devBannerText: {
    fontSize: 12,
    color: '#FFD60A',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  loggedUserSection: {
    paddingVertical: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 16,
  },
  avatarLargeContainer: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  changeAvatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  changeAvatarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userHandleLarge: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  userCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  userCodeText: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  userBioText: {
    fontSize: 14,
    color: '#C7C7CC',
    lineHeight: 20,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3C',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  switchAccountBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  logoutBtnText: {
    color: '#FF453A',
    fontSize: 15,
    fontWeight: '600',
  },
  webApkDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  webApkDownloadBtnText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  updatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  updatesBtnText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '600',
  },
  versionFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginTop: 10,
  },
  versionFooterText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#3A3A3C',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  inputLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchDemoShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
    paddingVertical: 8,
  },
  switchDemoShortcutText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 14,
  },
  demoUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  demoUserItemActive: {
    borderColor: '#30D158',
    borderWidth: 1.5,
  },
  demoAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAvatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  demoUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  demoUserHandle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  backBtnText: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '500',
  },
  favoritesSection: {
    marginTop: 18,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  favoritesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  favoritesHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoritesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  favoritesCountBadge: {
    backgroundColor: '#EF444422',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF444455',
  },
  favoritesCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyFavoritesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyFavoritesText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  favoritesScrollContent: {
    paddingVertical: 4,
    gap: 12,
  },
  favoriteCard: {
    width: 110,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  favoritePoster: {
    width: '100%',
    height: 140,
    backgroundColor: '#1E293B',
  },
  favoriteCardInfo: {
    padding: 8,
  },
  favoriteCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  favoriteOriginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteOriginText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  removeFavMiniBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0F172AEE',
    borderRadius: 10,
  },
  friendsSection: {
    marginTop: 18,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  friendsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  friendsHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  friendsCountBadge: {
    backgroundColor: '#0284C725',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  friendsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  findFriendsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#0369A120',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284C740',
  },
  findFriendsHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  emptyFriendsBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyFriendsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 14,
  },
  addFriendsPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFriendsPromptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendsListContainer: {
    gap: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 10,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  friendNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  friendCodeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  friendCodeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  friendHandleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  friendConnectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98150',
  },
  friendConnectedBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
});

