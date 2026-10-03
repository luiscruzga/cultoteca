import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { DirectRecommendation, MediaItem, UserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { UserAvatar } from './UserAvatar';

interface DirectRecommendModalProps {
  visible: boolean;
  onClose: () => void;
  mediaItem: MediaItem | null;
  currentUser: UserProfile | null;
  onRecommendationSent?: (recommendation: DirectRecommendation) => void;
  onOpenSearchUsers?: () => void;
}

export const DirectRecommendModal: React.FC<DirectRecommendModalProps> = ({
  visible,
  onClose,
  mediaItem,
  currentUser,
  onRecommendationSent,
  onOpenSearchUsers,
}) => {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (visible && currentUser) {
      loadFriends();
      setSelectedFriendId(null);
      setMessage('');
      setSearchFilter('');
    }
  }, [visible, currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const directory = await StorageService.getUsersDirectory();
      const userFriends = directory.filter(
        u =>
          u.id !== currentUser.id &&
          (currentUser.friends?.includes(u.id) ||
            currentUser.friends?.includes(u.userCode) ||
            currentUser.friends?.includes(u.handle))
      );
      setFriends(userFriends);
      if (userFriends.length > 0) {
        setSelectedFriendId(userFriends[0].id);
      }
    } catch (e) {
      console.warn('Error loading friends for recommendation:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!mediaItem || !currentUser) return;
    if (!selectedFriendId) {
      Alert.alert('Selecciona un amigo', 'Por favor elige a qué amigo deseas enviar esta recomendación.');
      return;
    }

    const targetFriend = friends.find(f => f.id === selectedFriendId);
    if (!targetFriend) return;

    setSubmitting(true);
    try {
      const created = await StorageService.sendDirectRecommendation(
        currentUser,
        targetFriend,
        mediaItem,
        message.trim()
      );
      onRecommendationSent?.(created);
      Alert.alert(
        '¡Recomendación enviada!',
        `Le has recomendado "${mediaItem.title}" a ${targetFriend.name}. Se ha guardado en su lista "Recomendadas por amigos".`
      );
      onClose();
    } catch (e) {
      console.warn('Error sending direct recommendation:', e);
      Alert.alert('Error', 'No se pudo enviar la recomendación. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.handle.toLowerCase().includes(q) ||
      (f.userCode && f.userCode.toLowerCase().includes(q))
    );
  });

  if (!mediaItem) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="paper-plane" size={18} color="#38BDF8" />
              </View>
              <Text style={styles.title}>Recomendar a un amigo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Target Media Card Preview */}
            <View style={styles.mediaPreview}>
              <Image
                source={{
                  uri:
                    mediaItem.posterUrl ||
                    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80',
                }}
                style={styles.mediaPoster}
              />
              <View style={styles.mediaDetails}>
                <Text style={styles.mediaTitle} numberOfLines={2}>
                  {mediaItem.title}
                </Text>
                <View style={styles.mediaMetaRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {mediaItem.category.toUpperCase()}
                    </Text>
                  </View>
                  {Boolean(mediaItem.year) && (
                    <Text style={styles.mediaYear}>{mediaItem.year}</Text>
                  )}
                </View>
                {mediaItem.director && (
                  <Text style={styles.mediaDirector} numberOfLines={1}>
                    De: {mediaItem.director}
                  </Text>
                )}
              </View>
            </View>

            {/* Friends Selector Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Elige al destinatario:</Text>
              {friends.length > 0 && (
                <Text style={styles.friendsCountText}>{friends.length} disponibles</Text>
              )}
            </View>

            {loading ? (
              <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 20 }} />
            ) : friends.length === 0 ? (
              <View style={styles.noFriendsBox}>
                <Ionicons name="people-outline" size={32} color="#64748B" />
                <Text style={styles.noFriendsText}>
                  Aún no tienes amigos agregados en tu círculo cultural. Conecta con otros usuarios para enviarles recomendaciones directas.
                </Text>
                <TouchableOpacity
                  style={styles.connectFriendsBtn}
                  onPress={() => {
                    onClose();
                    onOpenSearchUsers?.();
                  }}
                >
                  <Ionicons name="person-add" size={15} color="#0F172A" />
                  <Text style={styles.connectFriendsBtnText}>Buscar amigos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {friends.length > 4 && (
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Filtrar por nombre o @handle..."
                      placeholderTextColor="#64748B"
                      value={searchFilter}
                      onChangeText={setSearchFilter}
                    />
                  </View>
                )}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsHorizontalList}
                >
                  {filteredFriends.map(friend => {
                    const isSelected = selectedFriendId === friend.id;
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.friendChip, isSelected && styles.friendChipSelected]}
                        onPress={() => setSelectedFriendId(friend.id)}
                        activeOpacity={0.8}
                      >
                        <UserAvatar name={friend.name} avatar={friend.avatar} size={44} />
                        <Text style={[styles.friendChipName, isSelected && styles.friendChipNameSelected]} numberOfLines={1}>
                          {friend.name}
                        </Text>
                        <Text style={styles.friendChipHandle} numberOfLines={1}>
                          {friend.handle}
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedTick}>
                            <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Optional Note Section */}
            <View style={{ marginTop: 18 }}>
              <Text style={styles.sectionTitle}>Mensaje o nota personal (opcional):</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Ej: Te va a encantar la fotografía y la historia, me recordó a..."
                placeholderTextColor="#64748B"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.charCount}>{message.length}/200</Text>
            </View>

            {/* Info notice about auto-generated list */}
            <View style={styles.infoBanner}>
              <Ionicons name="sparkles" size={16} color="#F59E0B" />
              <Text style={styles.infoBannerText}>
                Se generará o actualizará automáticamente la lista <Text style={{ fontWeight: '700' }}>"Recomendadas por amigos"</Text> en el perfil del amigo seleccionado.
              </Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!selectedFriendId || submitting || friends.length === 0) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!selectedFriendId || submitting || friends.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#0F172A" />
                  <Text style={styles.sendBtnText}>Enviar Recomendación</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
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
    borderColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    backgroundColor: '#0284C720',
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mediaPreview: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  mediaPoster: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  mediaDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  mediaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#38BDF820',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  mediaYear: {
    fontSize: 12,
    color: '#94A3B8',
  },
  mediaDirector: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  friendsCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    padding: 0,
  },
  friendsHorizontalList: {
    paddingVertical: 4,
    gap: 12,
  },
  friendChip: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  friendChipSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C720',
  },
  friendChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 8,
    textAlign: 'center',
  },
  friendChipNameSelected: {
    color: '#F8FAFC',
  },
  friendChipHandle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  selectedTick: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  noFriendsBox: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noFriendsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 14,
  },
  connectFriendsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  connectFriendsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  noteInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  charCount: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B15',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    marginTop: 14,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#FDE68A',
    flex: 1,
    lineHeight: 16,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
});
