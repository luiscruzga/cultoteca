import React from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, DirectRecommendation, MediaItem } from '../types';
import { FeedEntry, HomeFeed as HomeFeedData } from '../services/homeFeedService';
import { getCriticRating, getListRating } from '../utils/ratings';
import { remoteImageSource } from '../utils/remoteImage';
import { SkeletonBlock } from './Skeleton';

interface HomeFeedProps {
  feed: HomeFeedData;
  userName: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenItem: (entry: FeedEntry) => void;
  onOpenList: (list: CollaborativeList) => void;
  onOpenRecommendations: () => void;
  onExplore: () => void;
}

const timeAgo = (iso?: string) => {
  const diff = iso ? Date.now() - Date.parse(iso) : NaN;
  if (!Number.isFinite(diff)) return '';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
};

const ratingLabel = (item: MediaItem) => {
  const list = getListRating(item).average;
  if (list !== null) return { value: list, icon: 'people' as const };
  const critic = getCriticRating(item);
  return critic !== null ? { value: critic, icon: 'star' as const } : null;
};

const Section: React.FC<{ title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
  children,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color="#38BDF8" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    {children}
  </View>
);

const PosterCard: React.FC<{ entry: FeedEntry; caption?: string; rank?: number; onPress: () => void }> = ({
  entry,
  caption,
  rank,
  onPress,
}) => {
  const rating = ratingLabel(entry.item);
  return (
    <TouchableOpacity style={styles.posterCard} onPress={onPress} activeOpacity={0.85}>
      <View>
        <Image source={remoteImageSource(entry.item.posterUrl)} style={styles.poster} resizeMode="cover" />
        {rank !== undefined && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
        )}
        {rating && (
          <View style={styles.posterRating}>
            <Ionicons name={rating.icon} size={10} color={rating.icon === 'star' ? '#F59E0B' : '#38BDF8'} />
            <Text style={styles.posterRatingText}>{rating.value.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.posterTitle} numberOfLines={2}>
        {entry.item.title}
      </Text>
      <Text style={styles.posterCaption} numberOfLines={1}>
        {caption ?? entry.list.title}
      </Text>
    </TouchableOpacity>
  );
};

const Carousel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
    {children}
  </ScrollView>
);

const HomeFeedSkeleton = () => (
  <View style={{ paddingHorizontal: 18 }}>
    {[0, 1].map(section => (
      <View key={section} style={{ marginBottom: 24, gap: 10 }}>
        <SkeletonBlock width="45%" height={16} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ gap: 6 }}>
              <SkeletonBlock width={110} height={160} radius={12} />
              <SkeletonBlock width={90} height={12} />
            </View>
          ))}
        </View>
      </View>
    ))}
  </View>
);

export const HomeFeed: React.FC<HomeFeedProps> = ({
  feed,
  userName,
  loading,
  refreshing,
  onRefresh,
  onOpenItem,
  onOpenList,
  onOpenRecommendations,
  onExplore,
}) => {
  const isEmpty =
    !feed.news.length && !feed.trending.length && !feed.forYou.length && !feed.nextUp.length &&
    !feed.friendRecommendations.length && !feed.featuredLists.length;
  const unreadRecs = feed.friendRecommendations.filter(r => !r.read).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" colors={['#38BDF8']} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Hola, {userName.split(' ')[0]} 👋</Text>
        <Text style={styles.heroSubtitle}>Esto es lo que se mueve en tu comunidad cultural.</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="sparkles-outline" size={13} color="#38BDF8" />
            <Text style={styles.statText}>{feed.news.length} novedades</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="hourglass-outline" size={13} color="#F59E0B" />
            <Text style={styles.statText}>{feed.nextUp.length} pendientes top</Text>
          </View>
          {unreadRecs > 0 && (
            <TouchableOpacity style={styles.statPill} onPress={onOpenRecommendations}>
              <Ionicons name="gift-outline" size={13} color="#F472B6" />
              <Text style={styles.statText}>{unreadRecs} recomendaciones nuevas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <HomeFeedSkeleton />
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="planet-outline" size={52} color="#38BDF8" />
          <Text style={styles.emptyTitle}>Tu portada está por llenarse</Text>
          <Text style={styles.emptyText}>Crea una lista o sigue listas públicas para ver novedades, tendencias y recomendaciones.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onExplore}>
            <Ionicons name="compass-outline" size={16} color="#0F172A" />
            <Text style={styles.emptyBtnText}>Explorar listas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {feed.news.length > 0 && (
            <Section title="Novedades en tus listas" subtitle="Lo último que agregaron tus amigos y las listas que sigues" icon="flash-outline">
              {feed.news.slice(0, 5).map(entry => (
                <TouchableOpacity key={`${entry.list.id}-${entry.item.id}`} style={styles.newsRow} onPress={() => onOpenItem(entry)}>
                  <Image source={remoteImageSource(entry.item.posterUrl)} style={styles.newsPoster} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.newsText} numberOfLines={2}>
                      <Text style={styles.newsActor}>{entry.item.addedBy.name}</Text> agregó{' '}
                      <Text style={styles.newsActor}>«{entry.item.title}»</Text>
                    </Text>
                    <Text style={styles.newsMeta} numberOfLines={1}>
                      {entry.list.title} · {timeAgo(entry.item.addedAt)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#475569" />
                </TouchableOpacity>
              ))}
            </Section>
          )}

          {feed.trending.length > 0 && (
            <Section
              title="Lo más recomendado"
              subtitle="Ranking por valoración de la comunidad, presencia en listas y actividad reciente"
              icon="trending-up-outline"
            >
              <Carousel>
                {feed.trending.map((entry, index) => (
                  <PosterCard
                    key={`${entry.list.id}-${entry.item.id}`}
                    entry={entry}
                    rank={index + 1}
                    caption={entry.listsCount > 1 ? `En ${entry.listsCount} listas` : entry.list.title}
                    onPress={() => onOpenItem(entry)}
                  />
                ))}
              </Carousel>
            </Section>
          )}

          {feed.friendRecommendations.length > 0 && (
            <Section title="Te recomendaron tus amigos" icon="gift-outline">
              <Carousel>
                {feed.friendRecommendations.map((rec: DirectRecommendation) => (
                  <TouchableOpacity key={rec.id} style={styles.posterCard} onPress={onOpenRecommendations} activeOpacity={0.85}>
                    <View>
                      <Image source={remoteImageSource(rec.item.posterUrl)} style={styles.poster} resizeMode="cover" />
                      {!rec.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.posterTitle} numberOfLines={2}>
                      {rec.item.title}
                    </Text>
                    <Text style={styles.posterCaption} numberOfLines={1}>
                      de {rec.fromUser.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Carousel>
            </Section>
          )}

          {feed.forYou.length > 0 && (
            <Section title="Para ti" subtitle="Según los tipos y géneros que más agregas" icon="heart-outline">
              <Carousel>
                {feed.forYou.map(entry => (
                  <PosterCard key={`${entry.list.id}-${entry.item.id}`} entry={entry} onPress={() => onOpenItem(entry)} />
                ))}
              </Carousel>
            </Section>
          )}

          {feed.nextUp.length > 0 && (
            <Section title="Tu próxima obra" subtitle="Pendientes de tus listas mejor valorados" icon="play-circle-outline">
              <Carousel>
                {feed.nextUp.map(entry => (
                  <PosterCard key={`${entry.list.id}-${entry.item.id}`} entry={entry} onPress={() => onOpenItem(entry)} />
                ))}
              </Carousel>
            </Section>
          )}

          {feed.featuredLists.length > 0 && (
            <Section title="Listas destacadas" subtitle="Comunidades activas que quizá te interesen" icon="ribbon-outline">
              {feed.featuredLists.map(({ list, contributorsCount, recentAdds }) => (
                <TouchableOpacity key={list.id} style={styles.listRow} onPress={() => onOpenList(list)}>
                  <Image source={remoteImageSource(list.coverImage)} style={styles.listCover} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {list.title}
                    </Text>
                    <Text style={styles.listMeta} numberOfLines={1}>
                      {list.items.length} obras · {contributorsCount} aportantes
                      {recentAdds > 0 ? ` · ${recentAdds} nuevas` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#475569" />
                </TouchableOpacity>
              ))}
            </Section>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 18,
    marginTop: 2,
  },
  carousel: {
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 12,
  },
  posterCard: {
    width: 112,
  },
  poster: {
    width: 112,
    height: 164,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  posterRating: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  posterRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F472B6',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  posterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 6,
  },
  posterCaption: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  newsPoster: {
    width: 40,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  newsText: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  newsActor: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  newsMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listCover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  listMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyBtnText: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
