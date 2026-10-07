import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, ListMember } from '../types';
import { StorageService } from '../services/storageService';
import { UserAvatar } from './UserAvatar';
import { UserListSkeleton } from './Skeleton';

interface ListMembersModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
  list: CollaborativeList | null;
  isFollowing: boolean;
  /** Ausente cuando el usuario actual es el dueño (no puede seguir su propia lista). */
  onToggleFollow?: () => Promise<void>;
}

const ROLE_SECTIONS: { role: ListMember['role']; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { role: 'owner', title: 'Dueño', icon: 'star', color: '#F59E0B' },
  { role: 'collaborator', title: 'Colaboradores', icon: 'people', color: '#38BDF8' },
  { role: 'contributor', title: 'Han publicado', icon: 'create', color: '#34D399' },
  { role: 'follower', title: 'Seguidores', icon: 'bookmark', color: '#A78BFA' },
];

const describeContributions = (count: number) =>
  count === 0 ? null : count === 1 ? '1 aporte' : `${count} aportes`;

export const ListMembersModal: React.FC<ListMembersModalProps> = ({
  visible,
  onClose,
  currentUserId,
  list,
  isFollowing,
  onToggleFollow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // null while members are loading.
  const [members, setMembers] = useState<ListMember[] | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  useEffect(() => {
    if (!visible || !list) return;
    let cancelled = false;
    StorageService.getListMembers(list, { followerId: isFollowing ? currentUserId : undefined })
      .then(result => {
        if (!cancelled) setMembers(result);
      })
      .catch(e => {
        console.warn('Error loading list members:', e);
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, list, isFollowing, currentUserId]);

  const handleToggleFollow = async () => {
    if (!onToggleFollow || isTogglingFollow) return;
    setIsTogglingFollow(true);
    try {
      await onToggleFollow();
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const sections = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase().replace(/^[@#]/, '');
    const filtered = (members ?? []).filter(
      m =>
        !clean ||
        m.name?.toLowerCase().includes(clean) ||
        m.handle?.toLowerCase().replace('@', '').includes(clean) ||
        m.userCode?.toLowerCase().replace('#', '').includes(clean)
    );
    return ROLE_SECTIONS.map(section => ({
      ...section,
      data: filtered.filter(m => m.role === section.role),
    })).filter(section => section.data.length > 0);
  }, [members, searchQuery]);

  const handleClose = () => {
    setSearchQuery('');
    setMembers(null);
    onClose();
  };

  if (!list) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                Miembros{members ? ` (${members.length})` : ''}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>«{list.title}»</Text>
            </View>
            {onToggleFollow && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={handleToggleFollow}
                disabled={isTogglingFollow}
                activeOpacity={0.8}
                accessibilityLabel={isFollowing ? 'Dejar de seguir lista' : 'Seguir lista'}
              >
                {isTogglingFollow ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? 'bookmark' : 'bookmark-outline'}
                      size={14}
                      color={isFollowing ? '#38BDF8' : '#94A3B8'}
                    />
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Cerrar miembros">
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar miembros por nombre, @handle o código..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {members === null ? (
            <UserListSkeleton count={4} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.listContent}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <Ionicons name={section.icon} size={13} color={section.color} />
                  <Text style={[styles.sectionLabel, { color: section.color }]}>
                    {section.title} ({section.data.length})
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <UserAvatar name={item.name} avatar={item.avatar} size={38} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.name}
                      {item.id === currentUserId ? <Text style={styles.youText}> (tú)</Text> : null}
                    </Text>
                    {!!(item.handle || item.userCode || item.contributions) && (
                      <Text style={styles.userHandle} numberOfLines={1}>
                        {[item.handle || item.userCode, describeContributions(item.contributions)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="person-circle-outline" size={44} color="#334155" />
                  <Text style={styles.emptyText}>
                    {searchQuery.trim()
                      ? 'Ningún miembro coincide con la búsqueda'
                      : 'Esta lista aún no tiene miembros'}
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
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginRight: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    minWidth: 92,
    justifyContent: 'center',
  },
  followBtnActive: {
    borderColor: 'rgba(56, 189, 248, 0.5)',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  followBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  followBtnTextActive: {
    color: '#38BDF8',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  youText: {
    color: '#64748B',
    fontWeight: '400',
  },
  userHandle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
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
