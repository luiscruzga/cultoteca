import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { AVATAR_PRESETS, AvatarPreset } from '../constants/avatarPresets';
import { AvatarSearchResult, AvatarSearchService } from '../services/avatarSearchService';
import { UserAvatar } from './UserAvatar';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentAvatar?: string;
  userName: string;
  onSelectAvatar: (newAvatar?: string) => void;
  title?: string;
  subtitle?: string;
}

export interface AvatarDisplayItem {
  id: string;
  name: string;
  url: string;
  category?: string;
  source?: string;
}

type TabCategory = 'all' | 'anime' | 'cine_series' | 'graciosas' | 'clasicos';

interface AvatarSearchFieldProps {
  value: string;
  isSearching: boolean;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

// Focus state lives here, not in AvatarPickerModal: re-rendering the <Modal> on Android reapplies the
// dialog window flags (ReactModalHostView.updateProperties), which closes the keyboard and blurs
// the input right after it is tapped.
const AvatarSearchField: React.FC<AvatarSearchFieldProps> = ({ value, isSearching, onChangeText, onClear }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
      <Ionicons
        name="search"
        size={18}
        color={isFocused ? '#E50914' : '#94A3B8'}
        style={styles.searchIcon}
      />
      <TextInput
        style={[
          styles.searchInput,
          Platform.OS === 'web' && { outlineStyle: 'none' as any },
        ]}
        placeholder="Buscar personajes (Goku, Merlina, Walter, Batman)..."
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={false}
      />
      {isSearching ? (
        <ActivityIndicator size="small" color="#E50914" style={{ marginRight: 6 }} />
      ) : value.length > 0 ? (
        <TouchableOpacity onPress={onClear} style={styles.clearSearchBtn}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  onClose,
  currentAvatar,
  userName,
  onSelectAvatar,
  title = 'Galería de Avatares',
  subtitle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TabCategory>('all');
  const [activeAvatar, setActiveAvatar] = useState<string | undefined>(currentAvatar);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AvatarSearchResult[]>([]);

  useEffect(() => {
    setActiveAvatar(currentAvatar);
  }, [currentAvatar]);

  // Live search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await AvatarSearchService.search(searchQuery.trim());
        setSearchResults(results);
      } catch (e) {
        console.warn('Avatar search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const categories: { key: TabCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'Todos', icon: 'grid-outline' },
    { key: 'anime', label: 'Anime & Manga', icon: 'flash-outline' },
    { key: 'cine_series', label: 'Cine & Series', icon: 'film-outline' },
    { key: 'graciosas', label: 'Divertidas', icon: 'happy-outline' },
    { key: 'clasicos', label: 'Clásicos', icon: 'videocam-outline' },
  ];

  const presetsToDisplay: AvatarDisplayItem[] =
    selectedCategory === 'all'
      ? AVATAR_PRESETS
      : AVATAR_PRESETS.filter(p => p.category === selectedCategory);

  const isSearchActive = searchQuery.trim().length >= 2;
  const itemsToDisplay: AvatarDisplayItem[] = isSearchActive ? searchResults : presetsToDisplay;

  const handleChoose = (url?: string) => {
    setActiveAvatar(url);
    onSelectAvatar(url);
    onClose();
  };

  const handleUseInitials = () => {
    setActiveAvatar(undefined);
    onSelectAvatar(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={18} color="#E50914" />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Active Preview Banner */}
          <View style={styles.previewCard}>
            <View style={styles.previewAvatarContainer}>
              <UserAvatar
                name={userName}
                avatar={activeAvatar}
                size={62}
                borderColor="#E50914"
                borderWidth={2.5}
              />
            </View>
            <View style={styles.previewDetails}>
              <Text style={styles.previewName}>{userName}</Text>
              <Text style={styles.previewSubtitle}>
                {subtitle || (activeAvatar ? 'Ícono/Avatar activo' : 'Mostrando iniciales por defecto')}
              </Text>
              <TouchableOpacity style={styles.initialsActionBtn} onPress={handleUseInitials}>
                <Ionicons name="text-outline" size={14} color="#38BDF8" />
                <Text style={styles.initialsActionText}>Usar solo mis iniciales</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Search Bar */}
          <View style={styles.searchContainer}>
            <AvatarSearchField
              value={searchQuery}
              isSearching={isSearching}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </View>

          {/* Horizontal Category Filter Pills (When not searching) */}
          {!isSearchActive && (
            <View style={styles.categoryPillsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsContainer}
              >
                {categories.map(cat => {
                  const isActive = selectedCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.pillBtn, isActive && styles.pillBtnActive]}
                      onPress={() => setSelectedCategory(cat.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={14}
                        color={isActive ? '#FFFFFF' : '#94A3B8'}
                      />
                      <Text style={[styles.pillBtnText, isActive && styles.pillBtnTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search Result Status Label */}
          {isSearchActive && (
            <View style={styles.searchStatusHeader}>
              <Text style={styles.searchStatusText}>
                {isSearching
                  ? 'Buscando personajes...'
                  : `${searchResults.length} personajes encontrados para «${searchQuery}»`}
              </Text>
            </View>
          )}

          {/* Presets / Search Results Grid */}
          <FlatList
            data={itemsToDisplay}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              !isSearching && isSearchActive ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={36} color="#64748B" />
                  <Text style={styles.emptyTitle}>Sin resultados</Text>
                  <Text style={styles.emptySubtitle}>
                    No encontramos personajes con «{searchQuery}». Intenta con otro término (ej. Naruto, Luffy, Walter, Neo).
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = activeAvatar === item.url;
              return (
                <TouchableOpacity
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  onPress={() => handleChoose(item.url)}
                  activeOpacity={0.8}
                >
                  <View style={styles.presetAvatarWrapper}>
                    <UserAvatar name={item.name} avatar={item.url} size={70} />
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.presetName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  previewAvatarContainer: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  previewDetails: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
  },
  initialsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  initialsActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 42,
  },
  // No elevation/shadow: toggling them on the input's container on Android drops the keyboard.
  searchBarFocused: {
    borderColor: '#E50914',
    backgroundColor: '#111C33',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryPillsWrapper: {
    marginBottom: 10,
  },
  categoryPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  searchStatusHeader: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  searchStatusText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  presetCard: {
    flex: 1 / 3,
    alignItems: 'center',
    padding: 10,
    margin: 4,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  presetCardSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  presetAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  presetName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 10,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
