import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// react-native's SafeAreaView is iOS-only; Android draws edge-to-edge and needs real insets
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AddMediaModal } from './src/components/AddMediaModal';
import { AppFooter } from './src/components/AppFooter';
import { AppUpdatesModal } from './src/components/AppUpdatesModal';
import { AuthModal } from './src/components/AuthModal';
import { BadgesModal } from './src/components/BadgesModal';
import { ConfirmModal } from './src/components/ConfirmModal';
import { CollaborativeListCard } from './src/components/CollaborativeListCard';
import { CultoRouletteModal } from './src/components/CultoRouletteModal';
import { InviteUsersModal } from './src/components/InviteUsersModal';
import { MediaCard } from './src/components/MediaCard';
import { MediaDetailModal } from './src/components/MediaDetailModal';
import { NotificationsModal } from './src/components/NotificationsModal';
import { PublicListsModal } from './src/components/PublicListsModal';
import { UserAvatar } from './src/components/UserAvatar';
import { UserSearchModal } from './src/components/UserSearchModal';
import { WelcomeLandingScreen } from './src/components/WelcomeLandingScreen';
import { GamificationService } from './src/services/gamificationService';
import { StorageService } from './src/services/storageService';
import { UpdateService } from './src/services/updateService';
import { MediaListSkeleton, ListChipsSkeleton } from './src/components/Skeleton';
import { ListFormModal, ListFormValues } from './src/components/ListFormModal';
import { isItemInList, isSameWork, isWatchedIn, toWatchedEntry, toWork } from './src/utils/mediaIdentity';
import { LIST_CONTENT_TYPES, describeAllowedCategories, getAllowedCategories, isCategoryAllowed, toListContentType } from './src/utils/listCategories';
import { ItemSortMode, sortItems } from './src/utils/ratings';
import { remoteImageSource } from './src/utils/remoteImage';
import { isSamePlatform } from './src/utils/platformLogos';
import { HomeFeed } from './src/components/HomeFeed';
import { buildHomeFeed } from './src/services/homeFeedService';
import {
  presentNewLocalNotifications,
  registerForPushNotifications,
  startNotificationPolling,
  subscribeToNotificationTaps,
  unregisterPushToken,
} from './src/services/notificationService';

const formatTimeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days < 30 ? `hace ${days} d` : new Date(iso).toLocaleDateString();
};
import {
  ActivityEvent,
  CollaborativeList,
  DirectRecommendation,
  ListActivityNotification,
  MediaCategory,
  FavoriteItem,
  MediaItem,
  UpdateInfo,
  UserProfile,
  WatchedEntry,
} from './src/types';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from './src/services/clerkTokenCache';
import { ApiAuthBridge } from './src/components/ApiAuthBridge';
import { ClerkSessionGate } from './src/components/ClerkSessionGate';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

function MainApp({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  // Global Data States
  const [lists, setLists] = useState<CollaborativeList[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [suppressSessionRestore, setSuppressSessionRestore] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'lists' | 'radar' | 'activity'>('home');
  const [selectedList, setSelectedList] = useState<CollaborativeList | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Modal States
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isRouletteVisible, setIsRouletteVisible] = useState(false);
  const [isBadgesVisible, setIsBadgesVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'signin' | 'signup'>('signin');
  const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
  const [isPublicListsVisible, setIsPublicListsVisible] = useState(false);

  // Social & Followed state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [followedListIds, setFollowedListIds] = useState<string[]>([]);

  // New list & Join list modals
  // Create/edit list form: `list` set means editing; `key` remounts the form with fresh values.
  const [listForm, setListForm] = useState<{ key: number; list: CollaborativeList | null } | null>(null);
  const [isSavingList, setIsSavingList] = useState(false);
  const [isListsLoading, setIsListsLoading] = useState(false);
  // With Clerk, the main section waits until the session has been resolved.
  const [sessionChecked, setSessionChecked] = useState(!clerkEnabled);
  // The in-list search is scoped to the list it was typed in, so switching lists clears it.
  const [itemSearch, setItemSearch] = useState({ listId: '', query: '' });
  const [itemSortMode, setItemSortMode] = useState<ItemSortMode>('recent');
  const [isJoinListVisible, setIsJoinListVisible] = useState(false);
  const [isDeleteListConfirmVisible, setIsDeleteListConfirmVisible] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [isUserSearchVisible, setIsUserSearchVisible] = useState(false);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isInviteUsersVisible, setIsInviteUsersVisible] = useState(false);
  const [isUpdatesVisible, setIsUpdatesVisible] = useState(false);
  const [pendingUpdateInfo, setPendingUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isRefreshingLists, setIsRefreshingLists] = useState(false);
  const [listNotifications, setListNotifications] = useState<ListActivityNotification[]>([]);
  const [directRecommendations, setDirectRecommendations] = useState<DirectRecommendation[]>([]);
  // Personal watched works of the current user (shared across all lists, private to them).
  const [watchedState, setWatchedState] = useState<{ userId: string; entries: WatchedEntry[] }>({
    userId: '',
    entries: [],
  });
  // Favorite list items of the current user (private to them).
  const [favoritesState, setFavoritesState] = useState<{ userId: string; entries: FavoriteItem[] }>({
    userId: '',
    entries: [],
  });
  // When push is registered the backend notifies the device; otherwise new activity is shown locally.
  const pushRegisteredRef = useRef(false);

  // Home only shows lists the user owns, collaborates on or follows; foreign public lists live in "Explorar".
  const homeLists = useMemo(
    () => lists.filter(l => StorageService.isListInUserHome(l, profile?.id, followedListIds)),
    [lists, profile?.id, followedListIds]
  );
  const pendingInvitesCount = useMemo(
    () => StorageService.getPendingInvitations(lists, profile?.id).length,
    [lists, profile?.id]
  );
  const bellCount = unreadNotificationsCount + pendingInvitesCount;

  const pickInitialList = (allLists: CollaborativeList[], userId?: string, followed: string[] = []) =>
    allLists.find(l => StorageService.isListInUserHome(l, userId, followed)) ?? null;

  const replaceList = (updated: CollaborativeList) => {
    setLists(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    setSelectedList(prev => (prev && prev.id === updated.id ? updated : prev));
  };

  const refreshLists = async () => {
    setIsRefreshingLists(true);
    try {
      const [freshLists, freshFollowed] = await Promise.all([
        StorageService.getLists(),
        StorageService.getFollowedLists(profile?.id),
      ]);
      setLists(freshLists);
      setFollowedListIds(freshFollowed);
      setSelectedList(prev => {
        if (prev) {
          const fresh = freshLists.find(l => l.id === prev.id);
          if (fresh) return fresh;
        }
        return pickInitialList(freshLists, profile?.id, freshFollowed);
      });
      await refreshNotificationsCount();
    } catch (e) {
      console.warn('Error refreshing lists:', e);
    } finally {
      setIsRefreshingLists(false);
    }
  };

  const handleInvitationResponded = (updated: CollaborativeList, accepted: boolean) => {
    setLists(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    if (accepted) {
      setSelectedList(updated);
      setActiveTab('lists');
      setIsNotificationsModalVisible(false);
      Alert.alert('¡Invitación aceptada!', `Ahora eres colaborador en «${updated.title}».`);
    }
  };

  /** Reloads list activity and friends' recommendations (social wall, home and bell counter). */
  const refreshNotificationsCount = async (userId?: string) => {
    const currentId = userId || profile?.id;
    if (!currentId) {
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const [recs, listNotifs] = await Promise.all([
        StorageService.getDirectRecommendations(currentId),
        StorageService.getListNotifications(currentId),
      ]);
      const ownNotifs = listNotifs.filter(n => n.actor.id !== currentId);
      setDirectRecommendations(recs);
      setListNotifications(ownNotifs);
      setUnreadNotificationsCount(
        recs.filter(r => r.toUserId === currentId && !r.read).length + ownNotifs.filter(n => !n.read).length
      );
      if (!pushRegisteredRef.current) presentNewLocalNotifications(ownNotifs);
    } catch (e) {
      console.warn('Error refreshing notifications count:', e);
    }
  };

  /** Opens a list (and optionally one of its items) from the home feed, wall or a notification. */
  const openListItem = async (listId: string, mediaId?: string | null, fallbackItem?: MediaItem) => {
    let target = lists.find(l => l.id === listId);
    if (!target) {
      const fresh = await StorageService.getLists();
      setLists(fresh);
      target = fresh.find(l => l.id === listId);
    }
    if (!target || !StorageService.canUserViewList(target, profile?.id)) {
      Alert.alert('Lista no disponible', 'Esta lista ya no existe o es privada.');
      return;
    }
    setSelectedList(target);
    setCategoryFilter('all');
    setActiveTab('lists');
    // A removed item can still be shown from a saved copy (e.g. a favorite).
    const item = (mediaId ? target.items.find(i => i.id === mediaId) : undefined) ?? fallbackItem;
    if (item) {
      setSelectedMedia(item);
      setIsDetailVisible(true);
    } else if (mediaId) {
      Alert.alert('Elemento no disponible', 'Este elemento ya no está en la lista.');
    }
  };

  const handleOpenWallNotification = async (notif: ListActivityNotification) => {
    if (!notif.read) {
      setListNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, read: true } : n)));
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      StorageService.markListNotificationAsRead(notif.id).catch(() => undefined);
    }
    await openListItem(notif.listId, notif.action === 'item_removed' ? null : notif.mediaId || notif.mediaItem?.id);
  };

  // Entries loaded for another (or no) user are ignored until the current user's ones arrive.
  const profileId = profile?.id;
  const watchedEntries = useMemo(
    () => (profileId && watchedState.userId === profileId ? watchedState.entries : []),
    [profileId, watchedState]
  );
  const setWatchedEntries = (entries: WatchedEntry[]) => {
    if (profile?.id) setWatchedState({ userId: profile.id, entries });
  };
  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;
    let cancelled = false;
    StorageService.getWatched(userId).then(entries => {
      if (!cancelled) setWatchedState({ userId, entries });
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const isWatchedByMe = useCallback((item: MediaItem) => isWatchedIn(item, watchedEntries), [watchedEntries]);

  const handleToggleWatched = async (item: MediaItem) => {
    if (!profile) return;
    const previous = watchedEntries;
    const watched = !isWatchedIn(item, previous);
    // Optimistic update; reverted if persisting fails.
    const optimistic = watched
      ? [toWatchedEntry(item), ...previous]
      : previous.filter(entry => !isSameWork(toWork(item), entry));
    setWatchedEntries(optimistic);
    try {
      setWatchedEntries(await StorageService.setWatched(profile.id, item, watched, previous));
    } catch (err) {
      setWatchedEntries(previous);
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    }
  };

  const favorites = useMemo(
    () => (profileId && favoritesState.userId === profileId ? favoritesState.entries : []),
    [profileId, favoritesState]
  );
  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;
    let cancelled = false;
    StorageService.getFavorites(userId).then(entries => {
      if (!cancelled) setFavoritesState({ userId, entries });
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  // List an item belongs to: the open list first, otherwise any list in the user's home.
  const findSourceList = (item: MediaItem): CollaborativeList | undefined =>
    selectedList?.items.some(i => i.id === item.id)
      ? selectedList
      : homeLists.find(l => l.items.some(i => i.id === item.id));

  const isFavoriteIn = (listId: string, mediaId: string) =>
    favorites.some(f => f.listId === listId && f.mediaId === mediaId);

  const setFavorite = async (list: Pick<CollaborativeList, 'id' | 'title'>, item: MediaItem, favorite: boolean) => {
    if (!profile) return;
    const userId = profile.id;
    const previous = favorites;
    // Optimistic update; reverted if persisting fails.
    const others = previous.filter(f => !(f.listId === list.id && f.mediaId === item.id));
    const optimistic: FavoriteItem[] = favorite
      ? [{ id: `fav-pending-${item.id}`, mediaId: item.id, listId: list.id, listTitle: list.title, item, addedAt: new Date().toISOString(), userId }, ...others]
      : others;
    setFavoritesState({ userId, entries: optimistic });
    try {
      setFavoritesState({ userId, entries: await StorageService.setFavorite(userId, list, item, favorite, previous) });
    } catch (err) {
      setFavoritesState({ userId, entries: previous });
      Alert.alert('No se pudo guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    }
  };

  const handleToggleFavorite = (item: MediaItem) => {
    const list = findSourceList(item);
    if (list) setFavorite(list, item, !isFavoriteIn(list.id, item.id));
  };

  const handleRemoveFavorite = (fav: FavoriteItem) =>
    setFavorite({ id: fav.listId, title: fav.listTitle }, fav.item, false);

  const handleOpenFavorite = (fav: FavoriteItem) => {
    setIsAuthModalVisible(false);
    openListItem(fav.listId, fav.mediaId, fav.item);
  };

  const homeFeed = useMemo(
    () =>
      buildHomeFeed({
        lists,
        userId: profile?.id ?? '',
        followedListIds,
        recommendations: directRecommendations,
        isWatched: isWatchedByMe,
      }),
    [lists, profile?.id, followedListIds, directRecommendations, isWatchedByMe]
  );

  // Native notifications: register push, show local fallback while open and navigate on tap.
  const openListItemRef = useRef(openListItem);
  const refreshNotificationsRef = useRef(refreshNotificationsCount);
  useEffect(() => {
    openListItemRef.current = openListItem;
    refreshNotificationsRef.current = refreshNotificationsCount;
  });
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    registerForPushNotifications().then(ok => {
      if (!cancelled) pushRegisteredRef.current = ok;
    });
    const stopTaps = subscribeToNotificationTaps(target => openListItemRef.current(target.listId, target.mediaId));
    const stopPolling = startNotificationPolling(() => refreshNotificationsRef.current());
    return () => {
      cancelled = true;
      stopTaps();
      stopPolling();
    };
  }, [profile?.id]);

  // Automatic APK update check on startup (Android only, throttled inside UpdateService).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await UpdateService.isAutoUpdateEnabled())) return;
        const info = await UpdateService.checkForUpdates();
        if (!cancelled && info.hasUpdate) {
          setPendingUpdateInfo(info);
          setIsUpdatesVisible(true);
        }
      } catch {
        // Automatic checks fail silently; the manual check reports errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenSignIn = () => {
    setAuthModalInitialMode('signin');
    setIsAuthModalVisible(true);
  };

  const handleOpenSignUp = () => {
    setAuthModalInitialMode('signup');
    setIsAuthModalVisible(true);
  };

  const handleLoginSuccess = async (newUser: UserProfile) => {
    // Profile updates (e.g. avatar change) also go through here: only load data on a real sign-in.
    const isNewSession = profile?.id !== newUser.id;
    setProfile(newUser);
    setSessionChecked(true);
    setIsAuthModalVisible(false);
    // Callers already persisted the profile remotely; only cache it locally here.
    await StorageService.saveProfileLocal(newUser);
    if (!isNewSession) return;

    setIsListsLoading(true);
    try {
      const [storedLists, storedFollowed, storedActivity] = await Promise.all([
        StorageService.getLists(),
        StorageService.getFollowedLists(newUser.id),
        StorageService.getActivity(),
      ]);
      setLists(storedLists);
      setFollowedListIds(storedFollowed);
      setActivities(storedActivity);
      setSelectedList(pickInitialList(storedLists, newUser.id, storedFollowed));
      setProfile(prev =>
        prev && prev.id === newUser.id
          ? {
              ...prev,
              cultoScore: GamificationService.calculateCultoScore(storedLists, newUser.id),
              badges: GamificationService.updateBadges(prev.badges, storedLists, newUser.id),
              followedLists: storedFollowed,
            }
          : prev
      );
    } catch (e) {
      console.warn('Error loading user data:', e);
    } finally {
      setIsListsLoading(false);
    }
    await refreshNotificationsCount(newUser.id);
  };

  const handleLogout = async () => {
    setSuppressSessionRestore(true);
    await unregisterPushToken();
    pushRegisteredRef.current = false;
    clearSession();
    await StorageService.clearProfile();
  };

  const clearSession = () => {
    setProfile(null);
    setLists([]);
    setActivities([]);
    setFollowedListIds([]);
    setSelectedList(null);
    setListNotifications([]);
    setDirectRecommendations([]);
    setActiveTab('home');
    setUnreadNotificationsCount(0);
    setIsAuthModalVisible(false);
  };

  const handleClerkSignedOut = () => {
    setSuppressSessionRestore(false);
    setSessionChecked(true);
    // The Clerk session ended (sign-out elsewhere or expiry): never keep showing private content.
    if (profile) {
      clearSession();
      StorageService.clearProfile();
    }
  };

  const handleToggleFollowList = async (listId: string) => {
    if (!profile) return;
    try {
      const { isFollowing, followedLists: updated } = await StorageService.toggleFollowList(profile.id, listId);
      setFollowedListIds(updated);
      const newScore = isFollowing ? (profile.cultoScore || 0) + 5 : profile.cultoScore;
      const updatedProf: UserProfile = {
        ...profile,
        followedLists: updated,
        cultoScore: newScore,
      };
      setProfile(updatedProf);
      await StorageService.updateProfile(updatedProf);
      await refreshNotificationsCount();
    } catch (err) {
      console.warn('Error toggling list follow:', err);
    }
  };


  const handleMediaPress = (item: MediaItem) => {
    setSelectedMedia(item);
    setIsDetailVisible(true);
  };

  const handleDeleteItem = async (mediaId: string) => {
    if (!selectedList || !profile) return;
    let updated: CollaborativeList[];
    try {
      updated = await StorageService.removeItemFromList(selectedList.id, mediaId, {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        handle: profile.handle,
      });
    } catch (err) {
      Alert.alert('No permitido', err instanceof Error ? err.message : 'No se pudo eliminar el elemento.');
      return;
    }
    setLists(updated);
    const target = updated.find(l => l.id === selectedList.id);
    if (target) setSelectedList(target);
    setIsDetailVisible(false);
    setSelectedMedia(null);
    await refreshNotificationsCount();
  };

  const handleDeleteList = async () => {
    if (isDeletingList || !selectedList || !profile) return;
    setIsDeletingList(true);
    try {
      const updated = await StorageService.deleteList(selectedList.id, profile.id);
      setLists(updated);
      setSelectedList(pickInitialList(updated, profile.id, followedListIds));
      setIsDeleteListConfirmVisible(false);
    } catch (err) {
      console.warn('[App] Error deleting list:', err);
      setIsDeleteListConfirmVisible(false);
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar la lista.');
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleProfileUpdatedFromSearch = async (updated: UserProfile) => {
    setProfile(updated);
    await StorageService.saveProfileLocal(updated);
  };

  const handleAddMediaToListFromNotification = async (listId: string, recommended: MediaItem) => {
    if (!profile) return;
    // The current user is the one adding it to their list.
    const item: MediaItem = {
      ...recommended,
      criticRating: recommended.criticRating ?? (recommended.averageRating > 0 ? recommended.averageRating : undefined),
      addedBy: { id: profile.id, name: profile.name, avatar: profile.avatar },
      addedAt: new Date().toISOString(),
    };
    let updated: CollaborativeList[];
    try {
      updated = await StorageService.addMediaToList(listId, item);
    } catch (err) {
      Alert.alert('No permitido', err instanceof Error ? err.message : 'No se pudo añadir el elemento.');
      return;
    }
    setLists(updated);
    if (selectedList && selectedList.id === listId) {
      const target = updated.find(l => l.id === listId);
      if (target) setSelectedList(target);
    }
    if (profile) {
      const newScore = GamificationService.calculateCultoScore(updated, profile.id);
      const newBadges = GamificationService.updateBadges(profile.badges, updated, profile.id);
      const updatedProf = { ...profile, cultoScore: newScore, badges: newBadges };
      setProfile(updatedProf);
      await StorageService.updateProfile(updatedProf);
    }
    const refreshedAct = await StorageService.getActivity();
    setActivities(refreshedAct);
    await refreshNotificationsCount();
  };

  const handleAddMedia = async (item: MediaItem) => {
    if (!selectedList) return;
    const listId = selectedList.id;
    const isDuplicate = isItemInList(item, selectedList.items);
    if (isDuplicate) {
      Alert.alert('Ya está en la lista', `«${item.title}» ya forma parte de «${selectedList.title}».`);
      return;
    }

    // Optimistic insert: show the item right away with a saving state.
    const withItem = (l: CollaborativeList) => (l.id === listId ? { ...l, items: [item, ...l.items] } : l);
    const withoutItem = (l: CollaborativeList) =>
      l.id === listId ? { ...l, items: l.items.filter(i => i.id !== item.id) } : l;
    setLists(prev => prev.map(withItem));
    setSelectedList(prev => (prev ? withItem(prev) : prev));
    setSavingItemIds(prev => [...prev, item.id]);

    let updated: CollaborativeList[];
    try {
      updated = await StorageService.addMediaToList(listId, item);
    } catch (err) {
      console.warn('[App] Error adding media:', err);
      setLists(prev => prev.map(withoutItem));
      setSelectedList(prev => (prev ? withoutItem(prev) : prev));
      Alert.alert(
        'Error',
        err instanceof Error && err.message.startsWith('Esta lista')
          ? err.message
          : `No se pudo añadir «${item.title}». Revisa tu conexión e inténtalo de nuevo.`
      );
      return;
    } finally {
      setSavingItemIds(prev => prev.filter(id => id !== item.id));
    }

    setLists(updated);
    setSelectedList(prev => (prev ? updated.find(l => l.id === prev.id) ?? prev : prev));

    // Refresh profile score
    if (profile) {
      const newScore = GamificationService.calculateCultoScore(updated, profile.id);
      const newBadges = GamificationService.updateBadges(profile.badges, updated, profile.id);
      const updatedProf = { ...profile, cultoScore: newScore, badges: newBadges };
      setProfile(updatedProf);
      await StorageService.updateProfile(updatedProf);
    }
    const refreshedAct = await StorageService.getActivity();
    setActivities(refreshedAct);
  };

  const handleAddComment = async (mediaId: string, text: string, rating: number) => {
    if (!selectedList || !profile) return;
    const updated = await StorageService.addCommentToMedia(selectedList.id, mediaId, {
      userId: profile.id,
      userName: profile.name,
      userAvatar: profile.avatar,
      text,
      rating,
    });
    setLists(updated);
    const target = updated.find(l => l.id === selectedList.id);
    if (target) {
      setSelectedList(target);
      const updatedItem = target.items.find(i => i.id === mediaId);
      if (updatedItem) setSelectedMedia(updatedItem);
    }
    const refreshedAct = await StorageService.getActivity();
    setActivities(refreshedAct);
  };

  const openCreateList = () => setListForm({ key: Date.now(), list: null });
  const openEditList = (list: CollaborativeList) => setListForm({ key: Date.now(), list });

  const handleSubmitListForm = async (values: ListFormValues) => {
    if (isSavingList || !profile || !listForm) return;
    setIsSavingList(true);
    try {
      if (listForm.list) {
        const updated = await StorageService.updateList(listForm.list.id, profile.id, {
          title: values.title,
          description: values.description,
          coverImage: values.coverImage,
          isPublic: values.isPublic,
          allowContributions: values.allowContributions,
          allowedCategories: values.allowedCategories,
        });
        if (updated) replaceList(updated);
      } else {
        const newList = await StorageService.createList({
          title: values.title,
          description: values.description || 'Lista cultural compartida entre amigos.',
          category: 'all',
          isPublic: values.isPublic,
          allowContributions: values.allowContributions,
          allowedCategories: values.allowedCategories,
          owner: { id: profile.id, name: profile.name, avatar: profile.avatar },
          items: [],
          coverImage:
            values.coverImage ||
            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        });
        // Update locally instead of re-fetching every list from the server.
        setLists(prev => [newList, ...prev.filter(l => l.id !== newList.id)]);
        setSelectedList(newList);
      }
      setListForm(null);
    } catch (err) {
      console.warn('[App] Error saving list:', err);
      Alert.alert(
        'Error',
        listForm.list
          ? 'No se pudieron guardar los cambios de la lista.'
          : 'No se pudo crear la lista. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setIsSavingList(false);
    }
  };

  const handleJoinList = async () => {
    if (!joinCode.trim() || !profile) return;
    const joined = await StorageService.joinListByCode(joinCode.trim(), {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
    });
    if (joined) {
      const refreshedLists = await StorageService.getLists();
      setLists(refreshedLists);
      setSelectedList(joined);
      setJoinCode('');
      setIsJoinListVisible(false);
      Alert.alert('¡Te has unido!', `Ahora eres colaborador en «${joined.title}».`);
    } else {
      Alert.alert('Código Inválido', 'No se encontró ninguna lista con ese código de invitación.');
    }
  };

  const handleShareList = (code: string) => {
    Alert.alert(
      'Código de Invitación',
      `Comparte este código con tus amigos para que colaboren en la lista:\n\n${code}`
    );
  };

  // Filter items in active list
  const itemSearchQuery = itemSearch.listId === selectedList?.id ? itemSearch.query : '';
  const setItemSearchQuery = (query: string) => setItemSearch({ listId: selectedList?.id ?? '', query });
  const normalizedItemQuery = itemSearchQuery.trim().toLowerCase();
  // A filter left over from another list may not be allowed in this one.
  const activeCategoryFilter =
    categoryFilter === 'all' || isCategoryAllowed(selectedList, categoryFilter) ? categoryFilter : 'all';
  const filteredItems = selectedList
    ? sortItems(
        selectedList.items.filter(item => {
          const matchesCategory = activeCategoryFilter === 'all' || item.category === activeCategoryFilter;
          const matchesPlatform =
            platformFilter === 'all' ||
            item.whereToWatchOrRead.some(p => p.name.toLowerCase().includes(platformFilter.toLowerCase()));
          const matchesQuery =
            !normalizedItemQuery ||
            item.title.toLowerCase().includes(normalizedItemQuery) ||
            (item.director?.toLowerCase().includes(normalizedItemQuery) ?? false) ||
            item.genres.some(g => g.toLowerCase().includes(normalizedItemQuery));
          return matchesCategory && matchesPlatform && matchesQuery;
        }),
        itemSortMode
      )
    : [];
  // Group the (already filtered and sorted) items by content type, in catalog order.
  const itemSections = LIST_CONTENT_TYPES.map(type => ({
    key: type.key,
    title: `${type.emoji} ${type.label}`,
    data: filteredItems.filter(item => toListContentType(item.category) === type.key),
  })).filter(section => section.data.length > 0);
  const canAddToSelectedList = Boolean(
    selectedList && profile && StorageService.canUserContribute(selectedList, profile.id, followedListIds)
  );

  // Filter items for Radar Streaming (items across all lists that user has subscriptions for)
  const radarItems = homeLists.flatMap(l => l.items).filter((item, index, self) => {
    const isFirst = self.findIndex(i => i.title.toLowerCase() === item.title.toLowerCase()) === index;
    const matchesUserSubs = profile?.activeSubscriptions.some(sub =>
      (item.whereToWatchOrRead ?? []).some(p => isSamePlatform(sub, p.name))
    );
    return isFirst && matchesUserSubs;
  });

  // User content is only loaded after a validated sign-in (see handleLoginSuccess).
  if (!sessionChecked) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {clerkEnabled && (
          <ClerkSessionGate
            hasProfile={Boolean(profile)}
            suppressRestore={suppressSessionRestore}
            onRestore={handleLoginSuccess}
            onSignedOut={handleClerkSignedOut}
            onRestoreFailed={() => setSessionChecked(true)}
          />
        )}
        <Image
          source={require('./assets/logo.png')}
          style={{ width: 84, height: 84, marginBottom: 18 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#38BDF8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {clerkEnabled && (
        <ClerkSessionGate
          hasProfile={Boolean(profile)}
          suppressRestore={suppressSessionRestore}
          onRestore={handleLoginSuccess}
          onSignedOut={handleClerkSignedOut}
          onRestoreFailed={() => setSessionChecked(true)}
        />
      )}

      {/* Top Header */}
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <Image
            source={require('./assets/logo-text.svg')}
            style={styles.brandLogo}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel="Cultoteca"
          />
        </View>

        <View style={styles.headerRightActions}>
          {profile ? (
            <>
              {/* Notification Center Bell */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setIsNotificationsModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Centro de Notificaciones"
              >
                <Ionicons name="notifications-outline" size={20} color="#F8FAFC" />
                {bellCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>
                      {bellCount > 99 ? '99+' : bellCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scorePill}
                onPress={() => setIsBadgesVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={13} color="#F59E0B" />
                <Text style={styles.scorePillText}>{profile.cultoScore} pts</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerProfileBtn}
                onPress={() => setIsAuthModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Mi cuenta"
              >
                <UserAvatar
                  name={profile.name}
                  avatar={profile.avatar}
                  size={32}
                  borderColor="#38BDF8"
                  borderWidth={1.5}
                />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.headerLoginBtn}
              onPress={handleOpenSignIn}
              activeOpacity={0.85}
              accessibilityLabel="Iniciar Sesión"
            >
              <Ionicons name="log-in-outline" size={15} color="#38BDF8" />
              <Text style={styles.headerLoginBtnText}>Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!profile ? (
        <WelcomeLandingScreen
          onOpenSignIn={handleOpenSignIn}
          onOpenSignUp={handleOpenSignUp}
        />
      ) : (
        <>
          {/* Main Tabs Navigator */}
          <View style={styles.navigationTabs}>
            {([
              { key: 'home', label: 'Principal', icon: 'home' },
              { key: 'lists', label: `Listas (${homeLists.length})`, icon: 'albums' },
              { key: 'radar', label: 'Radar', icon: 'radio' },
              { key: 'activity', label: 'Muro', icon: 'chatbubbles' },
            ] as const).map(tab => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.navTab, active && styles.activeNavTab]}
                  onPress={() => setActiveTab(tab.key)}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={active ? tab.icon : (`${tab.icon}-outline` as const)}
                    size={18}
                    color={active ? '#38BDF8' : '#94A3B8'}
                  />
                  <Text style={[styles.navTabText, active && styles.activeNavTabText]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <View style={styles.container}>
          <HomeFeed
            feed={homeFeed}
            userName={profile.name}
            loading={isListsLoading}
            refreshing={isRefreshingLists}
            onRefresh={refreshLists}
            onOpenItem={entry => openListItem(entry.list.id, entry.item.id)}
            onOpenList={list => openListItem(list.id)}
            onOpenRecommendations={() => setIsNotificationsModalVisible(true)}
            onExplore={() => setIsPublicListsVisible(true)}
          />
        </View>
      )}

      {/* Main Body */}
      {activeTab === 'lists' && (
        <View style={styles.container}>
          {/* Quick List Selector & Actions */}
          <View style={styles.listsControlRow}>
            {isListsLoading && homeLists.length === 0 ? (
              <ListChipsSkeleton />
            ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listsSelectorScroll}>
              {homeLists.map(list => (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.listChip,
                    selectedList?.id === list.id && styles.activeListChip,
                  ]}
                  onPress={() => setSelectedList(list)}
                >
                  <Text
                    style={[
                      styles.listChipText,
                      selectedList?.id === list.id && styles.activeListChipText,
                    ]}
                    numberOfLines={1}
                  >
                    {list.title}
                  </Text>
                  <View style={styles.chipCounter}>
                    <Text style={styles.chipCounterText}>{list.items.length}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            )}

            <View style={styles.listActionIcons}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => setIsPublicListsVisible(true)}
                accessibilityLabel="Explorar Listas Públicas"
              >
                <Ionicons name="compass-outline" size={23} color="#38BDF8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={openCreateList}
                accessibilityLabel="Crear Lista"
              >
                <Ionicons name="add-circle" size={26} color="#38BDF8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => setIsJoinListVisible(true)}
                accessibilityLabel="Unirse con Código"
              >
                <Ionicons name="key-outline" size={22} color="#F59E0B" />
              </TouchableOpacity>
            </View>
          </View>

          {isListsLoading && homeLists.length === 0 ? (
            <MediaListSkeleton />
          ) : homeLists.length === 0 && !selectedList ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingLists}
                  onRefresh={refreshLists}
                  tintColor="#38BDF8"
                  colors={['#38BDF8']}
                />
              }
            >
            <View style={styles.emptyItemsView}>
              <Ionicons name="albums-outline" size={56} color="#38BDF8" />
              <Text style={styles.emptyTitle}>Sin listas todavía</Text>
              <Text style={styles.emptySubtitle}>
                No tienes listas todavía. Crea tu primera lista colaborativa, únete con un código o invitación, o sigue alguna lista pública desde Explorar.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.confirmBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={openCreateList}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#0F172A" />
                  <Text style={styles.confirmBtnText}>Crear lista</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#334155' }]}
                  onPress={() => setIsJoinListVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="key-outline" size={16} color="#F8FAFC" />
                  <Text style={[styles.confirmBtnText, { color: '#F8FAFC' }]}>Unirse con código</Text>
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          ) : (
            <>
              {/* Current List Header & Tools */}
              {selectedList && (
            <View style={styles.activeListHeader}>
              <View style={styles.listTitleBlock}>
                <Text style={styles.currentListTitle} numberOfLines={2}>
                  {selectedList.title}
                </Text>
                {!!selectedList.description && (
                  <Text style={styles.currentListDesc} numberOfLines={2}>
                    {selectedList.description}
                  </Text>
                )}
                <View style={styles.listMetaRow}>
                  <View style={styles.listMetaPill}>
                    <Ionicons
                      name={selectedList.isPublic ? 'earth-outline' : 'lock-closed-outline'}
                      size={11}
                      color="#94A3B8"
                    />
                    <Text style={styles.listMetaText}>{selectedList.isPublic ? 'Pública' : 'Privada'}</Text>
                  </View>
                  <View style={styles.listMetaPill}>
                    <Ionicons
                      name={selectedList.allowContributions === false ? 'person-outline' : 'people-outline'}
                      size={11}
                      color="#94A3B8"
                    />
                    <Text style={styles.listMetaText}>
                      {selectedList.allowContributions === false ? 'Solo el dueño aporta' : 'Aportes abiertos'}
                    </Text>
                  </View>
                  <View style={[styles.listMetaPill, { flexShrink: 1 }]}>
                    <Ionicons name="pricetags-outline" size={11} color="#94A3B8" />
                    <Text style={styles.listMetaText} numberOfLines={1}>
                      {describeAllowedCategories(getAllowedCategories(selectedList))}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.listActionBar}>
                <View style={styles.listSecondaryActions}>
                  {profile && StorageService.canUserDeleteList(selectedList, profile.id) ? (
                    <>
                    <TouchableOpacity
                      style={styles.visibilityListBtn}
                      onPress={() => openEditList(selectedList)}
                      activeOpacity={0.8}
                      accessibilityLabel="Editar lista"
                    >
                      <Ionicons name="create-outline" size={14} color="#CBD5E1" />
                      <Text style={styles.visibilityListBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.inviteListBtn}
                      onPress={() => setIsInviteUsersVisible(true)}
                      activeOpacity={0.8}
                      accessibilityLabel="Invitar usuarios a la lista"
                    >
                      <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                      <Text style={styles.inviteListBtnText}>
                        Invitar{selectedList.pendingInvites?.length ? ` (${selectedList.pendingInvites.length})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteListBtn}
                      onPress={() => setIsDeleteListConfirmVisible(true)}
                      activeOpacity={0.8}
                      accessibilityLabel="Eliminar lista"
                    >
                      <Ionicons name="trash-outline" size={14} color="#F87171" />
                      <Text style={styles.deleteListBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                    </>
                  ) : profile ? (
                    <TouchableOpacity
                      style={[
                        styles.followListBtn,
                        followedListIds.includes(selectedList.id) && styles.followListBtnActive,
                      ]}
                      onPress={() => handleToggleFollowList(selectedList.id)}
                      activeOpacity={0.8}
                      accessibilityLabel={
                        followedListIds.includes(selectedList.id)
                          ? 'Dejar de seguir lista'
                          : 'Seguir lista'
                      }
                    >
                      <Ionicons
                        name={followedListIds.includes(selectedList.id) ? 'bookmark' : 'bookmark-outline'}
                        size={14}
                        color={followedListIds.includes(selectedList.id) ? '#38BDF8' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.followListBtnText,
                          followedListIds.includes(selectedList.id) && styles.followListBtnTextActive,
                        ]}
                      >
                        {followedListIds.includes(selectedList.id) ? 'Siguiendo' : 'Seguir'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Roulette button "¿Qué vemos hoy?" */}
                <TouchableOpacity
                  style={styles.rouletteButton}
                  onPress={() => setIsRouletteVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="dice" size={18} color="#0F172A" />
                  <Text style={styles.rouletteButtonText}>¿Qué vemos hoy?</Text>
                </TouchableOpacity>
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, activeCategoryFilter === 'all' && styles.activeFilterChip]}
                  onPress={() => setCategoryFilter('all')}
                >
                  <Text style={[styles.filterChipText, activeCategoryFilter === 'all' && styles.activeFilterChipText]}>
                    Todos ({selectedList.items.length})
                  </Text>
                </TouchableOpacity>
                {LIST_CONTENT_TYPES.filter(
                  type => type.key !== 'other' && getAllowedCategories(selectedList).includes(type.key)
                ).map(type => (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.filterChip, categoryFilter === type.key && styles.activeFilterChip]}
                    onPress={() => setCategoryFilter(type.key as MediaCategory)}
                  >
                    <Text style={[styles.filterChipText, categoryFilter === type.key && styles.activeFilterChipText]}>
                      {type.emoji} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* In-list search & sorting */}
              <View style={styles.itemSearchBar}>
                <Ionicons name="search" size={16} color="#64748B" />
                <TextInput
                  style={styles.itemSearchInput}
                  placeholder="Buscar en esta lista..."
                  placeholderTextColor="#64748B"
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Buscar dentro de la lista"
                />
                {!!itemSearchQuery && (
                  <TouchableOpacity onPress={() => setItemSearchQuery('')} accessibilityLabel="Limpiar búsqueda">
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.sortRow}>
                <Ionicons name="swap-vertical" size={14} color="#64748B" />
                {([
                  { mode: 'recent', label: 'Recientes' },
                  { mode: 'list', label: '★ Lista' },
                  { mode: 'critic', label: '★ Crítica' },
                ] as { mode: ItemSortMode; label: string }[]).map(option => (
                  <TouchableOpacity
                    key={option.mode}
                    style={[styles.sortChip, itemSortMode === option.mode && styles.sortChipActive]}
                    onPress={() => setItemSortMode(option.mode)}
                    accessibilityState={{ selected: itemSortMode === option.mode }}
                  >
                    <Text style={[styles.sortChipText, itemSortMode === option.mode && styles.sortChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Media Items List, grouped by content type */}
          <SectionList
            sections={itemSections}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.mediaItemsList}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={styles.itemSectionHeader}>
                <Text style={styles.itemSectionTitle}>{section.title}</Text>
                <Text style={styles.itemSectionCount}>{section.data.length}</Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingLists}
                onRefresh={refreshLists}
                tintColor="#38BDF8"
                colors={['#38BDF8']}
              />
            }
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() => handleMediaPress(item)}
                isSaving={savingItemIds.includes(item.id)}
                isWatched={isWatchedByMe(item)}
                onToggleWatched={handleToggleWatched}
                isFavorite={!!selectedList && isFavoriteIn(selectedList.id, item.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyItemsView}>
                <Ionicons name="film-outline" size={54} color="#334155" />
                <Text style={styles.emptyTitle}>Lista vacía o sin coincidencias</Text>
                <Text style={styles.emptySubtitle}>
                  {canAddToSelectedList
                    ? 'Toca «+ Agregar a la lista» para buscar con la API de JustWatch o ingresar un título manualmente.'
                    : 'Todavía no hay elementos que coincidan.'}
                </Text>
              </View>
            }
          />

          {/* Floating Action Button to Add Media (only for users allowed to contribute) */}
          {canAddToSelectedList ? (
            <TouchableOpacity
              style={styles.floatingAddBtn}
              onPress={() => setIsAddVisible(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="add" size={24} color="#0F172A" />
              <Text style={styles.floatingAddText}>Agregar a la lista</Text>
            </TouchableOpacity>
          ) : selectedList ? (
            <View style={styles.readOnlyNotice}>
              <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              <Text style={styles.readOnlyNoticeText}>
                {selectedList.allowContributions === false
                  ? 'Solo el dueño puede agregar elementos a esta lista'
                  : 'Sigue la lista o únete para poder agregar elementos'}
              </Text>
            </View>
          ) : null}
            </>
          )}
        </View>
      )}

      {/* Radar Streaming Tab */}
      {activeTab === 'radar' && (
        <View style={styles.container}>
          <View style={styles.radarHeader}>
            <Text style={styles.radarTitle}>📡 Radar de Streaming Compartido</Text>
            <Text style={styles.radarSubtitle}>
              {profile?.activeSubscriptions.length
                ? `Obras de tus listas disponibles en tus plataformas (${profile.activeSubscriptions.join(', ')}).`
                : 'Configura en tu perfil las plataformas que tienes para ver qué obras de tus listas puedes ver ya.'}
            </Text>
          </View>

          <FlatList
            data={radarItems}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.mediaItemsList}
            renderItem={({ item }) => (
              <MediaCard
                item={item}
                onPress={() => handleMediaPress(item)}
                isSaving={savingItemIds.includes(item.id)}
                isWatched={isWatchedByMe(item)}
                onToggleWatched={handleToggleWatched}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyItemsView}>
                <Ionicons name="radio-outline" size={54} color="#334155" />
                <Text style={styles.emptyTitle}>
                  {profile?.activeSubscriptions.length ? 'No hay obras en tus plataformas' : 'Aún no tienes plataformas'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  Agrega más plataformas en tu perfil o añade nuevas películas y libros a tus listas.
                </Text>
                <TouchableOpacity
                  style={styles.radarConfigBtn}
                  onPress={() => setIsAuthModalVisible(true)}
                  accessibilityLabel="Configurar plataformas"
                >
                  <Ionicons name="tv-outline" size={16} color="#0F172A" />
                  <Text style={styles.radarConfigBtnText}>Configurar plataformas</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* Activity Feed Tab */}
      {activeTab === 'activity' && (
        <View style={styles.container}>
          <View style={styles.radarHeader}>
            <Text style={styles.radarTitle}>🔥 Muro de Actividad Cultural</Text>
            <Text style={styles.radarSubtitle}>
              Lo que agregan y comentan otros en tus listas y en las que sigues. Toca un evento para abrirlo.
            </Text>
          </View>

          <FlatList
            data={listNotifications}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.activityList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingLists}
                onRefresh={refreshLists}
                tintColor="#38BDF8"
                colors={['#38BDF8']}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.activityCard, !item.read && styles.activityCardUnread]}
                onPress={() => handleOpenWallNotification(item)}
                activeOpacity={0.85}
                accessibilityLabel={`${item.actor.name} ${item.message ?? ''}`}
              >
                <View style={styles.activityRow}>
                  <UserAvatar name={item.actor.name} avatar={item.actor.avatar} size={36} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityUser} numberOfLines={1}>{item.actor.name}</Text>
                      <Text style={styles.activityTime}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.activityActionText}>
                      {item.action === 'item_added' && `Añadió «${item.mediaTitle}» a «${item.listTitle}»`}
                      {item.action === 'item_removed' && `Eliminó «${item.mediaTitle}» de «${item.listTitle}»`}
                      {item.action === 'item_commented' && `Comentó «${item.mediaTitle}» en «${item.listTitle}»`}
                      {item.action === 'list_updated' && (item.message || `Actualizó «${item.listTitle}»`)}
                    </Text>
                  </View>
                  {item.mediaItem?.posterUrl ? (
                    <Image source={remoteImageSource(item.mediaItem.posterUrl)} style={styles.activityPoster} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#475569" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyItemsView}>
                <Ionicons name="chatbubbles-outline" size={54} color="#334155" />
                <Text style={styles.emptyTitle}>Sin actividad todavía</Text>
                <Text style={styles.emptySubtitle}>
                  Aquí verás lo que tus amigos agregan y comentan en tus listas y en las listas que sigues.
                </Text>
              </View>
            }
          />
        </View>
      )}
        </>
      )}

      <AppFooter />

      {/* Modals */}
      <AuthModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        currentUser={profile}
        initialMode={authModalInitialMode}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        isClerkConfigured={Boolean(CLERK_PUBLISHABLE_KEY)}
        onViewBadges={() => {
          setIsAuthModalVisible(false);
          setIsBadgesVisible(true);
        }}
        onOpenSearchUsers={() => setIsUserSearchVisible(true)}
        onOpenUpdates={() => setIsUpdatesVisible(true)}
        favorites={favorites}
        onSelectFavoriteItem={handleOpenFavorite}
        onRemoveFavorite={handleRemoveFavorite}
      />
      <AppUpdatesModal
        visible={isUpdatesVisible}
        onClose={() => setIsUpdatesVisible(false)}
        initialUpdateInfo={pendingUpdateInfo}
      />
      <UserSearchModal
        visible={isUserSearchVisible}
        onClose={() => setIsUserSearchVisible(false)}
        currentUser={profile}
        allLists={lists}
        onProfileUpdated={handleProfileUpdatedFromSearch}
        onSelectUserList={list => {
          setSelectedList(list);
          setActiveTab('lists');
        }}
      />
      <ConfirmModal
        visible={isDeleteListConfirmVisible}
        title="Eliminar lista"
        message={`¿Seguro que quieres eliminar «${selectedList?.title ?? ''}»? Esta acción no se puede deshacer y la lista desaparecerá para todos sus colaboradores.`}
        icon="trash-outline"
        confirmText={isDeletingList ? 'Eliminando...' : 'Eliminar'}
        destructive
        onConfirm={handleDeleteList}
        onCancel={() => { if (!isDeletingList) setIsDeleteListConfirmVisible(false); }}
      />
      {selectedMedia && profile && (
        <MediaDetailModal
          item={selectedMedia}
          visible={isDetailVisible}
          onClose={() => setIsDetailVisible(false)}
          onAddComment={handleAddComment}
          onDeleteItem={handleDeleteItem}
          listOwnerId={selectedList?.owner.id}
          currentUser={{ id: profile.id, name: profile.name, avatar: profile.avatar || '' }}
          isWatched={isWatchedByMe(selectedMedia)}
          onToggleWatched={handleToggleWatched}
          isFavorite={(() => {
            const sourceList = findSourceList(selectedMedia);
            return !!sourceList && isFavoriteIn(sourceList.id, selectedMedia.id);
          })()}
          onToggleFavorite={findSourceList(selectedMedia) ? handleToggleFavorite : undefined}
        />
      )}

      {profile && (
        <AddMediaModal
          visible={isAddVisible}
          onClose={() => setIsAddVisible(false)}
          onAddMedia={handleAddMedia}
          currentUser={{ id: profile.id, name: profile.name, avatar: profile.avatar }}
          defaultCategory={activeCategoryFilter}
          allowedCategories={getAllowedCategories(selectedList)}
          existingItems={selectedList?.items ?? []}
        />
      )}

      {selectedList && (
        <CultoRouletteModal
          visible={isRouletteVisible}
          onClose={() => setIsRouletteVisible(false)}
          items={selectedList.items}
          listTitle={selectedList.title}
          onViewSelected={handleMediaPress}
          isWatched={isWatchedByMe}
        />
      )}

      {profile && (
        <BadgesModal
          visible={isBadgesVisible}
          onClose={() => setIsBadgesVisible(false)}
          profile={profile}
        />
      )}

      {/* Notifications Modal */}
      {profile && (
        <NotificationsModal
          visible={isNotificationsModalVisible}
          onClose={() => {
            setIsNotificationsModalVisible(false);
            refreshNotificationsCount();
          }}
          currentUser={profile}
          allLists={homeLists}
          onAddMediaToList={handleAddMediaToListFromNotification}
          onViewMediaDetail={handleMediaPress}
          onSelectList={list => {
            setSelectedList(list);
            setActiveTab('lists');
            setIsNotificationsModalVisible(false);
            refreshNotificationsCount();
          }}
          onRecommendationUpdated={refreshNotificationsCount}
          onInvitationResponded={handleInvitationResponded}
        />
      )}

      <InviteUsersModal
        visible={isInviteUsersVisible}
        onClose={() => setIsInviteUsersVisible(false)}
        currentUser={profile}
        list={selectedList}
        onListUpdated={replaceList}
      />

      {/* Public Lists Discovery Modal */}
      <PublicListsModal
        visible={isPublicListsVisible}
        onClose={() => setIsPublicListsVisible(false)}
        lists={lists}
        currentUser={profile}
        onSelectList={list => {
          setSelectedList(list);
          setActiveTab('lists');
          setIsPublicListsVisible(false);
        }}
        followedListIds={followedListIds}
        onToggleFollow={handleToggleFollowList}
      />

      {listForm && (
        <ListFormModal
          key={listForm.key}
          visible
          list={listForm.list}
          saving={isSavingList}
          onSubmit={handleSubmitListForm}
          onCancel={() => setListForm(null)}
        />
      )}

      {/* Join List Modal */}
      <Modal visible={isJoinListVisible} animationType="slide" transparent onRequestClose={() => setIsJoinListVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Unirse a Lista de Amigos</Text>
            <Text style={styles.dialogSubtitle}>Ingresa el código que te compartió tu amigo (ej. CULTO-SCIFI-2026):</Text>
            <TextInput
              style={[styles.dialogInput, { textTransform: 'uppercase' }]}
              placeholder="CÓDIGO DE INVITACIÓN"
              placeholderTextColor="#64748B"
              value={joinCode}
              onChangeText={setJoinCode}
            />
            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsJoinListVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleJoinList}>
                <Text style={styles.confirmBtnText}>Unirse</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <ApiAuthBridge />
          <MainApp clerkEnabled />
        </ClerkProvider>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    width: 140,
    height: 34,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  headerProfileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
    gap: 5,
  },
  headerLoginBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F44',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCD34D',
  },
  navigationTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  activeNavTab: {
    backgroundColor: '#0F172A',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeNavTabText: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  listsControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  listsSelectorScroll: {
    flex: 1,
  },
  listChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  activeListChip: {
    backgroundColor: '#0284C722',
    borderColor: '#38BDF8',
  },
  listChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    maxWidth: 160,
  },
  activeListChipText: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  chipCounter: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipCounterText: {
    fontSize: 10,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  listActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  iconActionBtn: {
    padding: 4,
  },
  activeListHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  listTitleBlock: {
    marginBottom: 10,
  },
  listActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8,
  },
  listSecondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    alignItems: 'center',
    gap: 6,
  },
  listMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  listMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  listMetaText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  visibilityListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    gap: 5,
  },
  visibilityListBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  inviteListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    gap: 5,
  },
  inviteListBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  deleteListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    gap: 5,
  },
  deleteListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
  },
  currentListTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 23,
  },
  currentListDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rouletteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  rouletteButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  followListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 5,
    marginRight: 6,
  },
  followListBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  followListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  followListBtnTextActive: {
    color: '#38BDF8',
  },
  filtersScroll: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginRight: 6,
  },
  activeFilterChip: {
    backgroundColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeFilterChipText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  itemSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 8,
  },
  itemSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  itemSectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaItemsList: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 90,
  },
  emptyItemsView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    elevation: 6,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  floatingAddText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  readOnlyNotice: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  readOnlyNoticeText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  itemSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  itemSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 8,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sortChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sortChipTextActive: {
    color: '#38BDF8',
  },
  radarHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  radarConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  radarConfigBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  radarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  radarSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  activityList: {
    padding: 18,
    paddingBottom: 40,
  },
  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityCardUnread: {
    borderColor: 'rgba(56, 189, 248, 0.6)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityPoster: {
    width: 36,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  activityTime: {
    fontSize: 11,
    color: '#64748B',
  },
  activityActionText: {
    fontSize: 13,
    color: '#F8FAFC',
    lineHeight: 18,
  },
  activityExtra: {
    fontSize: 12,
    color: '#F5A623',
    fontStyle: 'italic',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  dialogInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 14,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
