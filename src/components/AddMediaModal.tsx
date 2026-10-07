import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MIN_SEARCH_QUERY_LENGTH, searchMedia } from '../services/api/mediaSearchService';
import { isAbortError } from '../services/api/requestController';
import { enrichTmdbItem, isTmdbSearchItem } from '../services/api/tmdbService';
import { resolveProviderLinks } from '../services/api/providerLinksService';
import {
  buildLinkMediaItem,
  fetchLinkPreview,
  LinkPreviewData,
  normalizeUrl,
} from '../services/api/linkPreviewService';
import { CustomCategory, ListContentType, MediaCategory, MediaItem, StreamingProvider } from '../types';
import { ALL_LIST_CONTENT_TYPES, allowsAllCategories, getSearchableCategories } from '../utils/listCategories';
import { ProviderBadge } from './ProviderBadge';
import { RatingStars } from './RatingStars';
import { SearchLoadingSkeleton } from './SearchLoadingSkeleton';
import { MediaDetailModal } from './MediaDetailModal';
import { remoteImageSource } from '../utils/remoteImage';
import { isItemInList } from '../utils/mediaIdentity';
import { PointsToastHost } from './PointsToast';

interface AddMediaModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMedia: (item: MediaItem) => void;
  currentUser: { id: string; name: string; avatar?: string };
  defaultCategory?: MediaCategory | 'all';
  customCategories?: CustomCategory[];
  onAddCustomCategory?: (label: string) => void;
  onRecommendDirectly?: (item: MediaItem) => void;
  /** Content types accepted by the target list; omit to allow everything. */
  allowedCategories?: ListContentType[];
  /** Items already in the target list: matching search results can't be added again. */
  existingItems?: MediaItem[];
}

const SEARCH_DEBOUNCE_MS = 2000;
const PROVIDER_LINKS_TIMEOUT_MS = 3000;

const CATEGORIES: { key: MediaCategory; label: string; icon: string }[] = [
  { key: 'movie', label: 'Película', icon: 'film' },
  { key: 'series', label: 'Serie', icon: 'tv' },
  { key: 'book', label: 'Libro', icon: 'book' },
  { key: 'anime', label: 'Anime', icon: 'flash' },
  { key: 'manga', label: 'Manga', icon: 'albums' },
  { key: 'game', label: 'Videojuego', icon: 'game-controller' },
  { key: 'boardgame', label: 'Juego de mesa', icon: 'dice' },
  { key: 'podcast', label: 'Pódcast', icon: 'mic' },
  { key: 'music', label: 'Música', icon: 'musical-notes' },
  { key: 'recipe', label: 'Receta', icon: 'restaurant' },
  { key: 'place', label: 'Lugar', icon: 'location' },
  { key: 'link', label: 'Enlace', icon: 'link' },
];

interface SearchInputFieldProps {
  value: string;
  isSearching: boolean;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onClear: () => void;
}

// Focus state lives here, not in AddMediaModal: re-rendering the <Modal> on Android reapplies the
// dialog window flags (ReactModalHostView.updateProperties), which closes the keyboard and blurs
// the input right after it is tapped.
const SearchInputField = React.forwardRef<TextInput, SearchInputFieldProps>(
  ({ value, isSearching, onChangeText, onSubmitEditing, onClear }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
      <View style={[styles.searchInputContainer, isFocused && styles.searchInputContainerFocused]}>
        <Ionicons
          name="search-outline"
          size={20}
          color={isFocused ? '#38BDF8' : '#94A3B8'}
          style={styles.searchIcon}
        />
        <TextInput
          ref={ref}
          style={styles.searchInput}
          placeholder="Busca película, anime, libro, manga..."
          placeholderTextColor="#64748B"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="search"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value.length > 0 && !isSearching && (
          <TouchableOpacity onPress={onClear} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
        {isSearching && <ActivityIndicator size="small" color="#38BDF8" />}
      </View>
    );
  }
);

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  visible,
  onClose,
  onAddMedia,
  currentUser,
  defaultCategory = 'all',
  customCategories = [],
  onAddCustomCategory,
  onRecommendDirectly,
  allowedCategories = ALL_LIST_CONTENT_TYPES,
  existingItems = [],
}) => {
  const [preferredTab, setTab] = useState<'search' | 'link' | 'manual'>('search');
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const newCatInputRef = useRef<TextInput>(null);

  // autoFocus inside an animating Modal loses focus on Android (keyboard never opens and later
  // taps are ignored), so inputs are focused programmatically once the modal/input is on screen.
  const focusAfterRender = (ref: React.RefObject<TextInput | null>) => {
    setTimeout(() => ref.current?.focus(), 100);
  };

  // Only the list's allowed types are offered, and only their providers are queried.
  const allowOther = allowedCategories.includes('other');
  const isRestricted = !allowsAllCategories(allowedCategories);
  const searchableCategories = getSearchableCategories(allowedCategories);
  const customCategoryOptions = allowOther
    ? customCategories.map(c => ({
        key: c.label as MediaCategory,
        label: c.label,
        icon: c.icon || 'bookmark',
      }))
    : [];
  const searchCategoryOptions = [
    ...CATEGORIES.filter(c => (searchableCategories as MediaCategory[]).includes(c.key)),
    ...customCategoryOptions,
  ];
  const allCategories = [
    ...CATEGORIES.filter(c => allowedCategories.includes(c.key as ListContentType)),
    ...customCategoryOptions,
    ...(allowOther ? [{ key: 'other' as MediaCategory, label: 'Otro', icon: 'sparkles' }] : []),
  ];
  const availableTabs = [
    ...(searchableCategories.length > 0 ? (['search'] as const) : []),
    ...(allowedCategories.includes('link') ? (['link'] as const) : []),
    ...(allCategories.length > 0 || allowOther ? (['manual'] as const) : []),
  ];
  const tab = availableTabs.includes(preferredTab as never) ? preferredTab : availableTabs[0] ?? 'manual';

  const handleCreateCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (onAddCustomCategory) {
      onAddCustomCategory(trimmed);
    }
    setSelectedCategory(trimmed);
    setManualCategory(trimmed);
    setNewCatInput('');
    setShowAddCatInput(false);
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [preferredCategory, setSelectedCategory] = useState<MediaCategory | 'all'>(defaultCategory);
  const selectedCategory: MediaCategory | 'all' =
    preferredCategory === 'all' || searchCategoryOptions.some(c => c.key === preferredCategory)
      ? preferredCategory
      : 'all';
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const previewIdRef = useRef<string | null>(null);

  // Los proveedores y el reparto de TMDB se piden solo al abrir el detalle
  const openPreview = (item: MediaItem) => {
    previewIdRef.current = item.id;
    setPreviewItem(item);
    if (!isTmdbSearchItem(item)) return;
    enrichTmdbItem(item).then(enriched => {
      if (previewIdRef.current === item.id) setPreviewItem(enriched);
    });
  };

  const closePreview = () => {
    previewIdRef.current = null;
    setPreviewItem(null);
  };

  // Antes de añadir o recomendar, completa los datos de TMDB y los enlaces directos de cada
  // plataforma para no guardar el item incompleto; si los enlaces tardan, se guarda sin ellos.
  const withFullDetails = async (item: MediaItem, action: (full: MediaItem) => void) => {
    if (pendingItemId) return;
    setPendingItemId(item.id);
    try {
      const detailed = isTmdbSearchItem(item) ? await enrichTmdbItem(item) : item;
      const timeout = new Promise<MediaItem>(resolve => setTimeout(() => resolve(detailed), PROVIDER_LINKS_TIMEOUT_MS));
      action(await Promise.race([resolveProviderLinks(detailed), timeout]));
    } finally {
      setPendingItemId(null);
    }
  };
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchAbortRef.current?.abort();
      if (linkTimeoutRef.current) {
        clearTimeout(linkTimeoutRef.current);
      }
    };
  }, []);

  const cancelPendingSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
  };

  const executeSearch = async (text: string, category: MediaCategory | 'all', requestId: number) => {
    const controller = new AbortController();
    searchAbortRef.current = controller;
    try {
      const results = await searchMedia(text, {
        category,
        categories: isRestricted ? searchableCategories : undefined,
        signal: controller.signal,
      });
      if (requestId === currentRequestIdRef.current) {
        setSearchResults(results);
      }
    } catch (e) {
      if (requestId === currentRequestIdRef.current && !isAbortError(e)) {
        console.warn('Search error:', e);
      }
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  };

  // Espera a que el usuario deje de escribir antes de consultar los proveedores externos
  const handleSearch = (
    text: string,
    categoryToUse?: MediaCategory | 'all',
    immediate: boolean = false
  ) => {
    setSearchQuery(text);
    const cat = categoryToUse !== undefined ? categoryToUse : selectedCategory;

    cancelPendingSearch();

    if (text.trim().length < MIN_SEARCH_QUERY_LENGTH) {
      currentRequestIdRef.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const requestId = ++currentRequestIdRef.current;
    if (immediate) {
      executeSearch(text.trim(), cat, requestId);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      executeSearch(text.trim(), cat, requestId);
    }, SEARCH_DEBOUNCE_MS);
  };

  // Link tab state
  const [linkUrl, setLinkUrl] = useState('');
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [linkCustomTitle, setLinkCustomTitle] = useState('');
  const [linkCustomDesc, setLinkCustomDesc] = useState('');
  const [linkRating, setLinkRating] = useState(5);
  const [linkPosterOverride, setLinkPosterOverride] = useState('');
  const linkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFetchLinkPreview = async (urlToFetch?: string) => {
    const targetUrl = normalizeUrl(urlToFetch !== undefined ? urlToFetch : linkUrl);
    if (!targetUrl || targetUrl === 'https://') return;

    setIsFetchingPreview(true);
    try {
      const data = await fetchLinkPreview(targetUrl);
      setLinkPreview(data);
      setLinkCustomTitle(data.title);
      setLinkCustomDesc(data.description);
    } catch (err) {
      console.warn('Error fetching link preview:', err);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handleLinkUrlChange = (text: string) => {
    setLinkUrl(text);
    if (linkTimeoutRef.current) {
      clearTimeout(linkTimeoutRef.current);
    }
    const trimmed = text.trim();
    if (
      trimmed.length > 8 &&
      (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.'))
    ) {
      linkTimeoutRef.current = setTimeout(() => {
        handleFetchLinkPreview(trimmed);
      }, 700);
    }
  };

  const handleSaveLink = () => {
    if (!linkUrl.trim() || !linkCustomTitle.trim()) return;

    const item = buildLinkMediaItem({
      url: normalizeUrl(linkUrl),
      title: linkCustomTitle,
      description: linkCustomDesc,
      imageUrl: linkPosterOverride.trim() || undefined,
      previewData: linkPreview || undefined,
      currentUser,
      userRating: linkRating,
    });

    onAddMedia(item);
    handleClose();
  };

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [preferredManualCategory, setManualCategory] = useState<MediaCategory>('movie');
  const manualCategory: MediaCategory = allCategories.some(c => c.key === preferredManualCategory)
    ? preferredManualCategory
    : allCategories[0]?.key ?? 'other';
  const [manualYear, setManualYear] = useState(new Date().getFullYear().toString());
  const [manualSynopsis, setManualSynopsis] = useState('');
  const [manualLinks, setManualLinks] = useState('');
  const [manualRating, setManualRating] = useState(5);
  const [manualPlatform, setManualPlatform] = useState('Netflix');
  const [manualPoster, setManualPoster] = useState('');

  const handleSelectApiItem = (item: MediaItem) => {
    const enrichedItem: MediaItem = {
      ...item,
      // The provider score is the critic rating; list users' ratings are tracked separately.
      criticRating: item.criticRating ?? (item.averageRating > 0 ? item.averageRating : undefined),
      sourceId: item.sourceId ?? item.id,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      addedBy: currentUser,
      addedAt: new Date().toISOString(),
    };
    onAddMedia(enrichedItem);
    handleClose();
  };

  const handleSaveManual = () => {
    if (!manualTitle.trim()) return;

    const provider: StreamingProvider = {
      id: `prov-${Date.now()}`,
      name: manualPlatform.trim() || (manualCategory === 'game' ? 'Tienda / Plataforma' : 'Plataforma Digital'),
      type: manualCategory === 'book' || manualCategory === 'manga' ? 'read' : manualCategory === 'game' ? 'buy' : 'stream',
    };

    const links = manualLinks
      .split('\n')
      .filter(l => l.trim().length > 0)
      .map((url, idx) => ({ label: `Enlace ${idx + 1}`, url: url.trim() }));

    const newItem: MediaItem = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      category: manualCategory,
      year: parseInt(manualYear, 10) || new Date().getFullYear(),
      synopsis: manualSynopsis.trim() || 'Sin descripción ingresada.',
      posterUrl:
        manualPoster.trim() ||
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      genres: ['Recomendación Personal'],
      averageRating: manualRating,
      userRating: manualRating,
      ratingsCount: 1,
      whereToWatchOrRead: [provider],
      externalLinks: links.length > 0 ? links : undefined,
      isManualEntry: true,
      addedBy: currentUser,
      addedAt: new Date().toISOString(),
      comments: [],
    };

    onAddMedia(newItem);
    handleClose();
  };

  const handleClose = () => {
    cancelPendingSearch();
    if (linkTimeoutRef.current) {
      clearTimeout(linkTimeoutRef.current);
    }
    currentRequestIdRef.current += 1;
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    closePreview();
    setLinkUrl('');
    setIsFetchingPreview(false);
    setLinkPreview(null);
    setLinkCustomTitle('');
    setLinkCustomDesc('');
    setLinkPosterOverride('');
    setManualTitle('');
    setManualSynopsis('');
    setManualLinks('');
    setManualPoster('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      onShow={() => {
        if (tab === 'search') focusAfterRender(searchInputRef);
      }}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Agregar Recomendación</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Tab switch */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'search' && styles.activeTabButton]}
            onPress={() => {
              setTab('search');
              focusAfterRender(searchInputRef);
            }}
          >
            <Ionicons name="search" size={15} color={tab === 'search' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabText, tab === 'search' && styles.activeTabText]}>
              Buscar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tab === 'link' && styles.activeTabButton]}
            onPress={() => setTab('link')}
          >
            <Ionicons name="link" size={15} color={tab === 'link' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabText, tab === 'link' && styles.activeTabText]}>
              Enlace Web
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, tab === 'manual' && styles.activeTabButton]}
            onPress={() => setTab('manual')}
          >
            <Ionicons name="create-outline" size={15} color={tab === 'manual' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabText, tab === 'manual' && styles.activeTabText]}>Manual</Text>
          </TouchableOpacity>
        </View>

        {tab === 'search' ? (
          <View style={styles.searchSection}>
            {/* Category filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[styles.catPill, selectedCategory === 'all' && styles.activeCatPill]}
                onPress={() => {
                  setSelectedCategory('all');
                  if (searchQuery.trim()) handleSearch(searchQuery, 'all', true);
                }}
              >
                <Text style={[styles.catPillText, selectedCategory === 'all' && styles.activeCatPillText]}>Todos</Text>
              </TouchableOpacity>
              {searchCategoryOptions.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catPill, selectedCategory === cat.key && styles.activeCatPill]}
                  onPress={() => {
                    setSelectedCategory(cat.key);
                    if (searchQuery.trim()) handleSearch(searchQuery, cat.key, true);
                  }}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={13}
                    color={selectedCategory === cat.key ? '#0F172A' : '#94A3B8'}
                  />
                  <Text style={[styles.catPillText, selectedCategory === cat.key && styles.activeCatPillText]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {allowOther && (
                <TouchableOpacity
                  style={styles.addCatPill}
                  onPress={() => {
                    if (!showAddCatInput) focusAfterRender(newCatInputRef);
                    setShowAddCatInput(!showAddCatInput);
                  }}
                >
                  <Ionicons name="add" size={14} color="#38BDF8" />
                  <Text style={styles.addCatPillText}>Nueva</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {allowOther && showAddCatInput && (
              <View style={styles.newCatInputRow}>
                <TextInput
                  ref={newCatInputRef}
                  style={styles.newCatInputField}
                  placeholder="Nueva categoría (ej. Podcast, Cómic)..."
                  placeholderTextColor="#64748B"
                  value={newCatInput}
                  onChangeText={setNewCatInput}
                />
                <TouchableOpacity style={styles.newCatSaveBtn} onPress={handleCreateCategory}>
                  <Text style={styles.newCatSaveText}>Crear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.newCatCancelBtn} onPress={() => setShowAddCatInput(false)}>
                  <Ionicons name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Search Input */}
            <SearchInputField
              ref={searchInputRef}
              value={searchQuery}
              isSearching={isSearching}
              onChangeText={text => handleSearch(text)}
              onSubmitEditing={() => handleSearch(searchQuery, undefined, true)}
              onClear={() => handleSearch('')}
            />

            {/* Results or Loading Skeleton */}
            {isSearching ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsList}>
                <SearchLoadingSkeleton category={selectedCategory} />
              </ScrollView>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.resultsList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="compass-outline" size={48} color="#475569" />
                    <Text style={styles.emptyTitle}>
                      {searchQuery ? 'Sin resultados para esa búsqueda' : 'Escribe para buscar'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      Consulta catálogos globales de streaming, series, libros y anime.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => openPreview(item)}
                    activeOpacity={0.7}
                  >
                    <Image source={remoteImageSource(item.posterUrl)} style={styles.resultPoster} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        {item.year ? `${item.year} • ` : ''}{item.category.toUpperCase()}
                      </Text>
                      {item.director ? (
                        <Text style={styles.resultDirector} numberOfLines={1}>
                          {item.director.includes(':')
                            ? item.director
                            : `${item.category === 'book' || item.category === 'manga' ? 'Por ' : item.category === 'game' ? 'Estudio/Dev: ' : item.category === 'music' ? 'Artista: ' : item.category === 'podcast' ? 'Host: ' : item.category === 'recipe' ? 'Cocina: ' : item.category === 'place' ? 'Ubicación: ' : item.category === 'boardgame' ? 'Diseñador: ' : 'Dir: '}${item.director}`}
                        </Text>
                      ) : null}
                      {item.whereToWatchOrRead && item.whereToWatchOrRead.length > 0 && (
                        <View style={styles.resultProviders}>
                          {item.whereToWatchOrRead.slice(0, 3).map(p => (
                            <ProviderBadge
                              key={p.id}
                              provider={p}
                              compact
                              category={item.category}
                            />
                          ))}
                        </View>
                      )}
                      <RatingStars rating={item.averageRating} size={12} showText />
                    </View>
                    <View style={styles.cardActionRow}>
                      {onRecommendDirectly && (
                        <TouchableOpacity
                          style={styles.recommendMiniBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            withFullDetails(item, onRecommendDirectly);
                          }}
                          disabled={pendingItemId !== null}
                          activeOpacity={0.8}
                          accessibilityLabel={`Recomendar ${item.title} a un amigo`}
                        >
                          <Ionicons name="paper-plane" size={14} color="#38BDF8" />
                          <Text style={styles.recommendMiniBtnText}>Recomendar</Text>
                        </TouchableOpacity>
                      )}
                      {isItemInList(item, existingItems) ? (
                        <View style={styles.inListChip} accessibilityLabel={`${item.title} ya está en la lista`}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.inListChipText}>Ya en la lista</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            withFullDetails(item, handleSelectApiItem);
                          }}
                          disabled={pendingItemId !== null}
                          activeOpacity={0.8}
                        >
                          {pendingItemId === item.id ? (
                            <ActivityIndicator size="small" color="#0F172A" />
                          ) : (
                            <Ionicons name="add" size={18} color="#0F172A" />
                          )}
                          <Text style={styles.addBtnText}>Añadir</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : tab === 'link' ? (
          <ScrollView
            style={styles.linkForm}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description / Instructions card */}
            <View style={styles.linkInfoCard}>
              <Ionicons name="link" size={20} color="#38BDF8" />
              <Text style={styles.linkInfoText}>
                Pega cualquier enlace de{' '}
                <Text style={styles.boldText}>X (Twitter), Instagram, Facebook, YouTube</Text> o cualquier
                artículo o página web. Obtendremos una vista previa y podrás personalizar el título y la
                descripción.
              </Text>
            </View>

            {/* URL Input */}
            <Text style={styles.fieldLabel}>URL del enlace o publicación *</Text>
            <View style={styles.linkInputContainer}>
              <Ionicons name="globe-outline" size={18} color="#64748B" style={styles.linkInputIcon} />
              <TextInput
                style={styles.linkUrlInput}
                placeholder="https://x.com/... o https://..."
                placeholderTextColor="#64748B"
                value={linkUrl}
                onChangeText={handleLinkUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={() => handleFetchLinkPreview()}
              />
              {linkUrl.length > 0 && (
                <TouchableOpacity
                  style={styles.linkClearBtn}
                  onPress={() => {
                    setLinkUrl('');
                    setLinkPreview(null);
                    setLinkCustomTitle('');
                    setLinkCustomDesc('');
                    setLinkPosterOverride('');
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.linkFetchBtn,
                  (isFetchingPreview || !linkUrl.trim()) && styles.disabledBtn,
                ]}
                onPress={() => handleFetchLinkPreview()}
                disabled={isFetchingPreview || !linkUrl.trim()}
                activeOpacity={0.8}
              >
                {isFetchingPreview ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color="#0F172A" />
                    <Text style={styles.linkFetchBtnText}>Previsualizar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {isFetchingPreview && (
              <View style={styles.linkLoadingContainer}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.linkLoadingText}>Obteniendo datos del enlace...</Text>
              </View>
            )}

            {/* Fallback warning if preview couldn't get metadata */}
            {linkPreview?.isFallback && !isFetchingPreview && (
              <View style={styles.linkFallbackWarning}>
                <Ionicons name="information-circle-outline" size={18} color="#FBBF24" />
                <Text style={styles.linkFallbackWarningText}>
                  No se pudieron extraer metadatos automáticos completos, pero puedes ingresar el título y la
                  descripción para guardarlo.
                </Text>
              </View>
            )}

            {/* Live Preview Card */}
            {(linkPreview || linkCustomTitle || linkUrl.trim().length > 0) && !isFetchingPreview && (
              <View style={styles.linkPreviewCard}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewCardTitle}>Vista Previa y Personalización</Text>
                  {linkPreview && (
                    <View
                      style={[
                        styles.platformBadge,
                        {
                          backgroundColor: `${linkPreview.platformColor}25`,
                          borderColor: linkPreview.platformColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name={linkPreview.platformIcon as any}
                        size={12}
                        color={linkPreview.platformColor}
                      />
                      <Text style={[styles.platformBadgeText, { color: linkPreview.platformColor }]}>
                        {linkPreview.platformLabel}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Thumbnail Preview */}
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{
                      uri:
                        linkPosterOverride.trim() ||
                        linkPreview?.imageUrl ||
                        'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80',
                    }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Editable Title */}
                <Text style={styles.fieldLabel}>Título visible en la lista *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Título del enlace..."
                  placeholderTextColor="#64748B"
                  value={linkCustomTitle}
                  onChangeText={setLinkCustomTitle}
                />

                {/* Editable Description */}
                <Text style={styles.fieldLabel}>Descripción / Notas del usuario</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Agrega tus comentarios, resumen o sinopsis de este enlace..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={linkCustomDesc}
                  onChangeText={setLinkCustomDesc}
                />

                {/* Rating */}
                <Text style={styles.fieldLabel}>Calificación inicial</Text>
                <View style={styles.ratingRow}>
                  <RatingStars rating={linkRating} onRatingChange={setLinkRating} interactive size={24} />
                  <Text style={styles.ratingValueText}>{linkRating.toFixed(1)} / 5</Text>
                </View>

                {/* Poster override */}
                <Text style={styles.fieldLabel}>URL de portada o miniatura personalizada (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  placeholderTextColor="#64748B"
                  value={linkPosterOverride}
                  onChangeText={setLinkPosterOverride}
                />
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!linkUrl.trim() || !linkCustomTitle.trim() || isFetchingPreview) && styles.disabledBtn,
              ]}
              onPress={handleSaveLink}
              disabled={!linkUrl.trim() || !linkCustomTitle.trim() || isFetchingPreview}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#0F172A" />
              <Text style={styles.submitBtnText}>Agregar enlace a la lista</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView style={styles.manualForm} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Interestelar o Tokio Blues"
              placeholderTextColor="#64748B"
              value={manualTitle}
              onChangeText={setManualTitle}
            />

            <View style={styles.categoryHeaderRow}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              {allowOther && (
                <TouchableOpacity onPress={() => setShowAddCatInput(!showAddCatInput)}>
                  <Text style={styles.createCatLink}>+ Nueva categoría</Text>
                </TouchableOpacity>
              )}
            </View>

            {allowOther && showAddCatInput && (
              <View style={styles.newCatInputRow}>
                <TextInput
                  style={styles.newCatInputField}
                  placeholder="Nombre de categoría (ej. Cómic, Podcast)..."
                  placeholderTextColor="#64748B"
                  value={newCatInput}
                  onChangeText={setNewCatInput}
                />
                <TouchableOpacity style={styles.newCatSaveBtn} onPress={handleCreateCategory}>
                  <Text style={styles.newCatSaveText}>Crear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.newCatCancelBtn} onPress={() => setShowAddCatInput(false)}>
                  <Ionicons name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.categoryGrid}>
              {allCategories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.manualCatBtn, manualCategory === cat.key && styles.activeManualCatBtn]}
                  onPress={() => setManualCategory(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={manualCategory === cat.key ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text style={[styles.manualCatText, manualCategory === cat.key && styles.activeManualCatText]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Año de Lanzamiento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 2024"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={manualYear}
              onChangeText={setManualYear}
            />

            <Text style={styles.fieldLabel}>¿Dónde verlo o leerlo? (Plataforma / Tienda)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Netflix, Prime Video, Biblioteca Municipal..."
              placeholderTextColor="#64748B"
              value={manualPlatform}
              onChangeText={setManualPlatform}
            />

            <Text style={styles.fieldLabel}>Tu Calificación Inicial (Estrellas)</Text>
            <View style={styles.ratingPickerRow}>
              <RatingStars
                rating={manualRating}
                size={28}
                interactive
                onRatingChange={setManualRating}
                showText
              />
            </View>

            <Text style={styles.fieldLabel}>Descripción / Sinopsis personal</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="¿Por qué la recomiendas a tus amigos? Cuenta de qué trata..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={4}
              value={manualSynopsis}
              onChangeText={setManualSynopsis}
            />

            <Text style={styles.fieldLabel}>Enlaces externos (uno por línea)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="https://justwatch.com/...&#10;https://imdb.com/..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              value={manualLinks}
              onChangeText={setManualLinks}
            />

            <Text style={styles.fieldLabel}>URL de Póster / Portada (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#64748B"
              value={manualPoster}
              onChangeText={setManualPoster}
            />

            <TouchableOpacity
              style={[styles.submitBtn, !manualTitle.trim() && styles.disabledBtn]}
              onPress={handleSaveManual}
              disabled={!manualTitle.trim()}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#0F172A" />
              <Text style={styles.submitBtnText}>Guardar y Compartir en la Lista</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {previewItem && (
          <MediaDetailModal
            item={previewItem}
            visible={Boolean(previewItem)}
            onClose={closePreview}
            isAlreadyInList={isItemInList(previewItem, existingItems)}
            onAddMedia={(selected) => {
              withFullDetails(selected, full => {
                handleSelectApiItem(full);
                closePreview();
              });
            }}
            onRecommendToFriend={
              onRecommendDirectly
                ? (recItem) => {
                    withFullDetails(recItem, full => {
                      closePreview();
                      onRecommendDirectly(full);
                    });
                  }
                : undefined
            }
            embedded
          />
        )}
      </View>
      <PointsToastHost />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTabButton: {
    backgroundColor: '#0369A122',
    borderColor: '#38BDF8',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  searchSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categoryScroll: {
    maxHeight: 38,
    marginBottom: 14,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
    gap: 6,
  },
  activeCatPill: {
    backgroundColor: '#38BDF8',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeCatPillText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  addCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderColor: '#0284C7',
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  addCatPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  newCatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
    gap: 8,
  },
  newCatInputField: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 4,
    outlineStyle: 'none',
  } as any,
  newCatSaveBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newCatSaveText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  newCatCancelBtn: {
    padding: 4,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  createCatLink: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 16,
  },
  searchInputContainerFocused: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F172A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
    outlineStyle: 'none',
  } as any,
  clearSearchBtn: {
    padding: 6,
    marginRight: 4,
  },
  resultsList: {
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultPoster: {
    width: 60,
    height: 85,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    flexShrink: 0,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  resultMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  resultDirector: {
    fontSize: 11,
    color: '#38BDF8',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  resultProviders: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    alignSelf: 'center',
  },
  recommendMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C720',
    borderWidth: 1,
    borderColor: '#38BDF840',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  recommendMiniBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
    alignSelf: 'center',
  },
  inListChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    flexShrink: 0,
    alignSelf: 'center',
  },
  inListChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  manualForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  manualCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeManualCatBtn: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  manualCatText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeManualCatText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ratingPickerRow: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 50,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  linkForm: {
    flex: 1,
    paddingHorizontal: 20,
  },
  linkInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  linkInfoText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  linkInputIcon: {
    marginRight: 2,
  },
  linkUrlInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 6,
  },
  linkClearBtn: {
    padding: 4,
  },
  linkFetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  linkFetchBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 12,
  },
  linkLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  linkLoadingText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  linkFallbackWarning: {
    flexDirection: 'row',
    backgroundColor: '#78350F22',
    borderWidth: 1,
    borderColor: '#F59E0B66',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 8,
    alignItems: 'center',
  },
  linkFallbackWarningText: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 16,
  },
  linkPreviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  platformBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  ratingValueText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
});
