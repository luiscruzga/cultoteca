import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CastMember, MediaItem, StreamingProvider } from '../types';
import { MarkdownText } from './MarkdownText';
import { ProviderBadge } from './ProviderBadge';
import { RatingStars } from './RatingStars';
import { ConfirmModal } from './ConfirmModal';
import { PersonDetailModal } from './PersonDetailModal';
import { ImageViewerModal } from './ImageViewerModal';
import { remoteImageSource } from '../utils/remoteImage';
import { getCriticRating, getListRating } from '../utils/ratings';
import { resolveDestination, resolveProviderLinks } from '../services/api/providerLinksService';

interface MediaDetailModalProps {
  item: MediaItem | null;
  visible: boolean;
  onClose: () => void;
  onAddComment?: (mediaId: string, text: string, rating: number) => void;
  currentUser?: { id: string; name: string; avatar: string };
  /** Personal watched state of the current user (not the shared item flag). */
  isWatched?: boolean;
  onToggleWatched?: (item: MediaItem) => void;
  onAddMedia?: (item: MediaItem) => void;
  /** Search preview of a work already in the target list: hide the add action. */
  isAlreadyInList?: boolean;
  embedded?: boolean;
  listOwnerId?: string;
  onDeleteItem?: (mediaId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: MediaItem) => void;
  onToggleTrackingNotification?: (item: MediaItem) => void;
  onRecommendToFriend?: (item: MediaItem) => void;
}

const formatReleaseDate = (isoOrYear?: string): string => {
  if (!isoOrYear) return '';
  if (/^\d{4}$/.test(isoOrYear.trim())) return isoOrYear.trim();
  try {
    const d = new Date(isoOrYear);
    if (isNaN(d.getTime())) return isoOrYear;
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoOrYear;
  }
};

const formatAddedDate = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  visible,
  onClose,
  onAddComment,
  currentUser,
  isWatched = false,
  onToggleWatched,
  onAddMedia,
  isAlreadyInList = false,
  embedded = false,
  listOwnerId,
  onDeleteItem,
  isFavorite = false,
  onToggleFavorite,
  onToggleTrackingNotification,
  onRecommendToFriend,
}) => {
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(5);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<CastMember | null>(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  // Proveedores con enlaces directos resueltos al abrir el detalle; solo en memoria, no se guardan en la lista.
  const [resolvedProviders, setResolvedProviders] = useState<{ itemId: string; providers: StreamingProvider[] } | null>(null);

  useEffect(() => {
    if (!item || !visible) return;
    const controller = new AbortController();
    resolveProviderLinks(item, controller.signal).then(resolved => {
      if (!controller.signal.aborted && resolved !== item) {
        setResolvedProviders({ itemId: item.id, providers: resolved.whereToWatchOrRead });
      }
    });
    return () => controller.abort();
  }, [item, visible]);

  if (!item || !visible) return null;

  const providers =
    resolvedProviders?.itemId === item.id ? resolvedProviders.providers : item.whereToWatchOrRead || [];

  const criticRating = getCriticRating(item);
  const listRating = getListRating(item);

  // Solo películas y series tienen ficha de persona en TMDB
  const isCastInteractive = item.category === 'movie' || item.category === 'series';
  const getCastMember = (name: string): CastMember =>
    item.castMembers?.find(member => member.name === name) || { name };

  const canDelete = Boolean(
    onDeleteItem &&
    currentUser?.id &&
    item &&
    (currentUser.id === item.addedBy?.id || currentUser.id === listOwnerId)
  );

  const handleDeletePress = () => {
    if (!item || !onDeleteItem) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    if (item && onDeleteItem) {
      onDeleteItem(item.id);
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(item.id, commentText.trim(), userRating);
    setCommentText('');
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(err => console.warn('Could not open link:', err));
  };

  const modalBody = (
    <View style={[styles.container, embedded && styles.embeddedContainer]}>
      {/* Backdrop or Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.topBarActions}>
          {onRecommendToFriend && (
            <TouchableOpacity
              onPress={() => onRecommendToFriend(item)}
              style={styles.detailRecommendTopBtn}
              accessibilityLabel="Recomendar a un amigo"
            >
              <Ionicons name="paper-plane-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
          )}
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(item)}
              style={styles.detailFavTopBtn}
              accessibilityLabel={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#EF4444" : "#94A3B8"}
              />
            </TouchableOpacity>
          )}
          {canDelete ? (
            <TouchableOpacity
              onPress={handleDeletePress}
              style={styles.deleteBtn}
              accessibilityLabel="Eliminar elemento de la lista"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            !onToggleFavorite && !onRecommendToFriend && <View style={{ width: 40 }} />
          )}
        </View>
      </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Info Hero */}
          <View style={styles.heroSection}>
            <TouchableOpacity
              onPress={() => setIsImageViewerVisible(true)}
              disabled={!item.posterUrl}
              activeOpacity={0.85}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Ampliar imagen de ${item.title}`}
            >
              <Image source={remoteImageSource(item.posterUrl)} style={styles.poster} resizeMode="cover" />
              {item.posterUrl ? (
                <View style={styles.posterZoomHint}>
                  <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.heroDetails}>
              <Text style={styles.title}>{item.title}</Text>
              {item.originalTitle && <Text style={styles.originalTitle}>{item.originalTitle}</Text>}
              <Text style={styles.metaRow}>
                {item.year ? `${item.year} • ` : ''}{item.category.toUpperCase()}
              </Text>

              {item.releaseDate ? (
                <View style={styles.releaseDateRow}>
                  <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                  <Text style={styles.releaseDateText}>
                    {item.category === 'book' || item.category === 'manga'
                      ? 'Publicación: '
                      : item.category === 'game' || item.category === 'boardgame'
                      ? 'Lanzamiento: '
                      : item.category === 'recipe'
                      ? 'Origen / Cocina: '
                      : item.category === 'place'
                      ? 'Fundación / Época: '
                      : 'Estreno: '}
                    {formatReleaseDate(item.releaseDate)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.ratingBox}>
                <Text style={styles.ratingLabel}>Crítica</Text>
                {criticRating !== null ? (
                  <RatingStars rating={criticRating} size={16} showText />
                ) : (
                  <Text style={styles.ratingsCount}>Sin puntuación</Text>
                )}
              </View>
              {!onAddMedia && (
                <View style={styles.ratingBox}>
                  <Text style={styles.ratingLabel}>Usuarios de la lista</Text>
                  {listRating.average !== null ? (
                    <>
                      <RatingStars rating={listRating.average} size={16} showText />
                      <Text style={styles.ratingsCount}>
                        ({listRating.count} {listRating.count === 1 ? 'voto' : 'votos'})
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.ratingsCount}>Aún sin votos: ¡califícala en los comentarios!</Text>
                  )}
                </View>
              )}

              {item.category === 'link' ? (
                <View style={[styles.manualTag, { backgroundColor: '#0284C720' }]}>
                  <Ionicons name="link" size={11} color="#38BDF8" />
                  <Text style={[styles.manualTagText, { color: '#38BDF8' }]}>
                    {item.siteName ? `Enlace de ${item.siteName}` : 'Enlace Web'}
                  </Text>
                </View>
              ) : item.isManualEntry ? (
                <View style={styles.manualTag}>
                  <Ionicons name="pencil" size={11} color="#A855F7" />
                  <Text style={styles.manualTagText}>Entrada Manual</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Primary Open Link Action */}
          {Boolean(item.url || item.externalLinks?.[0]?.url) && (
            <TouchableOpacity
              style={styles.openExternalPrimaryBtn}
              onPress={() => openUrl(item.url || item.externalLinks![0].url)}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color="#0F172A" />
              <Text style={styles.openExternalPrimaryText}>
                {item.category === 'link'
                  ? `Abrir enlace en ${item.siteName || 'el navegador'}`
                  : 'Abrir enlace externo'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Add to list CTA if in search preview mode */}
          {onAddMedia && isAlreadyInList && (
            <View style={styles.alreadyInListBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.alreadyInListText}>Ya en la lista</Text>
            </View>
          )}
          {onAddMedia && !isAlreadyInList && (
            <TouchableOpacity
              style={styles.addToListCtaBtn}
              onPress={() => {
                onAddMedia(item);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color="#0F172A" />
              <Text style={styles.addToListCtaBtnText}>Añadir a mi lista</Text>
            </TouchableOpacity>
          )}

          {/* Watched / Read / Played Toggle Button */}
          {!onAddMedia && onToggleWatched && (
            <TouchableOpacity
              style={[styles.watchedDetailBtn, isWatched && styles.watchedDetailBtnActive]}
              onPress={() => onToggleWatched(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isWatched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={isWatched ? '#10B981' : '#94A3B8'}
              />
              <Text style={[styles.watchedDetailBtnText, isWatched && styles.watchedDetailBtnTextActive]}>
                {isWatched
                  ? (item.category === 'link' || item.category === 'book' || item.category === 'manga'
                      ? '✓ Ya lo has leído'
                      : item.category === 'game' || item.category === 'boardgame'
                      ? '✓ Ya lo has jugado'
                      : item.category === 'podcast' || item.category === 'music'
                      ? '✓ Ya lo has escuchado'
                      : item.category === 'recipe'
                      ? '✓ Ya lo has cocinado'
                      : item.category === 'place'
                      ? '✓ Ya lo has visitado'
                      : '✓ Ya lo has visto')
                  : (item.category === 'link' || item.category === 'book' || item.category === 'manga'
                      ? 'Marcar como leído'
                      : item.category === 'game' || item.category === 'boardgame'
                      ? 'Marcar como jugado'
                      : item.category === 'podcast' || item.category === 'music'
                      ? 'Marcar como escuchado'
                      : item.category === 'recipe'
                      ? 'Marcar como cocinado'
                      : item.category === 'place'
                      ? 'Marcar como visitado'
                      : 'Marcar como visto')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Favorite Action Button */}
          {onToggleFavorite && (
            <TouchableOpacity
              style={[styles.favoriteDetailBtn, isFavorite && styles.favoriteDetailBtnActive]}
              onPress={() => onToggleFavorite(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={19}
                color={isFavorite ? '#EF4444' : '#94A3B8'}
              />
              <Text style={[styles.favoriteDetailBtnText, isFavorite && styles.favoriteDetailBtnTextActive]}>
                {isFavorite ? 'Obra guardada en tus favoritos' : 'Guardar en mis favoritos'}
              </Text>
            </TouchableOpacity>
          )}
          {/* Recommend to Friend Action Button */}
          {onRecommendToFriend && (
            <TouchableOpacity
              style={styles.recommendDetailBtn}
              onPress={() => onRecommendToFriend(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="paper-plane" size={17} color="#38BDF8" />
              <Text style={styles.recommendDetailBtnText}>
                Recomendar a un amigo
              </Text>
            </TouchableOpacity>
          )}

          {/* Sección de Seguimiento de Emisión / Próximo Estreno */}
          {(item.category === 'series' || item.category === 'manga') && (
            <View style={styles.trackingSection}>
              <View style={styles.trackingHeaderRow}>
                <Ionicons
                  name={item.category === 'series' ? 'tv-outline' : 'book-outline'}
                  size={18}
                  color="#38BDF8"
                />
                <Text style={styles.trackingHeaderTitle}>
                  {item.category === 'series' ? 'Estado de Emisión y Próximos Episodios' : 'Última Publicación'}
                </Text>
              </View>

              {item.category === 'series' && (
                <>
                  {item.trackingInfo?.nextEpisode ? (
                    <View style={styles.episodeDetailCard}>
                      <View style={styles.episodeBadgeRow}>
                        <View style={styles.episodeSeasonBadge}>
                          <Text style={styles.episodeSeasonText}>
                            Temporada {item.trackingInfo.nextEpisode.seasonNumber} • Episodio {item.trackingInfo.nextEpisode.episodeNumber}
                          </Text>
                        </View>
                        <View style={styles.episodeDateBadge}>
                          <Ionicons name="calendar-outline" size={12} color="#F59E0B" />
                          <Text style={styles.episodeDateText}>
                            {formatReleaseDate(item.trackingInfo.nextEpisode.airDate)}
                          </Text>
                        </View>
                      </View>

                      {Boolean(item.trackingInfo.nextEpisode.name) && (
                        <Text style={styles.episodeNameText}>
                          "{item.trackingInfo.nextEpisode.name}"
                        </Text>
                      )}

                      {Boolean(item.trackingInfo.nextEpisode.overview) && (
                        <Text style={styles.episodeOverviewText} numberOfLines={3}>
                          {item.trackingInfo.nextEpisode.overview}
                        </Text>
                      )}

                      {onToggleTrackingNotification && (
                        <TouchableOpacity
                          style={[
                            styles.reminderNotificationBtn,
                            item.trackingInfo.notificationsEnabled && styles.reminderNotificationBtnActive,
                          ]}
                          onPress={() => onToggleTrackingNotification(item)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={item.trackingInfo.notificationsEnabled ? 'notifications' : 'notifications-outline'}
                            size={18}
                            color={item.trackingInfo.notificationsEnabled ? '#F59E0B' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.reminderNotificationBtnText,
                              item.trackingInfo.notificationsEnabled && styles.reminderNotificationBtnTextActive,
                            ]}
                          >
                            {item.trackingInfo.notificationsEnabled
                              ? '🔔 Alerta de estreno activada (09:00 AM)'
                              : 'Avisarme el día del estreno'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noUpcomingCard}>
                      <Ionicons
                        name={item.trackingInfo?.status === 'Ended' ? 'checkmark-done-circle-outline' : 'time-outline'}
                        size={18}
                        color="#64748B"
                      />
                      <Text style={styles.noUpcomingText}>
                        {item.trackingInfo?.status === 'Ended'
                          ? 'Esta serie ha concluido su emisión.'
                          : 'No hay fechas confirmadas para el próximo episodio por ahora.'}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {item.category === 'manga' && (
                <>
                  {item.trackingInfo?.latestChapter ? (
                    <View style={styles.episodeDetailCard}>
                      <View style={styles.episodeBadgeRow}>
                        <View style={styles.episodeSeasonBadge}>
                          <Text style={styles.episodeSeasonText}>
                            Capítulo {item.trackingInfo.latestChapter.chapterNumber}
                          </Text>
                        </View>
                        {item.trackingInfo.latestChapter.publishAt && (
                          <View style={styles.episodeDateBadge}>
                            <Ionicons name="calendar-outline" size={12} color="#8B5CF6" />
                            <Text style={styles.episodeDateText}>
                              {formatReleaseDate(item.trackingInfo.latestChapter.publishAt.split('T')[0])}
                            </Text>
                          </View>
                        )}
                      </View>
                      {Boolean(item.trackingInfo.latestChapter.title) && (
                        <Text style={styles.episodeNameText}>
                          "{item.trackingInfo.latestChapter.title}"
                        </Text>
                      )}
                      <Text style={styles.mangaDexSourceText}>
                        Disponible en MangaDex
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.noUpcomingCard}>
                      <Ionicons name="time-outline" size={18} color="#64748B" />
                      <Text style={styles.noUpcomingText}>
                        Buscando novedades de capítulos en MangaDex...
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Director / Autor / Estudio */}
          {Boolean(item.director) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {item.category === 'book' || item.category === 'manga'
                  ? '✍️ Autor / Creador'
                  : item.category === 'game'
                  ? '🎮 Estudio / Desarrollador'
                  : item.category === 'boardgame'
                  ? '🎲 Diseñador / Editorial'
                  : item.category === 'podcast'
                  ? '🎙️ Host / Producción'
                  : item.category === 'music'
                  ? '🎵 Artista / Intérprete'
                  : item.category === 'recipe'
                  ? '🍳 Cocina / Origen'
                  : item.category === 'place'
                  ? '📍 Ubicación / Territorio'
                  : '🎬 Dirección / Creador'}
              </Text>
              <View style={styles.directorBadge}>
                <Ionicons
                  name={
                    item.category === 'book' || item.category === 'manga'
                      ? 'create-outline'
                      : item.category === 'game'
                      ? 'game-controller-outline'
                      : item.category === 'boardgame'
                      ? 'dice-outline'
                      : item.category === 'podcast'
                      ? 'mic-outline'
                      : item.category === 'music'
                      ? 'musical-notes-outline'
                      : item.category === 'recipe'
                      ? 'restaurant-outline'
                      : item.category === 'place'
                      ? 'location-outline'
                      : 'videocam-outline'
                  }
                  size={18}
                  color="#38BDF8"
                />
                <Text style={styles.directorText}>{item.director}</Text>
              </View>
            </View>
          )}

          {/* Cast / Reparto / Plataformas */}
          {Boolean(item.cast && item.cast.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {item.category === 'book' || item.category === 'manga'
                  ? '👥 Editorial / Colaboradores'
                  : item.category === 'game'
                  ? '🕹️ Plataformas Disponibles'
                  : item.category === 'boardgame'
                  ? '🎲 Jugadores y Mecánicas'
                  : item.category === 'recipe'
                  ? '🥗 Ingredientes Principales'
                  : item.category === 'music'
                  ? '🎸 Artistas y Créditos'
                  : item.category === 'place'
                  ? '🏛️ Atractivos y Características'
                  : '🌟 Reparto Principal'}
              </Text>
              <View style={styles.castContainer}>
                {item.cast!.map((person, idx) => isCastInteractive ? (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.castPill, styles.castPillInteractive]}
                    onPress={() => setSelectedPerson(getCastMember(person))}
                    accessibilityLabel={`Ver información de ${person}`}
                  >
                    {getCastMember(person).profileUrl ? (
                      <Image
                        source={remoteImageSource(getCastMember(person).profileUrl)}
                        style={styles.castAvatar}
                      />
                    ) : (
                      <Ionicons name="person-outline" size={13} color="#38BDF8" />
                    )}
                    <Text style={styles.castText}>{person}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#64748B" />
                  </TouchableOpacity>
                ) : (
                  <View key={idx} style={styles.castPill}>
                    <Ionicons
                      name={
                        item.category === 'game' 
                          ? 'hardware-chip-outline' 
                          : item.category === 'recipe'
                          ? 'nutrition-outline'
                          : item.category === 'boardgame'
                          ? 'people-outline'
                          : item.category === 'place'
                          ? 'pin-outline'
                          : 'person-outline'
                      }
                      size={13}
                      color="#38BDF8"
                    />
                    <Text style={styles.castText}>{person}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Where to watch / read / play */}
          {providers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {item.category === 'book' || item.category === 'manga'
                  ? '📖 Dónde Leerlo / Comprarlo'
                  : item.category === 'game' || item.category === 'boardgame'
                  ? '🎮 Dónde Jugarlo / Comprarlo'
                  : item.category === 'podcast' || item.category === 'music'
                  ? '🎧 Dónde Escucharlo'
                  : item.category === 'recipe'
                  ? '🍽️ Dónde Ver la Receta / Tutorial'
                  : item.category === 'place'
                  ? '🗺️ Cómo Llegar / Guía'
                  : '📺 Dónde Verlo en Streaming'}
              </Text>
              <View style={styles.providersContainer}>
                {providers.map(provider => {
                  const destination = resolveDestination(provider, item);
                  return (
                    <ProviderBadge
                      key={provider.id}
                      provider={provider}
                      category={item.category}
                      onPress={destination ? () => openUrl(destination) : undefined}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Synopsis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {item.category === 'link' 
                ? 'Notas & Descripción' 
                : item.category === 'recipe' 
                ? 'Preparación & Instrucciones' 
                : item.category === 'place'
                ? 'Historia & Guía Cultural'
                : 'Sinopsis & Resumen'}
            </Text>
            <MarkdownText content={item.synopsis} style={styles.synopsis} onLinkPress={openUrl} />
          </View>

          {/* External Links */}
          {item.externalLinks && item.externalLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enlaces Externos</Text>
              <View style={styles.linksRow}>
                {item.externalLinks.map((link, idx) => (
                  <TouchableOpacity key={idx} style={styles.linkButton} onPress={() => openUrl(link.url)}>
                    <Ionicons name="open-outline" size={14} color="#38BDF8" />
                    <Text style={styles.linkButtonText}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Added by with formatted date */}
          {!onAddMedia && item.addedBy && item.addedBy.id !== 'api' && (
            <View style={styles.addedByCard}>
              <Image source={remoteImageSource(item.addedBy.avatar)} style={styles.addedByAvatar} />
              <View style={styles.addedByInfo}>
                <Text style={styles.addedByTitle}>Recomendado a la lista por</Text>
                <Text style={styles.addedByName}>{item.addedBy.name}</Text>
                {item.addedAt ? (
                  <Text style={styles.addedByDate}>
                    Añadido el {formatAddedDate(item.addedAt)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Comments Section */}
          {!onAddMedia && onAddComment && (
            <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Ionicons name="chatbubbles" size={20} color="#38BDF8" />
              <Text style={styles.sectionTitle}>Comentarios de Amigos ({item.comments.length})</Text>
            </View>

            {/* New Comment Input */}
            <View style={styles.commentInputBox}>
              <Text style={styles.ratePrompt}>Tu valoración:</Text>
              <View style={styles.starPickerRow}>
                <RatingStars
                  rating={userRating}
                  size={24}
                  interactive
                  onRatingChange={setUserRating}
                  showText
                />
              </View>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Deja tu opinión, qué te pareció o una recomendación..."
                placeholderTextColor="#64748B"
                multiline
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={[styles.sendCommentBtn, !commentText.trim() && styles.disabledSendBtn]}
                onPress={handleSendComment}
                disabled={!commentText.trim()}
              >
                <Ionicons name="paper-plane" size={16} color="#0F172A" />
                <Text style={styles.sendCommentText}>Comentar y Calificar</Text>
              </TouchableOpacity>
            </View>

            {/* List of comments */}
            {item.comments.length === 0 ? (
              <Text style={styles.noCommentsText}>
                Aún no hay comentarios. ¡Sé el primero del grupo en opinar!
              </Text>
            ) : (
              item.comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <Image source={remoteImageSource(comment.userAvatar)} style={styles.commentAvatar} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.commentUserName}>{comment.userName}</Text>
                      {comment.rating && <RatingStars rating={comment.rating} size={11} />}
                    </View>
                    <Text style={styles.commentTextContent}>{comment.text}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        </ScrollView>
      </View>
  );

  const imageViewer = (
    <ImageViewerModal
      uri={item.posterUrl}
      visible={isImageViewerVisible}
      onClose={() => setIsImageViewerVisible(false)}
      accessibilityLabel={item.title}
    />
  );

  const personModal = selectedPerson && (
    <PersonDetailModal
      key={selectedPerson.id ?? selectedPerson.name}
      member={selectedPerson}
      visible
      onClose={() => setSelectedPerson(null)}
      onAddMedia={onAddMedia}
    />
  );

  if (embedded) {
    return (
      <>
        {modalBody}
        <ConfirmModal
          visible={showDeleteConfirm}
          title="Eliminar obra"
          message={`¿Estás seguro de que deseas eliminar "${item.title}" de esta lista?`}
          icon="trash-outline"
          destructive
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
        {personModal}
        {imageViewer}
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      {modalBody}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar obra"
        message={`¿Estás seguro de que deseas eliminar "${item.title}" de esta lista?`}
        icon="trash-outline"
        destructive
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {personModal}
      {imageViewer}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 45,
  },
  embeddedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#EF444422',
    borderWidth: 1,
    borderColor: '#EF444455',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailFavTopBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  heroSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  heroDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 24,
    marginBottom: 4,
  },
  originalTitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  metaRow: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  releaseDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  releaseDateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  posterZoomHint: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToListCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  alreadyInListBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  alreadyInListText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  addToListCtaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  directorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  directorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  castContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  castPillInteractive: {
    borderColor: '#38BDF855',
  },
  castAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  castText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  ratingBox: {
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ratingsCount: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  manualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#581C8722',
    borderWidth: 1,
    borderColor: '#A855F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  manualTagText: {
    fontSize: 10,
    color: '#D8B4FE',
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 10,
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  synopsis: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  linkButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  watchedDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  watchedDetailBtnActive: {
    backgroundColor: '#064E3B44',
    borderColor: '#10B981',
  },
  watchedDetailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  watchedDetailBtnTextActive: {
    color: '#10B981',
  },
  favoriteDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  favoriteDetailBtnActive: {
    backgroundColor: '#EF444422',
    borderColor: '#EF4444',
  },
  favoriteDetailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  favoriteDetailBtnTextActive: {
    color: '#EF4444',
  },
  addedByCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addedByAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  addedByInfo: {
    flex: 1,
  },
  addedByTitle: {
    fontSize: 11,
    color: '#64748B',
  },
  addedByName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  addedByDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 18,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  commentInputBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ratePrompt: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  starPickerRow: {
    marginBottom: 10,
  },
  commentTextInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: 10,
  },
  sendCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  disabledSendBtn: {
    opacity: 0.5,
  },
  sendCommentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  noCommentsText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 14,
  },
  commentItem: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#33415544',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  commentTextContent: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  openExternalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  openExternalPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  trackingSection: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trackingHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  episodeDetailCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  episodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  episodeSeasonBadge: {
    backgroundColor: '#38BDF822',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF855',
  },
  episodeSeasonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  episodeDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  episodeDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  episodeNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 6,
  },
  episodeOverviewText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  reminderNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  reminderNotificationBtnActive: {
    backgroundColor: '#F59E0B22',
    borderColor: '#F59E0B',
  },
  reminderNotificationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  reminderNotificationBtnTextActive: {
    color: '#F59E0B',
  },
  noUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  noUpcomingText: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 18,
  },
  mangaDexSourceText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 6,
  },
  detailRecommendTopBtn: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
    backgroundColor: '#0284C720',
  },
  recommendDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C720',
    borderWidth: 1,
    borderColor: '#38BDF850',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  recommendDetailBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
});

