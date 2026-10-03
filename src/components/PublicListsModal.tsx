import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, MediaCategory, UserProfile } from '../types';
import { remoteImageSource } from '../utils/remoteImage';
import { StorageService } from '../services/storageService';

interface PublicListsModalProps {
  visible: boolean;
  onClose: () => void;
  lists: CollaborativeList[];
  currentUser: UserProfile | null;
  onSelectList: (list: CollaborativeList) => void;
  onJoinList?: (list: CollaborativeList) => void;
  followedListIds?: string[];
  onToggleFollow?: (listId: string) => void;
}

const CATEGORY_CHIPS: { id: MediaCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'Todas', icon: 'apps-outline' },
  { id: 'movie', label: 'Cine', icon: 'film-outline' },
  { id: 'series', label: 'Series', icon: 'tv-outline' },
  { id: 'anime', label: 'Anime', icon: 'sparkles-outline' },
  { id: 'manga', label: 'Manga', icon: 'book-outline' },
  { id: 'book', label: 'Libros', icon: 'library-outline' },
  { id: 'game', label: 'Gaming', icon: 'game-controller-outline' },
  { id: 'link', label: 'Enlaces', icon: 'link-outline' },
];

export const PublicListsModal: React.FC<PublicListsModalProps> = ({
  visible,
  onClose,
  lists,
  currentUser,
  onSelectList,
  onJoinList,
  followedListIds,
  onToggleFollow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory | 'all'>('all');

  const publicLists = useMemo(() => {
    return lists.filter(l => l.isPublic);
  }, [lists]);

  const filteredLists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publicLists.filter(list => {
      const matchCat = selectedCategory === 'all' || list.category === selectedCategory;
      const matchText =
        !q ||
        list.title.toLowerCase().includes(q) ||
        list.description.toLowerCase().includes(q) ||
        list.owner.name.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [publicLists, searchQuery, selectedCategory]);

  const renderItem = ({ item }: { item: CollaborativeList }) => {
    const isOwner = currentUser?.id === item.owner.id;
    const isMember = item.collaborators.some(c => c.id === currentUser?.id);
    const isFollowed = isMember || (followedListIds?.includes(item.id) ?? false);
    const canContribute = StorageService.canUserContribute(item, currentUser?.id, followedListIds);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          onSelectList(item);
          onClose();
        }}
      >
        {item.coverImage ? (
          <Image source={remoteImageSource(item.coverImage)} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="film" size={28} color="#636366" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.publicBadge}>
              <Ionicons name="globe-outline" size={11} color="#30D158" />
              <Text style={styles.publicBadgeText}>Pública</Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Badges / Policies */}
          <View style={styles.tagsRow}>
            <View style={styles.itemCountTag}>
              <Ionicons name="layers-outline" size={12} color="#8E8E93" />
              <Text style={styles.tagText}>{item.items.length} obras</Text>
            </View>

            {item.allowContributions === false ? (
              <View style={[styles.policyTag, { backgroundColor: 'rgba(255, 69, 58, 0.12)' }]}>
                <Ionicons name="lock-closed" size={11} color="#FF453A" />
                <Text style={[styles.tagText, { color: '#FF453A' }]}>Solo el dueño aporta</Text>
              </View>
            ) : (
              <View style={[styles.policyTag, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
                <Ionicons name="people" size={11} color="#30D158" />
                <Text style={[styles.tagText, { color: '#30D158' }]}>Abierta a suscriptores</Text>
              </View>
            )}
          </View>

          {/* Owner row */}
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{item.owner.name.charAt(0)}</Text>
            </View>
            <Text style={styles.ownerName} numberOfLines={1}>
              Curada por <Text style={{ fontWeight: '700', color: '#FFF' }}>{item.owner.name}</Text>
            </Text>
            {isOwner ? (
              <View style={styles.ownerTag}>
                <Text style={styles.ownerTagText}>Tuya</Text>
              </View>
            ) : onToggleFollow ? (
              <TouchableOpacity
                style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                onPress={e => {
                  e.stopPropagation();
                  onToggleFollow(item.id);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFollowed ? 'bookmark' : 'bookmark-outline'}
                  size={12}
                  color={isFollowed ? '#F59E0B' : '#94A3B8'}
                />
                <Text
                  style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}
                >
                  {isFollowed ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="compass" size={20} color="#FF9F0A" />
              </View>
              <View>
                <Text style={styles.title}>Explorar Listas Públicas</Text>
                <Text style={styles.subtitle}>
                  {publicLists.length} curadurías comunitarias disponibles
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por título, temática o curador..."
              placeholderTextColor="#636366"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Category Chips Horizontal Scroll */}
          <View style={styles.chipsWrapper}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORY_CHIPS}
              keyExtractor={c => c.id}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              renderItem={({ item }) => {
                const active = selectedCategory === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(item.id)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={active ? '#FFF' : '#8E8E93'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* List items */}
          <FlatList
            data={filteredLists}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={54} color="#3A3A3C" />
                <Text style={styles.emptyTitle}>No hay listas que coincidan</Text>
                <Text style={styles.emptySubtitle}>
                  Prueba cambiando el filtro de categoría o los términos de búsqueda.
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  chipsWrapper: {
    marginVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: '#E50914',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardImage: {
    width: 105,
    height: '100%',
    minHeight: 120,
    backgroundColor: '#3A3A3C',
  },
  cardImagePlaceholder: {
    width: 105,
    minHeight: 120,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 6,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  publicBadgeText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  itemCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  policyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ownerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  ownerAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  ownerName: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
  ownerTag: {
    backgroundColor: 'rgba(255, 159, 10, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ownerTagText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  followBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  followBtnTextActive: {
    color: '#F59E0B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
});
