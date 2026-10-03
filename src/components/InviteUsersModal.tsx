import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

interface InviteUsersModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  list: CollaborativeList | null;
  onListUpdated: (list: CollaborativeList) => void;
}

export const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  visible,
  onClose,
  currentUser,
  list,
  onListUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // null while the friends directory is loading.
  const [friends, setFriends] = useState<UserProfile[] | null>(null);
  const loading = friends === null;
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Only friends can be invited to a list.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    StorageService.getUsersDirectory()
      .then(directory => {
        if (cancelled) return;
        setFriends(
          directory.filter(u => u.id !== currentUser?.id && StorageService.isFriend(currentUser?.friends, u))
        );
      })
      .catch(e => {
        console.warn('Error loading friends to invite:', e);
        if (!cancelled) setFriends([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, currentUser?.id, currentUser?.friends]);

  const results = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase().replace(/^[@#]/, '');
    if (!friends || !clean) return friends ?? [];
    return friends.filter(
      u =>
        u.name?.toLowerCase().includes(clean) ||
        u.handle?.toLowerCase().replace('@', '').includes(clean) ||
        u.userCode?.toLowerCase().replace('#', '').includes(clean)
    );
  }, [friends, searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    setFriends(null);
    onClose();
  };

  const handleInvite = async (target: UserProfile) => {
    if (!currentUser || !list || busyUserId) return;
    setBusyUserId(target.id);
    try {
      const updated = await StorageService.inviteUserToList(
        list.id,
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, friends: currentUser.friends },
        target
      );
      if (updated) onListUpdated(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo enviar la invitación.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleCancelInvite = async (inviteeId: string) => {
    if (!currentUser || !list || busyUserId) return;
    setBusyUserId(inviteeId);
    try {
      const updated = await StorageService.cancelListInvitation(list.id, currentUser.id, inviteeId);
      if (updated) onListUpdated(updated);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cancelar la invitación.');
    } finally {
      setBusyUserId(null);
    }
  };

  if (!list) return null;

  const pendingInvites = list.pendingInvites || [];

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isMember = list.owner.id === item.id || list.collaborators.some(c => c.id === item.id);
    const isInvited = pendingInvites.some(i => i.userId === item.id);
    const isBusy = busyUserId === item.id;

    return (
      <View style={styles.userRow}>
        <UserAvatar name={item.name} avatar={item.avatar} size={38} />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.userHandle} numberOfLines={1}>{item.handle || item.userCode}</Text>
        </View>
        {isMember ? (
          <View style={[styles.statusPill, styles.statusPillMember]}>
            <Ionicons name="people" size={13} color="#94A3B8" />
            <Text style={styles.statusPillText}>Miembro</Text>
          </View>
        ) : isInvited ? (
          <View style={[styles.statusPill, styles.statusPillInvited]}>
            <Ionicons name="time-outline" size={13} color="#F59E0B" />
            <Text style={[styles.statusPillText, { color: '#F59E0B' }]}>Invitado</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => handleInvite(item)}
            disabled={Boolean(busyUserId)}
            activeOpacity={0.8}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={13} color="#0F172A" />
                <Text style={styles.inviteBtnText}>Invitar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Invitar a la lista</Text>
              <Text style={styles.subtitle} numberOfLines={1}>«{list.title}»</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Solo puedes invitar a tus amigos. Verán la lista y podrán colaborar cuando acepten la invitación.
          </Text>

          {pendingInvites.length > 0 && (
            <View style={styles.pendingBox}>
              <Text style={styles.sectionLabel}>Invitaciones pendientes ({pendingInvites.length})</Text>
              {pendingInvites.map(invite => (
                <View key={invite.userId} style={styles.pendingRow}>
                  <UserAvatar name={invite.userName} avatar={invite.userAvatar} size={28} />
                  <Text style={styles.pendingName} numberOfLines={1}>{invite.userName}</Text>
                  <TouchableOpacity
                    onPress={() => handleCancelInvite(invite.userId)}
                    disabled={Boolean(busyUserId)}
                    style={styles.cancelInviteBtn}
                    accessibilityLabel={`Cancelar invitación a ${invite.userName}`}
                  >
                    {busyUserId === invite.userId ? (
                      <ActivityIndicator size="small" color="#F87171" />
                    ) : (
                      <Text style={styles.cancelInviteText}>Cancelar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar entre tus amigos..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <UserListSkeleton count={4} />
          ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="person-circle-outline" size={44} color="#334155" />
                <Text style={styles.emptyText}>
                  {!friends?.length
                    ? 'Aún no tienes amigos. Búscalos desde la comunidad y conéctate para poder invitarlos.'
                    : 'Ningún amigo coincide con la búsqueda'}
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '60%',
    paddingTop: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#38BDF8',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  pendingBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    gap: 8,
  },
  sectionLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingName: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
  },
  cancelInviteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 64,
    alignItems: 'center',
  },
  cancelInviteText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  userHandle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  inviteBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPillMember: {
    backgroundColor: '#1E293B',
  },
  statusPillInvited: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
