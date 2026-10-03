import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityEvent, CollaborativeList, CustomCategory, DirectRecommendation, FavoriteItem, ListActivityNotification, ListInvitation, MediaComment, MediaItem, ReleaseTrackingInfo, UserProfile } from '../types';
import { CURATED_CULT_CATALOG } from './api/mediaSearchService';
import { cancelReleaseNotification } from './releaseTrackingService';
import { MongoDbService, LoginLogEntry, AuditLogEntry } from './mongoDbService';
import { Platform } from 'react-native';
import { isCategoryAllowed } from '../utils/listCategories';

const LISTS_KEY = '@cultoteca_lists_v1';
const PROFILE_KEY = '@cultoteca_profile_v1';
const ACTIVITY_KEY = '@cultoteca_activity_v1';
const CUSTOM_CATEGORIES_KEY = '@cultoteca_custom_categories_v1';
const USERS_DIRECTORY_KEY = '@cultoteca_users_directory_v1';
const FAVORITES_KEY = '@cultoteca_favorites_v1';
const RECOMMENDATIONS_KEY = '@cultoteca_recommendations_v1';
const LIST_NOTIFICATIONS_KEY = '@cultoteca_list_notifications_v1';
const FOLLOWED_LISTS_KEY = '@cultoteca_followed_lists_v1';

export const INITIAL_RECOMMENDATIONS: DirectRecommendation[] = [];

export const INITIAL_LIST_NOTIFICATIONS: ListActivityNotification[] = [];

export const DEFAULT_USER_BADGES = [
  {
    id: 'b-cinefilo',
    title: 'Cinéfilo de Culto',
    description: 'Comparte o califica más de 10 películas de culto',
    icon: 'film',
    category: 'cine',
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'b-otaku',
    title: 'Otaku Supremo',
    description: 'Agrega mangas o animes a listas compartidas con amigos',
    icon: 'flash',
    category: 'anime',
    unlocked: false,
    progress: 0,
    maxProgress: 8
  },
  {
    id: 'b-lector',
    title: 'Devorador de Páginas',
    description: 'Crea o colabora en listas literarias con recomendaciones',
    icon: 'book',
    category: 'lectura',
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'b-curador',
    title: 'Curador Colaborativo',
    description: 'Ten al menos 3 amigos colaborando en una misma lista',
    icon: 'people',
    category: 'curador',
    unlocked: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'b-gamer',
    title: 'Gamer de Culto',
    description: 'Guarda o califica videojuegos de culto en listas compartidas',
    icon: 'game-controller',
    category: 'gaming',
    unlocked: false,
    progress: 0,
    maxProgress: 5
  }
];

export const INITIAL_USER: UserProfile | null = null;

export const INITIAL_DIRECTORY_USERS: UserProfile[] = [];

const DUMMY_LIST_IDS = new Set(['list-1', 'list-2', 'list-3', 'list-4']);
const DUMMY_ACTIVITY_IDS = new Set(['act-1', 'act-2', 'act-3']);

export const INITIAL_LISTS: CollaborativeList[] = [];

export const INITIAL_ACTIVITY: ActivityEvent[] = [];

export const StorageService = {
  async getLists(): Promise<CollaborativeList[]> {
    try {
      if (MongoDbService.isConfigured()) {
        const remoteLists = await MongoDbService.getLists();
        if (remoteLists) {
          const filtered = remoteLists.filter(l => !DUMMY_LIST_IDS.has(l.id));
          await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(filtered));
          return filtered;
        }
      }
      const data = await AsyncStorage.getItem(LISTS_KEY);
      if (data) {
        const parsed: CollaborativeList[] = JSON.parse(data);
        const filtered = parsed.filter(l => !DUMMY_LIST_IDS.has(l.id));
        if (filtered.length !== parsed.length) {
          await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
      return INITIAL_LISTS;
    } catch {
      return INITIAL_LISTS;
    }
  },

  async saveLists(lists: CollaborativeList[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
      if (MongoDbService.isConfigured()) {
        for (const list of lists) {
          MongoDbService.insertOrUpdateList(list).catch(err => {
            console.warn('[StorageService] Error syncing list to MongoDb:', err);
          });
        }
      }
    } catch (e) {
      console.warn('Error saving lists:', e);
    }
  },

  async addMediaToList(listId: string, item: MediaItem): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const followed = await this.getFollowedLists(item.addedBy.id);
      if (!this.canUserContribute(targetList, item.addedBy.id, followed)) {
        throw new Error('Esta lista no acepta aportes: solo el dueño puede agregar elementos.');
      }
      if (!isCategoryAllowed(targetList, item.category)) {
        throw new Error('Esta lista no admite este tipo de contenido.');
      }
      // Avoid duplicate by title & category
      const exists = targetList.items.some(
        i => i.title.toLowerCase() === item.title.toLowerCase() && i.category === item.category
      );
      if (!exists) {
        targetList.items.unshift(item);
        targetList.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertOrUpdateList(targetList);
          // Audit log is non-critical: don't block the UI on it.
          MongoDbService.logAction({
            userId: item.addedBy.id,
            userName: item.addedBy.name,
            actionType: 'add_media',
            targetTitle: item.title,
            targetId: item.id,
            targetCategory: item.category,
            listTitle: targetList.title,
            details: `Agregó "${item.title}" (${item.category}) a la lista "${targetList.title}"`,
          }).catch(err => console.warn('[StorageService] Error logging add_media:', err));
        }

        // Record activity event
        await this.recordActivity({
          id: `act-${Date.now()}`,
          userId: item.addedBy.id,
          userName: item.addedBy.name,
          userAvatar: item.addedBy.avatar,
          action: 'added_item',
          targetTitle: item.title,
          targetCategory: item.category,
          listTitle: targetList.title,
          timestamp: 'Justo ahora'
        });

        // Record list change notification for followers (non-blocking)
        this.recordListNotification({
          listId: targetList.id,
          listTitle: targetList.title,
          actor: {
            id: item.addedBy.id,
            name: item.addedBy.name,
            avatar: item.addedBy.avatar,
          },
          action: 'item_added',
          mediaItem: item,
          mediaId: item.id,
          mediaTitle: item.title,
          mediaCategory: item.category,
          message: `agregó «${item.title}» a la lista «${targetList.title}»`,
        }).catch(err => console.warn('Error recording add list notification:', err));
      }
    }
    return lists;
  },

  async removeItemFromList(
    listId: string,
    mediaId: string,
    deletedByUser?: { id: string; name: string; avatar?: string; handle?: string }
  ): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const item = targetList.items.find(i => i.id === mediaId);
      if (item && !this.canUserDeleteItem(targetList, item, deletedByUser?.id)) {
        throw new Error('Solo el creador de la lista o quien agregó este elemento puede eliminarlo.');
      }
      if (item?.trackingInfo?.scheduledNotificationId) {
        await cancelReleaseNotification(item.trackingInfo.scheduledNotificationId);
      }
      targetList.items = targetList.items.filter(i => i.id !== mediaId);
      targetList.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

      if (MongoDbService.isConfigured()) {
        await MongoDbService.insertOrUpdateList(targetList);
        if (item) {
          await MongoDbService.logAction({
            userId: deletedByUser?.id || 'unknown',
            userName: deletedByUser?.name,
            actionType: 'remove_media',
            targetTitle: item.title,
            targetId: item.id,
            targetCategory: item.category,
            listTitle: targetList.title,
            details: `Eliminó "${item.title}" de la lista "${targetList.title}"`,
          });
        }
      }

      if (item) {
        try {
          const actor = deletedByUser || (await this.getProfile()) || {
            id: 'guest',
            name: 'Usuario',
            avatar: undefined,
            handle: undefined,
          };
          await this.recordListNotification({
            listId: targetList.id,
            listTitle: targetList.title,
            actor: {
              id: actor.id,
              name: actor.name,
              avatar: actor.avatar,
              handle: actor.handle,
            },
            action: 'item_removed',
            mediaId: item.id,
            mediaTitle: item.title,
            mediaCategory: item.category,
            message: `eliminó «${item.title}» de la lista «${targetList.title}»`,
          });
        } catch (err) {
          console.warn('Error recording remove list notification:', err);
        }
      }
    }
    return lists;
  },

  async updateItemTrackingInfo(
    listId: string,
    mediaId: string,
    trackingInfo: ReleaseTrackingInfo
  ): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const item = targetList.items.find(i => i.id === mediaId);
      if (item) {
        item.trackingInfo = {
          ...item.trackingInfo,
          ...trackingInfo,
        };
        targetList.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertOrUpdateList(targetList);
        }
      }
    }
    return lists;
  },

  async toggleItemTrackingNotifications(
    listId: string,
    mediaId: string,
    enabled: boolean,
    scheduledNotificationId?: string
  ): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const item = targetList.items.find(i => i.id === mediaId);
      if (item) {
        if (!item.trackingInfo) {
          item.trackingInfo = { lastCheckedAt: new Date().toISOString() };
        }
        item.trackingInfo.notificationsEnabled = enabled;
        item.trackingInfo.scheduledNotificationId = scheduledNotificationId;
        targetList.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertOrUpdateList(targetList);
        }
      }
    }
    return lists;
  },

  async addCommentToMedia(
    listId: string,
    mediaId: string,
    comment: Omit<MediaComment, 'id' | 'createdAt'>
  ): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const media = targetList.items.find(i => i.id === mediaId);
      if (media) {
        const fullComment: MediaComment = {
          ...comment,
          id: `c-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        // User ratings live in comments (see getListRating); averageRating keeps the critic score.
        media.comments.unshift(fullComment);
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertOrUpdateList(targetList);
          await MongoDbService.logAction({
            userId: comment.userId,
            userName: comment.userName,
            actionType: 'add_comment',
            targetTitle: media.title,
            targetId: media.id,
            targetCategory: media.category,
            listTitle: targetList.title,
            details: `Comentó y calificó con ${comment.rating || 0} estrellas: "${comment.text}"`,
          });
        }

        // Record activity
        await this.recordActivity({
          id: `act-${Date.now()}`,
          userId: comment.userId,
          userName: comment.userName,
          userAvatar: comment.userAvatar,
          action: 'commented',
          targetTitle: media.title,
          targetCategory: media.category,
          listTitle: targetList.title,
          timestamp: 'Justo ahora',
          extra: comment.text
        });

        this.recordListNotification({
          listId: targetList.id,
          listTitle: targetList.title,
          actor: { id: comment.userId, name: comment.userName, avatar: comment.userAvatar },
          action: 'item_commented',
          mediaId: media.id,
          mediaTitle: media.title,
          mediaCategory: media.category,
          message: `comentó «${media.title}» en «${targetList.title}»${comment.text ? `: "${comment.text.slice(0, 80)}"` : ''}`,
        }).catch(err => console.warn('Error recording comment list notification:', err));
      }
    }
    return lists;
  },

  async toggleItemWatched(listId: string, mediaId: string): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      const item = targetList.items.find(i => i.id === mediaId);
      if (item) {
        item.isWatched = !item.isWatched;
        item.watchedAt = item.isWatched ? new Date().toISOString() : undefined;
        targetList.updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertOrUpdateList(targetList);
          await MongoDbService.logAction({
            userId: 'current',
            actionType: 'toggle_watched',
            targetTitle: item.title,
            targetId: mediaId,
            details: `Marcó "${item.title}" como ${item.isWatched ? 'visto' : 'pendiente'}`,
          });
        }
      }
    }
    return lists;
  },

  async createList(list: Omit<CollaborativeList, 'id' | 'createdAt' | 'updatedAt' | 'inviteCode' | 'collaborators'>): Promise<CollaborativeList> {
    // Read the local cache (avoids a remote round-trip before inserting).
    let lists: CollaborativeList[] = [];
    try {
      const cached = await AsyncStorage.getItem(LISTS_KEY);
      lists = cached ? JSON.parse(cached) : await this.getLists();
    } catch {
      lists = await this.getLists();
    }
    const inviteCode = `CULTO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const newList: CollaborativeList = {
      ...list,
      id: `list-${Date.now()}`,
      inviteCode,
      shareUrl: `https://cultoteca.app/join/${inviteCode}`,
      isPublic: list.isPublic ?? true,
      allowContributions: list.allowContributions ?? true,
      contributionPolicy: list.contributionPolicy ?? 'collaborators_only',
      collaborators: [
        {
          id: list.owner.id,
          name: list.owner.name,
          avatar: list.owner.avatar,
          role: 'owner'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    lists.unshift(newList);
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

    if (MongoDbService.isConfigured()) {
      await MongoDbService.insertOrUpdateList(newList);
      // Audit log is non-critical: don't block the UI on it.
      MongoDbService.logAction({
        userId: list.owner.id,
        userName: list.owner.name,
        actionType: 'create_list',
        targetTitle: newList.title,
        targetId: newList.id,
        listTitle: newList.title,
        details: `Creó la lista "${newList.title}"`,
      }).catch(err => console.warn('[StorageService] Error logging create_list:', err));
    }

    return newList;
  },

  async deleteList(listId: string, currentUserId: string): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    const target = lists.find(l => l.id === listId);
    if (!target) return lists;
    if (target.owner.id !== currentUserId) {
      throw new Error('Solo el creador de la lista tiene permisos para eliminarla.');
    }
    const updated = lists.filter(l => l.id !== listId);
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(updated));

    if (MongoDbService.isConfigured()) {
      await MongoDbService.deleteList(listId);
      await MongoDbService.logAction({
        userId: currentUserId,
        actionType: 'delete_list',
        targetTitle: target.title,
        targetId: listId,
        details: `Eliminó la lista "${target.title}"`,
      });
    }

    return updated;
  },

  async updateList(
    listId: string,
    currentUserId: string,
    updates: Partial<Pick<CollaborativeList, 'title' | 'description' | 'coverImage' | 'isPublic' | 'allowContributions' | 'contributionPolicy' | 'allowedCategories'>>
  ): Promise<CollaborativeList | null> {
    const lists = await this.getLists();
    const index = lists.findIndex(l => l.id === listId);
    if (index === -1) return null;
    if (lists[index].owner.id !== currentUserId) {
      throw new Error('Solo el creador de la lista tiene permisos para editarla.');
    }
    lists[index] = {
      ...lists[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

    if (MongoDbService.isConfigured()) {
      await MongoDbService.insertOrUpdateList(lists[index]);
      await MongoDbService.logAction({
        userId: currentUserId,
        actionType: 'update_list',
        targetTitle: lists[index].title,
        targetId: listId,
        details: `Actualizó la lista "${lists[index].title}"`,
      });
    }

    return lists[index];
  },

  canUserDeleteList(list: CollaborativeList, userId?: string | null): boolean {
    if (!userId || !list) return false;
    return list.owner.id === userId;
  },

  canUserEditList(list: CollaborativeList, userId?: string | null): boolean {
    if (!userId || !list) return false;
    return list.owner.id === userId;
  },

  canUserDeleteItem(list: CollaborativeList, item: MediaItem, userId?: string | null): boolean {
    if (!userId || !list || !item) return false;
    return list.owner.id === userId || item.addedBy?.id === userId;
  },

  /**
   * Owner can always add. With contributions open, editors and subscribers
   * (followers of a public list) can add too; closed means owner only.
   */
  canUserContribute(list: CollaborativeList, userId?: string | null, followedListIds: string[] = []): boolean {
    if (!userId || !list) return false;
    if (list.owner.id === userId) return true;
    if (list.allowContributions === false) return false;
    if (list.isPublic && list.contributionPolicy === 'anyone_logged_in') return true;
    if (list.collaborators.some(c => c.id === userId && (c.role === 'owner' || c.role === 'editor'))) return true;
    return list.isPublic && followedListIds.includes(list.id);
  },

  isFriend(friends: string[] | undefined, user: Pick<UserProfile, 'id' | 'userCode'>): boolean {
    if (!friends?.length) return false;
    return friends.includes(user.id) || Boolean(user.userCode && friends.includes(user.userCode));
  },

  canUserViewList(list: CollaborativeList, userId?: string | null): boolean {
    if (list.isPublic) return true;
    if (!userId) return false;
    return list.owner.id === userId || list.collaborators.some(c => c.id === userId);
  },

  isListInUserHome(list: CollaborativeList, userId?: string | null, followedListIds: string[] = []): boolean {
    if (!userId || !list) return false;
    if (list.owner.id === userId) return true;
    if (list.collaborators?.some(c => c.id === userId)) return true;
    // A followed list that became private is no longer visible to non-members.
    return list.isPublic && followedListIds.includes(list.id);
  },

  getPendingInvitations(lists: CollaborativeList[], userId?: string | null): { list: CollaborativeList; invitation: ListInvitation }[] {
    if (!userId) return [];
    return lists.flatMap(list => {
      const invitation = list.pendingInvites?.find(i => i.userId === userId);
      return invitation ? [{ list, invitation }] : [];
    });
  },

  async persistSingleList(lists: CollaborativeList[], list: CollaborativeList): Promise<void> {
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    if (MongoDbService.isConfigured()) {
      await MongoDbService.insertOrUpdateList(list);
    }
  },

  async inviteUserToList(
    listId: string,
    inviterProfile: { id: string; name: string; avatar?: string; friends?: string[] },
    invitee: UserProfile
  ): Promise<CollaborativeList | null> {
    const { friends = [], ...inviter } = inviterProfile;
    const lists = await this.getLists();
    const target = lists.find(l => l.id === listId);
    if (!target) return null;
    if (target.owner.id !== inviter.id) {
      throw new Error('Solo el creador de la lista puede invitar usuarios.');
    }
    if (!this.isFriend(friends, invitee)) {
      throw new Error('Solo puedes invitar a usuarios que estén en tu lista de amigos.');
    }
    const alreadyMember = target.owner.id === invitee.id || target.collaborators.some(c => c.id === invitee.id);
    const alreadyInvited = target.pendingInvites?.some(i => i.userId === invitee.id);
    if (alreadyMember || alreadyInvited) return target;

    target.pendingInvites = [
      ...(target.pendingInvites || []),
      {
        userId: invitee.id,
        userName: invitee.name,
        userAvatar: invitee.avatar,
        userHandle: invitee.handle,
        invitedBy: inviter,
        invitedAt: new Date().toISOString(),
      },
    ];
    target.updatedAt = new Date().toISOString();
    await this.persistSingleList(lists, target);

    if (MongoDbService.isConfigured()) {
      MongoDbService.logAction({
        userId: inviter.id,
        userName: inviter.name,
        actionType: 'invite_to_list',
        targetTitle: target.title,
        targetId: target.id,
        listTitle: target.title,
        details: `Invitó a ${invitee.name} a la lista "${target.title}"`,
      }).catch(err => console.warn('[StorageService] Error logging invite_to_list:', err));
    }
    return target;
  },

  async cancelListInvitation(listId: string, ownerId: string, inviteeId: string): Promise<CollaborativeList | null> {
    const lists = await this.getLists();
    const target = lists.find(l => l.id === listId);
    if (!target) return null;
    if (target.owner.id !== ownerId) {
      throw new Error('Solo el creador de la lista puede cancelar invitaciones.');
    }
    target.pendingInvites = (target.pendingInvites || []).filter(i => i.userId !== inviteeId);
    target.updatedAt = new Date().toISOString();
    await this.persistSingleList(lists, target);
    return target;
  },

  async respondToListInvitation(
    listId: string,
    user: { id: string; name: string; avatar?: string },
    accept: boolean
  ): Promise<CollaborativeList | null> {
    const lists = await this.getLists();
    const target = lists.find(l => l.id === listId);
    if (!target) return null;
    const invitation = target.pendingInvites?.find(i => i.userId === user.id);
    if (!invitation) return target;

    target.pendingInvites = (target.pendingInvites || []).filter(i => i.userId !== user.id);
    if (accept && !target.collaborators.some(c => c.id === user.id)) {
      target.collaborators.push({ id: user.id, name: user.name, avatar: user.avatar, role: 'editor' });
    }
    target.updatedAt = new Date().toISOString();
    await this.persistSingleList(lists, target);

    if (MongoDbService.isConfigured()) {
      MongoDbService.logAction({
        userId: user.id,
        userName: user.name,
        actionType: accept ? 'accept_list_invite' : 'decline_list_invite',
        targetTitle: target.title,
        targetId: target.id,
        listTitle: target.title,
        details: `${accept ? 'Aceptó' : 'Rechazó'} la invitación a la lista "${target.title}"`,
      }).catch(err => console.warn('[StorageService] Error logging invite response:', err));
    }
    return target;
  },

  async joinListByCode(code: string, user: { id: string; name: string; avatar?: string }): Promise<CollaborativeList | null> {
    const lists = await this.getLists();
    const cleanCode = code.trim().toUpperCase();
    const target = lists.find(l => l.inviteCode.toUpperCase() === cleanCode);
    if (!target) return null;

    const alreadyJoined = target.collaborators.some(c => c.id === user.id);
    if (!alreadyJoined) {
      target.collaborators.push({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: 'editor'
      });
      await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));

      if (MongoDbService.isConfigured()) {
        await MongoDbService.insertOrUpdateList(target);
        await MongoDbService.logAction({
          userId: user.id,
          userName: user.name,
          actionType: 'joined_list',
          targetTitle: target.title,
          targetId: target.id,
          listTitle: target.title,
          details: `Se unió a la lista "${target.title}" con código ${cleanCode}`,
        });
      }

      await this.recordActivity({
        id: `act-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        action: 'joined_list',
        targetTitle: target.title,
        targetCategory: 'movie',
        listTitle: target.title,
        timestamp: 'Justo ahora'
      });
    }
    return target;
  },

  async getActivity(): Promise<ActivityEvent[]> {
    try {
      const data = await AsyncStorage.getItem(ACTIVITY_KEY);
      if (data) {
        const parsed: ActivityEvent[] = JSON.parse(data);
        const filtered = parsed.filter(a => !DUMMY_ACTIVITY_IDS.has(a.id));
        if (filtered.length !== parsed.length) {
          await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(INITIAL_ACTIVITY));
      return INITIAL_ACTIVITY;
    } catch {
      return INITIAL_ACTIVITY;
    }
  },

  async recordActivity(event: ActivityEvent): Promise<void> {
    try {
      const current = await this.getActivity();
      const updated = [event, ...current].slice(0, 30);
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error recording activity:', e);
    }
  },

  async getProfile(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(PROFILE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        let modified = false;
        if (!parsed.userCode) {
          parsed.userCode = `#CULTO-${Math.floor(1000 + Math.random() * 9000)}`;
          modified = true;
        }
        if (!parsed.badges || !Array.isArray(parsed.badges)) {
          parsed.badges = DEFAULT_USER_BADGES;
          modified = true;
        }
        if (!parsed.friends || !Array.isArray(parsed.friends)) {
          parsed.friends = [];
          modified = true;
        }
        if (modified) {
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  async clearProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROFILE_KEY);
    } catch (e) {
      console.warn('Error clearing profile:', e);
    }
  },

  /** Persists the profile only in local storage (no backend request). */
  async saveProfileLocal(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Error saving local profile:', e);
    }
  },

  async updateProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      if (MongoDbService.isConfigured()) {
        await MongoDbService.insertOrUpdateUser(profile);
      }
    } catch (e) {
      console.warn('Error saving profile:', e);
    }
  },

  async getCustomCategories(): Promise<CustomCategory[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
      if (data) return JSON.parse(data);
      return [];
    } catch {
      return [];
    }
  },

  async addCustomCategory(label: string, icon = 'bookmark-outline'): Promise<CustomCategory[]> {
    const existing = await this.getCustomCategories();
    const cleanLabel = label.trim();
    if (!cleanLabel) return existing;

    const exists = existing.some(c => c.label.toLowerCase() === cleanLabel.toLowerCase());
    if (exists) return existing;

    const newCategory: CustomCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: cleanLabel,
      icon,
      createdAt: new Date().toISOString(),
    };

    const updated = [...existing, newCategory];
    try {
      await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving custom category:', e);
    }
    return updated;
  },

  async getUsersDirectory(): Promise<UserProfile[]> {
    try {
      if (MongoDbService.isConfigured()) {
        const remoteUsers = await MongoDbService.getUsers();
        if (remoteUsers) {
          await AsyncStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(remoteUsers));
          return remoteUsers;
        }
      }
      const data = await AsyncStorage.getItem(USERS_DIRECTORY_KEY);
      if (data) {
        const parsed: UserProfile[] = JSON.parse(data);
        return parsed.map((u, idx) => ({
          ...u,
          userCode: u.userCode || `#CULTO-${1000 + idx}`,
        }));
      }
      return INITIAL_DIRECTORY_USERS;
    } catch {
      return INITIAL_DIRECTORY_USERS;
    }
  },

  async saveUserToDirectory(profile: UserProfile): Promise<void> {
    try {
      const directory = await this.getUsersDirectory();
      const safeProfile: UserProfile = {
        ...profile,
        userCode: profile.userCode || `#CULTO-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      const index = directory.findIndex(
        u => u.id === safeProfile.id || (safeProfile.userCode && u.userCode === safeProfile.userCode)
      );
      let updated: UserProfile[];
      if (index >= 0) {
        updated = [...directory];
        updated[index] = { ...updated[index], ...safeProfile };
      } else {
        updated = [safeProfile, ...directory];
      }
      await AsyncStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(updated));

      if (MongoDbService.isConfigured()) {
        await MongoDbService.insertOrUpdateUser(safeProfile);
      }
    } catch (e) {
      console.warn('Error saving user to directory:', e);
    }
  },

  async searchUsers(query: string): Promise<UserProfile[]> {
    const directory = await this.getUsersDirectory();
    const clean = query.trim().toLowerCase().replace(/^@/, '').replace(/^#/, '');
    if (!clean) return directory;

    return directory.filter(u => {
      const matchName = u.name ? u.name.toLowerCase().includes(clean) : false;
      const matchHandle = u.handle ? u.handle.toLowerCase().replace('@', '').includes(clean) : false;
      const matchCode = u.userCode ? u.userCode.toLowerCase().replace('#', '').includes(clean) : false;
      return matchName || matchHandle || matchCode;
    });
  },

  async getUserByCodeOrHandle(identifier: string): Promise<UserProfile | null> {
    const clean = identifier.trim().split('/').pop() || identifier.trim();
    const cleanId = clean.toLowerCase().replace(/^@/, '').replace(/^#/, '');

    if (MongoDbService.isConfigured()) {
      const remoteUser = await MongoDbService.getUserById(cleanId);
      if (remoteUser) return remoteUser;
    }

    const directory = await this.getUsersDirectory();
    const found = directory.find(u => {
      const uCode = u.userCode ? u.userCode.toLowerCase().replace('#', '') : '';
      const uHandle = u.handle ? u.handle.toLowerCase().replace('@', '') : '';
      return uCode === cleanId || uHandle === cleanId || u.id === cleanId;
    });
    return found || null;
  },

  async toggleFriend(currentProfile: UserProfile, targetUserIdOrCode: string): Promise<UserProfile> {
    const currentFriends = currentProfile.friends || [];
    const isFriend = currentFriends.includes(targetUserIdOrCode);
    const updatedFriends = isFriend
      ? currentFriends.filter(f => f !== targetUserIdOrCode)
      : [...currentFriends, targetUserIdOrCode];

    const updatedProfile: UserProfile = {
      ...currentProfile,
      friends: updatedFriends,
    };

    await this.updateProfile(updatedProfile);
    await this.saveUserToDirectory(updatedProfile);

    if (MongoDbService.isConfigured()) {
      await MongoDbService.logAction({
        userId: currentProfile.id,
        userName: currentProfile.name,
        userCode: currentProfile.userCode,
        actionType: 'toggle_friend',
        details: isFriend
          ? `Eliminó el amigo ${targetUserIdOrCode}`
          : `Vinculó al amigo ${targetUserIdOrCode}`,
      });
    }

    return updatedProfile;
  },

  async getPublicLists(): Promise<CollaborativeList[]> {
    const lists = await this.getLists();
    return lists.filter(l => l.isPublic);
  },

  async getFavorites(userId?: string): Promise<FavoriteItem[]> {
    try {
      if (MongoDbService.isConfigured()) {
        const remoteFavs = await MongoDbService.getFavorites(userId);
        if (remoteFavs) {
          await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(remoteFavs));
          return remoteFavs;
        }
      }
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      if (data) {
        const parsed: FavoriteItem[] = JSON.parse(data);
        if (userId) {
          return parsed.filter(f => !f.userId || f.userId === userId);
        }
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  },

  async toggleFavorite(
    list: CollaborativeList,
    item: MediaItem,
    userId?: string
  ): Promise<{ isFavorite: boolean; favorites: FavoriteItem[] }> {
    try {
      const allFavorites = await this.getFavorites();
      const existingIndex = allFavorites.findIndex(
        f => f.mediaId === item.id && (f.listId === list.id || !f.listId)
      );

      let isFavorite = false;
      let updated: FavoriteItem[];

      if (existingIndex >= 0) {
        updated = allFavorites.filter((_, idx) => idx !== existingIndex);
        isFavorite = false;

        if (MongoDbService.isConfigured()) {
          await MongoDbService.removeFavorite(item.id, list.id, userId);
          await MongoDbService.logAction({
            userId: userId || 'anonymous',
            actionType: 'remove_favorite',
            targetTitle: item.title,
            targetId: item.id,
            listTitle: list.title,
            details: `Eliminó de favoritos: "${item.title}"`,
          });
        }
      } else {
        const newFavorite: FavoriteItem = {
          id: `fav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          mediaId: item.id,
          listId: list.id,
          listTitle: list.title,
          item,
          addedAt: new Date().toISOString(),
          userId,
        };
        updated = [newFavorite, ...allFavorites];
        isFavorite = true;

        if (MongoDbService.isConfigured()) {
          await MongoDbService.insertFavorite(newFavorite);
          await MongoDbService.logAction({
            userId: userId || 'anonymous',
            actionType: 'add_favorite',
            targetTitle: item.title,
            targetId: item.id,
            listTitle: list.title,
            details: `Guardó como favorito: "${item.title}"`,
          });
        }
      }

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return { isFavorite, favorites: updated };
    } catch (e) {
      console.warn('Error toggling favorite:', e);
      return { isFavorite: false, favorites: [] };
    }
  },

  async isItemFavorite(mediaId: string, listId?: string): Promise<boolean> {
    try {
      const allFavorites = await this.getFavorites();
      return allFavorites.some(f => f.mediaId === mediaId && (!listId || f.listId === listId));
    } catch {
      return false;
    }
  },

  async getDirectRecommendations(userId?: string): Promise<DirectRecommendation[]> {
    try {
      if (MongoDbService.isConfigured()) {
        const remoteRecs = await MongoDbService.getRecommendations(userId);
        if (remoteRecs) {
          await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(remoteRecs));
          return remoteRecs;
        }
      }
      const data = await AsyncStorage.getItem(RECOMMENDATIONS_KEY);
      if (data) {
        const list: DirectRecommendation[] = JSON.parse(data);
        if (userId) {
          return list.filter(r => r.toUserId === userId || (userId === 'user-me' && r.toUserId === 'user-me'));
        }
        return list;
      }
      return INITIAL_RECOMMENDATIONS;
    } catch {
      return INITIAL_RECOMMENDATIONS;
    }
  },

  async markRecommendationAsRead(recommendationId: string): Promise<DirectRecommendation[]> {
    try {
      const all = await this.getDirectRecommendations();
      const updated = all.map(r => (r.id === recommendationId ? { ...r, read: true } : r));
      await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(updated));
      if (MongoDbService.isConfigured()) {
        await MongoDbService.markRecommendationRead(recommendationId);
      }
      return updated;
    } catch (e) {
      console.warn('Error marking recommendation as read:', e);
      return [];
    }
  },

  async getUnreadRecommendationsCount(userId?: string): Promise<number> {
    try {
      const recommendations = await this.getDirectRecommendations(userId);
      return recommendations.filter(r => !r.read).length;
    } catch {
      return 0;
    }
  },

  async ensureFriendsRecommendationList(
    recipient: UserProfile,
    item: MediaItem,
    sender?: { id: string; name: string; avatar?: string; handle?: string }
  ): Promise<CollaborativeList> {
    const lists = await this.getLists();
    let targetList = lists.find(
      l =>
        l.title.trim().toLowerCase() === 'recomendadas por amigos' &&
        (l.owner.id === recipient.id || l.collaborators.some(c => c.id === recipient.id))
    );

    const itemToInsert: MediaItem = {
      ...item,
      id: item.id || `item-${Date.now()}`,
      addedBy: {
        id: sender?.id || recipient.id,
        name: sender?.name || 'Amigo de Culto',
        avatar: sender?.avatar,
      },
      addedAt: new Date().toISOString(),
    };

    if (!targetList) {
      targetList = await this.createList({
        title: 'Recomendadas por amigos',
        description: 'Obras y títulos recomendados especialmente por mis amigos en Cultoteca.',
        category: 'all',
        owner: {
          id: recipient.id,
          name: recipient.name,
          avatar: recipient.avatar,
        },
        isPublic: true,
        allowContributions: true,
        contributionPolicy: 'anyone_logged_in',
        items: [itemToInsert],
      });
      return targetList;
    } else {
      await this.addMediaToList(targetList.id, itemToInsert);
      const updatedLists = await this.getLists();
      return updatedLists.find(l => l.id === targetList!.id) || targetList;
    }
  },

  async sendDirectRecommendation(
    sender: UserProfile,
    targetUser: UserProfile,
    item: MediaItem,
    message?: string
  ): Promise<DirectRecommendation> {
    const recommendations = await this.getDirectRecommendations();
    const newRecommendation: DirectRecommendation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromUser: {
        id: sender.id,
        name: sender.name,
        avatar: sender.avatar,
        handle: sender.handle,
        userCode: sender.userCode,
      },
      toUserId: targetUser.id,
      item,
      message: message?.trim() || undefined,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecommendation, ...recommendations];
    await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(updated));

    if (MongoDbService.isConfigured()) {
      await MongoDbService.insertRecommendation(newRecommendation);
      await MongoDbService.logAction({
        userId: sender.id,
        userName: sender.name,
        actionType: 'send_recommendation',
        targetTitle: item.title,
        targetId: item.id,
        targetCategory: item.category,
        details: `Recomendó "${item.title}" a ${targetUser.name}: "${message || 'Sin mensaje'}"`,
      });
    }

    // Ensure automatically generated "Recomendadas por amigos" list for recipient
    await this.ensureFriendsRecommendationList(targetUser, item, sender);

    // Record activity event
    await this.recordActivity({
      id: `act-${Date.now()}`,
      userId: sender.id,
      userName: sender.name,
      userAvatar: sender.avatar,
      action: 'commented',
      targetTitle: item.title,
      targetCategory: item.category,
      listTitle: 'Recomendadas por amigos',
      timestamp: 'Justo ahora',
      extra: message ? `Te recomendó: "${message}"` : `Recomendación directa para ${targetUser.name}`,
    });

    return newRecommendation;
  },

  async syncFriendsRecommendationsList(user: UserProfile): Promise<CollaborativeList[]> {
    try {
      const recs = await this.getDirectRecommendations(user.id);
      for (const rec of recs) {
        await this.ensureFriendsRecommendationList(user, rec.item, rec.fromUser);
      }
      return await this.getLists();
    } catch (e) {
      console.warn('Error syncing friends recommendations list:', e);
      return await this.getLists();
    }
  },

  // --- List Activity Notifications & Following ---

  async getListNotifications(userId?: string): Promise<ListActivityNotification[]> {
    try {
      if (MongoDbService.isConfigured()) {
        const remoteNotifs = await MongoDbService.getNotifications(userId);
        if (remoteNotifs) {
          await AsyncStorage.setItem(LIST_NOTIFICATIONS_KEY, JSON.stringify(remoteNotifs));
          return remoteNotifs;
        }
      }
      const data = await AsyncStorage.getItem(LIST_NOTIFICATIONS_KEY);
      if (data) {
        const list: ListActivityNotification[] = JSON.parse(data);
        if (userId) {
          return list.filter(n => !n.recipientUserId || n.recipientUserId === userId || n.recipientUserId === 'all');
        }
        return list;
      }
      return INITIAL_LIST_NOTIFICATIONS;
    } catch {
      return INITIAL_LIST_NOTIFICATIONS;
    }
  },

  async markListNotificationAsRead(notificationId: string): Promise<ListActivityNotification[]> {
    try {
      const all = await this.getListNotifications();
      const updated = all.map(n => (n.id === notificationId ? { ...n, read: true } : n));
      await AsyncStorage.setItem(LIST_NOTIFICATIONS_KEY, JSON.stringify(updated));
      if (MongoDbService.isConfigured()) {
        await MongoDbService.markNotificationRead(notificationId);
      }
      return updated;
    } catch (e) {
      console.warn('Error marking list notification as read:', e);
      return [];
    }
  },

  async markAllListNotificationsAsRead(userId?: string): Promise<ListActivityNotification[]> {
    try {
      const all = await this.getListNotifications();
      const updated = all.map(n => {
        if (!userId || !n.recipientUserId || n.recipientUserId === userId || n.recipientUserId === 'all') {
          return { ...n, read: true };
        }
        return n;
      });
      await AsyncStorage.setItem(LIST_NOTIFICATIONS_KEY, JSON.stringify(updated));
      if (MongoDbService.isConfigured()) {
        await MongoDbService.markAllNotificationsRead(userId);
      }
      return updated;
    } catch (e) {
      console.warn('Error marking all list notifications read:', e);
      return [];
    }
  },

  /**
   * Notifies the list owner, collaborators and followers (except the actor). The backend
   * fans it out per recipient and sends push; nothing is stored for the actor locally.
   */
  async recordListNotification(
    notif: Omit<ListActivityNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<ListActivityNotification> {
    const newNotif: ListActivityNotification = {
      ...notif,
      id: `lnotif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    if (MongoDbService.isConfigured()) {
      await MongoDbService.insertNotification(newNotif, { fanOut: true });
    }
    return newNotif;
  },

  async getUnreadListNotificationsCount(userId?: string): Promise<number> {
    try {
      const notifications = await this.getListNotifications(userId);
      return notifications.filter(n => !n.read).length;
    } catch {
      return 0;
    }
  },

  async getFollowedLists(userId?: string): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(FOLLOWED_LISTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      const profile = await this.getProfile();
      return profile?.followedLists || [];
    } catch {
      return [];
    }
  },

  async toggleFollowList(userId: string, listId: string): Promise<{ isFollowing: boolean; followedLists: string[] }> {
    try {
      const current = await this.getFollowedLists(userId);
      const isFollowing = current.includes(listId);
      const updated = isFollowing ? current.filter(id => id !== listId) : [...current, listId];
      await AsyncStorage.setItem(FOLLOWED_LISTS_KEY, JSON.stringify(updated));

      const profile = await this.getProfile();
      if (profile && profile.id === userId) {
        profile.followedLists = updated;
        await this.updateProfile(profile);
      }

      if (MongoDbService.isConfigured()) {
        await MongoDbService.logAction({
          userId,
          actionType: 'toggle_follow_list',
          targetId: listId,
          details: isFollowing ? `Dejó de seguir la lista ${listId}` : `Comenzó a seguir la lista ${listId}`,
        });
      }

      return { isFollowing: !isFollowing, followedLists: updated };
    } catch (e) {
      console.warn('Error toggling followed list:', e);
      return { isFollowing: false, followedLists: [] };
    }
  },

  async isListFollowed(userId: string, listId: string, list?: CollaborativeList): Promise<boolean> {
    if (list) {
      if (list.owner.id === userId) return true;
      if (list.collaborators?.some(c => c.id === userId)) return true;
    }
    const followed = await this.getFollowedLists(userId);
    return followed.includes(listId);
  },

  // --- Logins & Trazabilidad ---

  async logLogin(entry: {
    userId: string;
    userCode?: string;
    email?: string;
    authProvider: 'clerk' | 'local' | 'guest';
    platform?: string;
  }): Promise<void> {
    try {
      if (MongoDbService.isConfigured()) {
        await MongoDbService.logLogin({
          userId: entry.userId,
          userCode: entry.userCode,
          email: entry.email,
          authProvider: entry.authProvider,
          platform: entry.platform || Platform.OS,
        });
        await MongoDbService.logAction({
          userId: entry.userId,
          userCode: entry.userCode,
          actionType: 'user_login',
          details: `Inicio de sesión vía ${entry.authProvider} (${entry.platform || Platform.OS})`,
        });
      }
    } catch (err) {
      console.warn('Error logging user login to MongoDB:', err);
    }
  }
};

