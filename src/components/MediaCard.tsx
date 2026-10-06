import React from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCategory, MediaItem } from '../types';
import { formatReleaseBadge } from '../services/releaseTrackingService';
import { ProviderBadge } from './ProviderBadge';
import { remoteImageSource } from '../utils/remoteImage';
import { getCriticRating, getListRating } from '../utils/ratings';

interface MediaCardProps {
  item: MediaItem;
  onPress: () => void;
  /** Personal watched state of the current user (not the shared item flag). */
  isWatched?: boolean;
  onToggleWatched?: (item: MediaItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: MediaItem) => void;
  onRecommendToFriend?: (item: MediaItem) => void;
  showAddedBy?: boolean;
  /** Item is being persisted: show a saving overlay and disable interaction. */
  isSaving?: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  movie: { label: 'Película', icon: 'film-outline', color: '#E50914' },
  series: { label: 'Serie', icon: 'tv-outline', color: '#00A8E1' },
  book: { label: 'Libro', icon: 'book-outline', color: '#10B981' },
  anime: { label: 'Anime', icon: 'flash-outline', color: '#F59E0B' },
  manga: { label: 'Manga', icon: 'albums-outline', color: '#8B5CF6' },
  game: { label: 'Videojuego', icon: 'game-controller-outline', color: '#06B6D4' },
  boardgame: { label: 'Juego de mesa', icon: 'dice-outline', color: '#F97316' },
  podcast: { label: 'Pódcast', icon: 'mic-outline', color: '#A855F7' },
  music: { label: 'Música', icon: 'musical-notes-outline', color: '#EC4899' },
  recipe: { label: 'Receta', icon: 'restaurant-outline', color: '#EAB308' },
  place: { label: 'Lugar', icon: 'location-outline', color: '#14B8A6' },
  link: { label: 'Enlace', icon: 'link-outline', color: '#38BDF8' },
};

const formatAddedDate = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const getWatchedLabel = (category: string, uppercase: boolean = false): string => {
  switch (category) {
    case 'book':
    case 'manga':
    case 'link':
      return uppercase ? 'LEÍDO' : 'Leído';
    case 'game':
    case 'boardgame':
      return uppercase ? 'JUGADO' : 'Jugado';
    case 'podcast':
    case 'music':
      return uppercase ? 'ESCUCHADO' : 'Escuchado';
    case 'recipe':
      return uppercase ? 'COCINADO' : 'Cocinado';
    case 'place':
      return uppercase ? 'VISITADO' : 'Visitado';
    default:
      return uppercase ? 'VISTO' : 'Visto';
  }
};

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPress,
  isWatched = false,
  onToggleWatched,
  isFavorite = false,
  onToggleFavorite,
  onRecommendToFriend,
  showAddedBy = true,
  isSaving = false,
}) => {
  const meta = CATEGORY_META[item.category] || {
    label: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    icon: 'bookmark-outline',
    color: '#38BDF8',
  };

  const isBookOrManga = item.category === 'book' || item.category === 'manga';
  const isGame = item.category === 'game';
  const isLink = item.category === 'link';
  const targetUrl = item.url || item.externalLinks?.[0]?.url;
  const releaseBadge = formatReleaseBadge(item);
  const criticRating = getCriticRating(item);
  const listRating = getListRating(item);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress} disabled={isSaving}>
      {/* Poster with watched ribbon */}
      <View style={styles.posterContainer}>
        <Image source={remoteImageSource(item.posterUrl)} style={styles.poster} resizeMode="cover" />
        {isWatched && (
          <View style={styles.watchedRibbon}>
            <Ionicons name="checkmark-done" size={11} color="#FFFFFF" />
            <Text style={styles.watchedRibbonText}>
              {getWatchedLabel(item.category, true)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.categoryTag, { backgroundColor: meta.color + '22' }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.categoryText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            {item.siteName && isLink ? (
              <View style={styles.siteBadge}>
                <Text style={styles.siteBadgeText} numberOfLines={1}>
                  {item.siteName}
                </Text>
              </View>
            ) : item.year ? (
              <Text style={styles.year}>{item.year}</Text>
            ) : null}
            {onRecommendToFriend && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onRecommendToFriend(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.cardFavoriteBtn}
                accessibilityLabel="Recomendar a un amigo"
              >
                <Ionicons name="paper-plane-outline" size={15} color="#38BDF8" />
              </TouchableOpacity>
            )}
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleFavorite(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.cardFavoriteBtn}
                accessibilityLabel={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={16}
                  color={isFavorite ? "#EF4444" : "#64748B"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.ratingRow}>
          <View style={styles.ratingPill} accessibilityLabel={`Puntuación de la crítica: ${criticRating ?? 'sin datos'}`}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingPillValue}>{criticRating !== null ? criticRating.toFixed(1) : '–'}</Text>
            <Text style={styles.ratingPillLabel}>Crítica</Text>
          </View>
          <View
            style={[styles.ratingPill, styles.ratingPillList]}
            accessibilityLabel={`Puntuación de la lista: ${listRating.average ?? 'sin votos'}`}
          >
            <Ionicons name="people" size={11} color="#38BDF8" />
            <Text style={styles.ratingPillValue}>
              {listRating.average !== null ? listRating.average.toFixed(1) : '–'}
            </Text>
            <Text style={styles.ratingPillLabel}>
              Lista{listRating.count > 0 ? ` (${listRating.count})` : ''}
            </Text>
          </View>
        </View>

        {releaseBadge && (
          <View
            style={[
              styles.releaseBadge,
              releaseBadge.isUpcoming && styles.releaseBadgeUpcoming,
              releaseBadge.isEnded && styles.releaseBadgeEnded,
            ]}
          >
            <Ionicons
              name={
                releaseBadge.isEnded
                  ? 'checkmark-circle-outline'
                  : releaseBadge.isUpcoming
                  ? 'alarm-outline'
                  : 'calendar-outline'
              }
              size={11}
              color={
                releaseBadge.isEnded
                  ? '#94A3B8'
                  : releaseBadge.isUpcoming
                  ? '#F59E0B'
                  : '#A78BFA'
              }
            />
            <Text
              style={[
                styles.releaseBadgeText,
                releaseBadge.isUpcoming && styles.releaseBadgeTextUpcoming,
                releaseBadge.isEnded && styles.releaseBadgeTextEnded,
              ]}
              numberOfLines={1}
            >
              {releaseBadge.label}
            </Text>
          </View>
        )}

        {isLink && targetUrl ? (
          <TouchableOpacity
            style={styles.openExternalBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(targetUrl);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={12} color="#38BDF8" />
            <Text style={styles.openExternalText} numberOfLines={1}>
              Abrir {item.siteName || 'enlace'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.providersRow}>
            {item.whereToWatchOrRead.slice(0, 2).map(p => (
              <ProviderBadge key={p.id} provider={p} compact category={item.category} />
            ))}
            {item.whereToWatchOrRead.length > 2 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreText}>+{item.whereToWatchOrRead.length - 2}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer with AddedBy, Date and Watched Toggle */}
        <View style={styles.footerRow}>
          {showAddedBy && item.addedBy && (
            <View style={styles.addedByRow}>
              <Image source={remoteImageSource(item.addedBy.avatar)} style={styles.avatar} />
              <View style={styles.addedByCol}>
                <Text style={styles.addedByName} numberOfLines={1}>
                  {item.addedBy.name}
                </Text>
                {item.addedAt ? (
                  <Text style={styles.addedAtDate}>
                    {formatAddedDate(item.addedAt)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          <View style={styles.footerActions}>
            {onToggleWatched && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleWatched(item);
                }}
                style={[styles.watchedToggleBtn, isWatched && styles.watchedToggleBtnActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isWatched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={14}
                  color={isWatched ? '#10B981' : '#94A3B8'}
                />
                <Text style={[styles.watchedToggleText, isWatched && styles.watchedToggleTextActive]}>
                  {isWatched ? getWatchedLabel(item.category) : 'Pendiente'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.commentsIndicator}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#94A3B8" />
              <Text style={styles.commentsCount}>{item.comments.length}</Text>
            </View>
          </View>
        </View>
      </View>
      {isSaving && (
        <View style={styles.savingOverlay} accessibilityLabel="Guardando obra">
          <View style={styles.savingPill}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.savingText}>Guardando...</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  savingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  savingText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  posterContainer: {
    position: 'relative',
    width: 105,
    height: 155,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  watchedRibbon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#10B981EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    gap: 3,
  },
  watchedRibbonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  year: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 20,
    marginVertical: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  ratingPillList: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  ratingPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  ratingPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  ratingsCount: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  releaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF618',
    borderColor: '#8B5CF644',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  releaseBadgeUpcoming: {
    backgroundColor: '#F59E0B18',
    borderColor: '#F59E0B44',
  },
  releaseBadgeEnded: {
    backgroundColor: '#33415533',
    borderColor: '#334155',
  },
  releaseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
  },
  releaseBadgeTextUpcoming: {
    color: '#FBBF24',
  },
  releaseBadgeTextEnded: {
    color: '#94A3B8',
  },
  providersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 6,
  },
  moreBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  moreText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#33415555',
    paddingTop: 6,
  },
  addedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  addedByCol: {
    flex: 1,
  },
  addedByName: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  addedAtDate: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  watchedToggleBtnActive: {
    backgroundColor: '#064E3B44',
    borderColor: '#10B981',
  },
  watchedToggleText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  watchedToggleTextActive: {
    color: '#10B981',
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentsCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  siteBadge: {
    backgroundColor: '#38BDF820',
    borderColor: '#38BDF855',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  siteBadgeText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '700',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0369A125',
    borderColor: '#0284C7',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  openExternalText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
  cardFavoriteBtn: {
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
