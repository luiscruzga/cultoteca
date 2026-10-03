import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CastMember, MediaItem, PersonDetails } from '../types';
import { enrichTmdbItem, fetchTmdbPersonDetails } from '../services/api/tmdbService';
import { MediaDetailModal } from './MediaDetailModal';
import { remoteImageSource } from '../utils/remoteImage';

interface PersonDetailModalProps {
  member: CastMember | null;
  visible: boolean;
  onClose: () => void;
  onAddMedia?: (item: MediaItem) => void;
}

type CreditFilter = 'all' | 'movie' | 'series';

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Interpretación',
  Directing: 'Dirección',
  Writing: 'Guion',
  Production: 'Producción',
  Sound: 'Música y sonido',
  Camera: 'Fotografía',
  Editing: 'Montaje',
  Art: 'Dirección de arte',
  Creator: 'Creación',
};

const formatDate = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getAge = (birthday?: string, deathday?: string): number | null => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  if (isNaN(birth.getTime()) || isNaN(end.getTime())) return null;
  let age = end.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    end.getMonth() < birth.getMonth() ||
    (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  member,
  visible,
  onClose,
  onAddMedia,
}) => {
  // Resultado asociado a la persona solicitada; si no coincide con `member` se está cargando
  const [loaded, setLoaded] = useState<{ member: CastMember; person: PersonDetails | null } | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [filter, setFilter] = useState<CreditFilter>('all');
  const [selectedWork, setSelectedWork] = useState<MediaItem | null>(null);
  const selectedWorkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !member) return;
    let cancelled = false;
    fetchTmdbPersonDetails(member).then(result => {
      if (!cancelled) setLoaded({ member, person: result });
    });
    return () => {
      cancelled = true;
    };
  }, [visible, member]);

  if (!visible || !member) return null;

  // Los proveedores y el reparto de la obra se cargan al abrir su detalle
  const openWork = (work: MediaItem) => {
    selectedWorkIdRef.current = work.id;
    setSelectedWork(work);
    enrichTmdbItem(work).then(enriched => {
      if (selectedWorkIdRef.current === work.id) setSelectedWork(enriched);
    });
  };

  const closeWork = () => {
    selectedWorkIdRef.current = null;
    setSelectedWork(null);
  };

  const isLoading = loaded?.member !== member;
  const person = isLoading ? null : loaded.person;
  const photoUrl = person?.profileUrl || member.profileUrl;
  const name = person?.name || member.name;
  const age = getAge(person?.birthday, person?.deathday);
  const credits = (person?.credits || []).filter(
    c => filter === 'all' || c.item.category === filter
  );
  const movieCount = person?.credits.filter(c => c.item.category === 'movie').length || 0;
  const seriesCount = person?.credits.filter(c => c.item.category === 'series').length || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} accessibilityLabel="Volver">
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            {photoUrl ? (
              <Image source={remoteImageSource(photoUrl)} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoInitials}>{getInitials(name)}</Text>
              </View>
            )}
            <View style={styles.heroDetails}>
              <Text style={styles.name}>{name}</Text>
              {member.character ? (
                <Text style={styles.characterText} numberOfLines={2}>
                  como {member.character}
                </Text>
              ) : null}
              {person?.knownForDepartment && (
                <View style={styles.infoRow}>
                  <Ionicons name="briefcase-outline" size={13} color="#38BDF8" />
                  <Text style={styles.infoText}>
                    {DEPARTMENT_LABELS[person.knownForDepartment] || person.knownForDepartment}
                  </Text>
                </View>
              )}
              {person?.birthday && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={13} color="#38BDF8" />
                  <Text style={styles.infoText}>
                    {formatDate(person.birthday)}
                    {age !== null && !person.deathday ? ` (${age} años)` : ''}
                  </Text>
                </View>
              )}
              {person?.deathday && (
                <View style={styles.infoRow}>
                  <Ionicons name="flower-outline" size={13} color="#38BDF8" />
                  <Text style={styles.infoText}>
                    {formatDate(person.deathday)}
                    {age !== null ? ` (${age} años)` : ''}
                  </Text>
                </View>
              )}
              {person?.placeOfBirth && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={13} color="#38BDF8" />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {person.placeOfBirth}
                  </Text>
                </View>
              )}
              {person && (
                <TouchableOpacity
                  style={styles.tmdbLink}
                  onPress={() => Linking.openURL(person.tmdbUrl).catch(() => {})}
                >
                  <Ionicons name="open-outline" size={13} color="#38BDF8" />
                  <Text style={styles.tmdbLinkText}>Ver en TMDB</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.stateText}>Cargando información de {member.name}...</Text>
            </View>
          ) : !person ? (
            <View style={styles.stateBox}>
              <Ionicons name="person-circle-outline" size={42} color="#475569" />
              <Text style={styles.stateText}>
                No encontramos más información sobre {member.name} en este momento.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📖 Biografía</Text>
                {person.biography ? (
                  <>
                    <Text style={styles.bioText} numberOfLines={bioExpanded ? undefined : 6}>
                      {person.biography}
                    </Text>
                    {person.biography.length > 320 && (
                      <TouchableOpacity onPress={() => setBioExpanded(v => !v)}>
                        <Text style={styles.readMore}>{bioExpanded ? 'Ver menos' : 'Leer más'}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text style={styles.mutedText}>Biografía no disponible.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎬 Películas y Series</Text>
                {person.credits.length > 0 && (
                  <View style={styles.filterRow}>
                    {(
                      [
                        { key: 'all', label: `Todo (${person.credits.length})` },
                        { key: 'movie', label: `Películas (${movieCount})` },
                        { key: 'series', label: `Series (${seriesCount})` },
                      ] as { key: CreditFilter; label: string }[]
                    ).map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setFilter(opt.key)}
                        style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
                      >
                        <Text
                          style={[styles.filterChipText, filter === opt.key && styles.filterChipTextActive]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {credits.length === 0 ? (
                  <Text style={styles.mutedText}>Sin obras registradas.</Text>
                ) : (
                  <View style={styles.creditsGrid}>
                    {credits.map(({ item, character }) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.creditCard}
                        onPress={() => openWork(item)}
                        accessibilityLabel={`Ver ${item.title}`}
                      >
                        <Image source={remoteImageSource(item.posterUrl)} style={styles.creditPoster} resizeMode="cover" />
                        <View style={styles.creditTypeBadge}>
                          <Ionicons
                            name={item.category === 'movie' ? 'film-outline' : 'tv-outline'}
                            size={10}
                            color="#F8FAFC"
                          />
                        </View>
                        <Text style={styles.creditTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.creditMeta} numberOfLines={1}>
                          {item.releaseDate ? `${item.year}` : 'Próximamente'}
                          {character ? ` · ${character}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {selectedWork && (
        <MediaDetailModal
          item={selectedWork}
          visible={Boolean(selectedWork)}
          onClose={closeWork}
          onAddMedia={
            onAddMedia
              ? work => {
                  closeWork();
                  onAddMedia(work);
                }
              : undefined
          }
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 45,
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  heroSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 170,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    fontSize: 36,
    fontWeight: '800',
    color: '#38BDF8',
  },
  heroDetails: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 26,
  },
  characterText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  tmdbLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#38BDF815',
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  tmdbLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  stateText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#CBD5E1',
  },
  readMore: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  mutedText: {
    fontSize: 13,
    color: '#64748B',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  filterChipTextActive: {
    color: '#0F172A',
  },
  creditsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    rowGap: 14,
  },
  creditCard: {
    width: '33.333%',
    paddingHorizontal: 5,
  },
  creditPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    marginBottom: 6,
  },
  creditTypeBadge: {
    position: 'absolute',
    top: 6,
    right: 11,
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#0F172ACC',
  },
  creditTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
    lineHeight: 15,
  },
  creditMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
