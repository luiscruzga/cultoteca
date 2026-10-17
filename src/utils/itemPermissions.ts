import { CollaborativeList, MediaItem } from '../types';

/**
 * Editar o eliminar un elemento solo puede hacerlo el dueño de la lista o quien lo publicó
 * (espejo de `server/listAccess.js#canEditItem`).
 */
export const canEditItem = (
  list: Pick<CollaborativeList, 'owner'> | null | undefined,
  item: Pick<MediaItem, 'addedBy'> | null | undefined,
  userId?: string | null
): boolean => {
  if (!userId || !list || !item) return false;
  return list.owner.id === userId || item.addedBy?.id === userId;
};

/** Campos descriptivos que se pueden cambiar al editar un elemento. */
export type EditableItemFields = Pick<
  MediaItem,
  | 'title'
  | 'synopsis'
  | 'posterUrl'
  | 'genres'
  | 'year'
  | 'releaseDate'
  | 'director'
  | 'url'
  | 'eventStartsAt'
  | 'eventEndsAt'
  | 'eventAllDay'
  | 'eventLocation'
  | 'eventHideWhenPast'
>;
