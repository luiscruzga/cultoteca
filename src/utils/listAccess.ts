import { CollaborativeList, MediaItem } from '../types';

/**
 * Reglas de visibilidad de listas (espejo de `server/listAccess.js`): el backend ya filtra,
 * esto protege la caché local cuando se usa sin conexión.
 */

export const isListMember = (list: CollaborativeList, userId?: string | null): boolean =>
  Boolean(userId) && (list.owner.id === userId || list.collaborators.some(c => c.id === userId));

export const canViewList = (list: CollaborativeList, userId?: string | null): boolean =>
  list.isPublic !== false ||
  isListMember(list, userId) ||
  Boolean(userId && list.pendingInvites?.some(i => i.userId === userId));

/** En una lista privada solo cuentan los elementos del dueño y de los colaboradores actuales. */
export const isItemVisible = (list: CollaborativeList, item: MediaItem): boolean =>
  list.isPublic !== false || isListMember(list, item.addedBy?.id);

/** Listas que `userId` puede ver, sin los elementos ocultos de las listas privadas. */
export const sanitizeListsForViewer = (lists: CollaborativeList[], userId?: string | null): CollaborativeList[] =>
  lists
    .filter(list => canViewList(list, userId))
    .map(list => {
      const items = list.items.filter(item => isItemVisible(list, item));
      return items.length === list.items.length ? list : { ...list, items };
    });
