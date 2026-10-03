import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList } from '../types';
import { UserAvatar } from './UserAvatar';
import { remoteImageSource } from '../utils/remoteImage';

interface CollaborativeListCardProps {
  list: CollaborativeList;
  onPress: () => void;
  onShare: (list: CollaborativeList) => void;
}

export const CollaborativeListCard: React.FC<CollaborativeListCardProps> = ({
  list,
  onPress,
  onShare,
}) => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      {list.coverImage ? (
        <Image source={remoteImageSource(list.coverImage)} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderCover}>
          <Ionicons name="albums" size={32} color="#475569" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
            <Text style={styles.title} numberOfLines={1}>
              {list.title}
            </Text>
            {list.isPublic ? (
              <View style={styles.badgePublic}>
                <Ionicons name="globe-outline" size={10} color="#30D158" />
                <Text style={styles.badgePublicText}>Pública</Text>
              </View>
            ) : (
              <View style={styles.badgePrivate}>
                <Ionicons name="lock-closed" size={10} color="#FF9F0A" />
                <Text style={styles.badgePrivateText}>Privada</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => onShare(list)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-social-outline" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {list.description}
        </Text>

        <View style={styles.footer}>
          {/* Collaborator Avatars */}
          <View style={styles.avatarsRow}>
            {list.collaborators.slice(0, 4).map((c, i) => (
              <UserAvatar
                key={c.id || i}
                name={c.name}
                avatar={c.avatar}
                size={26}
                borderColor="#0F172A"
                borderWidth={1.5}
                style={{ marginLeft: i > 0 ? -8 : 0 }}
              />
            ))}
            {list.collaborators.length > 4 && (
              <View style={[styles.moreAvatar, { marginLeft: -8 }]}>
                <Text style={styles.moreAvatarText}>+{list.collaborators.length - 4}</Text>
              </View>
            )}
          </View>

          {/* Items count & code */}
          <View style={styles.metaRow}>
            <View style={styles.countBadge}>
              <Ionicons name="layers-outline" size={13} color="#94A3B8" />
              <Text style={styles.countText}>{list.items.length} obras</Text>
            </View>

            <View style={styles.codePill}>
              <Text style={styles.codeText}>{list.inviteCode}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cover: {
    width: '100%',
    height: 110,
    backgroundColor: '#0F172A',
  },
  placeholderCover: {
    width: '100%',
    height: 90,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  shareBtn: {
    padding: 4,
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#33415555',
    paddingTop: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collabAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  moreAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  moreAvatarText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  codePill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  badgePublic: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgePublicText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '700',
  },
  badgePrivate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgePrivateText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
  },
});
