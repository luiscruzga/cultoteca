import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, UserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { UserAvatar } from './UserAvatar';
import { UserListSkeleton } from './Skeleton';

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  selectedList?: CollaborativeList | null;
  onUserInvited?: (targetUser: UserProfile) => void;
  onProfileUpdated?: (updated: UserProfile) => void;
  onSelectUserList?: (list: CollaborativeList) => void;
  allLists: CollaborativeList[];
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  visible,
  onClose,
  currentUser,
  selectedList,
  onUserInvited,
  onProfileUpdated,
  onSelectUserList,
  allLists,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserProfile | null>(null);
  const [friendBusyId, setFriendBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadInitialDirectory();
    }
  }, [visible]);

  const loadInitialDirectory = async () => {
    setResults([]);
    setLoading(true);
    try {
      const all = await StorageService.getUsersDirectory();
      // Filter out self by default
      setResults(all.filter(u => u.id !== currentUser?.id));
    } catch (e) {
      console.warn('Error loading users directory:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      const all = await StorageService.getUsersDirectory();
      setResults(all.filter(u => u.id !== currentUser?.id));
      return;
    }

    setLoading(true);
    try {
      const searchRes = await StorageService.searchUsers(text);
      setResults(searchRes.filter(u => u.id !== currentUser?.id));
    } catch (e) {
      console.warn('Error searching users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMyCode = () => {
    if (!currentUser?.userCode) return;
    Clipboard.setString(currentUser.userCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    Alert.alert('Copiado', `Código de usuario ${currentUser.userCode} copiado al portapapeles.`);
  };

  const handleShareMyProfile = async () => {
    if (!currentUser) return;
    const code = currentUser.userCode || '#CULTO';
    const profileUrl = `https://cultoteca.app/u/${code.replace('#', '')}`;
    try {
      await Share.share({
        message: `¡Hola! Conéctate conmigo en Cultoteca para compartir listas culturales. Mi código es ${code} o accede a mi perfil: ${profileUrl}`,
      });
    } catch (e) {
      console.warn('Error sharing profile link:', e);
    }
  };

  const handleToggleFriend = async (targetUser: UserProfile) => {
    if (!currentUser || friendBusyId) return;
    setFriendBusyId(targetUser.id);
    try {
      const updated = await StorageService.toggleFriend(currentUser, targetUser.id);
      onProfileUpdated?.(updated);
    } catch (e) {
      console.warn('Error toggling friend:', e);
      Alert.alert('Error', 'No se pudo actualizar la amistad. Inténtalo de nuevo.');
    } finally {
      setFriendBusyId(null);
    }
  };

  const handleInviteToList = async (targetUser: UserProfile) => {
    if (!selectedList) {
      Alert.alert('Aviso', 'Selecciona primero una lista para invitar colaboradores.');
      return;
    }
    const already = selectedList.collaborators.some(c => c.id === targetUser.id);
    if (already) {
      Alert.alert('Ya es colaborador', `${targetUser.name} ya es parte de esta lista.`);
      return;
    }

    onUserInvited?.(targetUser);
    Alert.alert('Invitado', `${targetUser.name} ha sido añadido como colaborador.`);
  };

  const renderUserItem = ({ item }: { item: UserProfile }) => {
    const isFriend = Boolean(
      (item.id && currentUser?.friends?.includes(item.id)) ||
      (item.userCode && currentUser?.friends?.includes(item.userCode))
    );
    const isCollaborator = selectedList?.collaborators.some(c => c.id === item.id);
    const isBusy = friendBusyId === item.id;
    const userLists = allLists.filter(l => l.owner.id === item.id && l.isPublic);

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeaderRow}>
          <UserAvatar name={item.name} avatar={item.avatar} size={42} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.userName}>{item.name}</Text>
              <View style={styles.codeTag}>
                <Ionicons name="finger-print" size={11} color="#0A84FF" />
                <Text style={styles.codeTagText}>{item.userCode}</Text>
              </View>
            </View>
            <Text style={styles.userHandle}>{item.handle}</Text>
          </View>
        </View>

        {item.bio && <Text style={styles.bioText}>{item.bio}</Text>}

        {/* User Stats and Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.friendBtn, isFriend && styles.friendBtnActive, isBusy && { opacity: 0.75 }]}
            onPress={() => handleToggleFriend(item)}
            disabled={Boolean(friendBusyId)}
            accessibilityState={{ busy: isBusy, disabled: Boolean(friendBusyId) }}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={isFriend ? '#30D158' : '#FFF'} />
            ) : (
              <Ionicons
                name={isFriend ? 'checkmark-circle' : 'person-add-outline'}
                size={15}
                color={isFriend ? '#30D158' : '#FFF'}
              />
            )}
            <Text style={[styles.friendBtnText, isFriend && styles.friendBtnTextActive]}>
              {isBusy ? (isFriend ? 'Quitando...' : 'Conectando...') : isFriend ? 'Amigos' : 'Conectar'}
            </Text>
          </TouchableOpacity>

          {selectedList && (
            <TouchableOpacity
              style={[styles.inviteBtn, isCollaborator && styles.inviteBtnDisabled]}
              onPress={() => handleInviteToList(item)}
              disabled={isCollaborator}
            >
              <Ionicons
                name={isCollaborator ? 'people' : 'add-outline'}
                size={15}
                color={isCollaborator ? '#8E8E93' : '#0A84FF'}
              />
              <Text style={[styles.inviteBtnText, isCollaborator && styles.inviteBtnTextDisabled]}>
                {isCollaborator ? 'En la lista' : 'Invitar a lista'}
              </Text>
            </TouchableOpacity>
          )}

          {userLists.length > 0 && (
            <TouchableOpacity
              style={styles.listsCountBadge}
              onPress={() => {
                if (userLists[0]) onSelectUserList?.(userLists[0]);
                onClose();
              }}
            >
              <Ionicons name="list" size={13} color="#FF9F0A" />
              <Text style={styles.listsCountText}>{userLists.length} públicas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="people" size={18} color="#0A84FF" />
              </View>
              <Text style={styles.title}>Comunidad & Usuarios</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* User's own card with user code & link */}
          {currentUser && (
            <View style={styles.myCodeBox}>
              <View style={styles.myCodeLeft}>
                <Text style={styles.myCodeLabel}>Tu código de usuario:</Text>
                <Text style={styles.myCodeValue}>{currentUser.userCode || '#CULTO'}</Text>
              </View>
              <View style={styles.myCodeActions}>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyMyCode}>
                  <Ionicons
                    name={copiedCode ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color="#FFF"
                  />
                  <Text style={styles.copyBtnText}>{copiedCode ? 'Listo' : 'Copiar'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShareMyProfile}>
                  <Ionicons name="share-outline" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Search Input */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por código (#CULTO-...), @handle o enlace..."
              placeholderTextColor="#636366"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {loading && <ActivityIndicator size="small" color="#0A84FF" />}
          </View>

          {/* Results List */}
          {loading && results.length === 0 ? (
            <UserListSkeleton />
          ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="person-circle-outline" size={54} color="#3A3A3C" />
                <Text style={styles.emptyTitle}>No se encontraron usuarios</Text>
                <Text style={styles.emptyDesc}>
                  Pídele a un amigo su código único (ej. #CULTO-1042) o enlace directo para encontrarlo aquí.
                </Text>
              </View>
            }
          />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
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
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    padding: 6,
  },
  myCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  myCodeLeft: {
    flex: 1,
  },
  myCodeLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myCodeValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0A84FF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  myCodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userCard: {
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  userHandle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  codeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  codeTagText: {
    fontSize: 11,
    color: '#0A84FF',
    fontWeight: '700',
  },
  bioText: {
    fontSize: 13,
    color: '#AEAEB2',
    lineHeight: 18,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  friendBtnActive: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  friendBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  friendBtnTextActive: {
    color: '#30D158',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  inviteBtnDisabled: {
    backgroundColor: '#3A3A3C',
  },
  inviteBtnText: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '600',
  },
  inviteBtnTextDisabled: {
    color: '#8E8E93',
  },
  listsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginLeft: 'auto',
  },
  listsCountText: {
    color: '#FF9F0A',
    fontSize: 12,
    fontWeight: '600',
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
  emptyDesc: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
