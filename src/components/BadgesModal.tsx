import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProviderBadge } from './ProviderBadge';
import { Ionicons } from '@expo/vector-icons';
import { Badge, UserProfile } from '../types';
import { GamificationService } from '../services/gamificationService';
import { UserAvatar } from './UserAvatar';

interface BadgesModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const BadgesModal: React.FC<BadgesModalProps> = ({ visible, onClose, profile }) => {
  const rank = GamificationService.getCultoRank(profile.cultoScore);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rango & Medallas de Culto</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Score & Rank Card */}
          <View style={styles.scoreCard}>
            <UserAvatar
              name={profile.name}
              avatar={profile.avatar}
              size={84}
              borderColor={rank.badgeColor}
              borderWidth={3}
            />
            <Text style={styles.userName}>{profile.name}</Text>
            <Text style={styles.userHandle}>{profile.handle}</Text>

            {/* Cultural Rank Badge */}
            <View style={[styles.rankBadge, { borderColor: rank.badgeColor }]}>
              <Ionicons name={rank.icon as any} size={18} color={rank.badgeColor} />
              <Text style={[styles.rankBadgeText, { color: rank.badgeColor }]}>
                Nivel {rank.level} · {rank.title}
              </Text>
            </View>

            <Text style={styles.rankDescription}>{rank.description}</Text>

            {/* Score Pill */}
            <View style={styles.scorePill}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
              <Text style={styles.scoreText}>{profile.cultoScore} Puntos Culto</Text>
            </View>

            {/* Level Progress Bar */}
            <View style={styles.levelProgressSection}>
              <View style={styles.levelProgressHeader}>
                <Text style={styles.levelProgressLabel}>Progreso al siguiente nivel</Text>
                <Text style={styles.levelProgressNumbers}>
                  {rank.nextScore
                    ? `${profile.cultoScore} / ${rank.nextScore} pts`
                    : '¡Nivel Máximo alcanzado!'}
                </Text>
              </View>
              <View style={styles.levelTrack}>
                <View
                  style={[
                    styles.levelFill,
                    {
                      width: `${rank.progressPercent}%`,
                      backgroundColor: rank.badgeColor,
                    },
                  ]}
                />
              </View>
              {rank.nextScore && (
                <Text style={styles.levelHint}>
                  Faltan {Math.max(0, rank.nextScore - profile.cultoScore)} puntos para el siguiente rango
                </Text>
              )}
            </View>
          </View>

          {/* Gamification Rules / Points Guide */}
          <View style={styles.waysToEarnCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={17} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Cómo ganar Puntos de Culto</Text>
            </View>
            <View style={styles.earnGrid}>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+15 pts</Text>
                <Text style={styles.earnLabel}>Agregar obra a lista</Text>
              </View>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+20 pts</Text>
                <Text style={styles.earnLabel}>Marcar obra vista</Text>
              </View>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+10 pts</Text>
                <Text style={styles.earnLabel}>Comentar u opinar</Text>
              </View>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+25 pts</Text>
                <Text style={styles.earnLabel}>Crear nueva lista</Text>
              </View>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+10 pts</Text>
                <Text style={styles.earnLabel}>Girar ruleta de culto</Text>
              </View>
              <View style={styles.earnItem}>
                <Text style={styles.earnPoints}>+15 pts</Text>
                <Text style={styles.earnLabel}>Conectar con un amigo</Text>
              </View>
            </View>
          </View>

          {/* Subscriptions Radar Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="radio-outline" size={18} color="#38BDF8" />
            <Text style={styles.sectionTitle}>Tus Servicios Activos</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Utilizados por el Radar de Streaming para saber qué contenidos puedes ver de inmediato con amigos.
          </Text>
          <View style={styles.subscriptionsRow}>
            {profile.activeSubscriptions.length === 0 ? (
              <Text style={styles.sectionDesc}>Configura tus plataformas desde tu perfil.</Text>
            ) : (
              profile.activeSubscriptions.map(sub => (
                <ProviderBadge key={sub} provider={{ id: sub, name: sub, type: 'stream' }} compact />
              ))
            )}
          </View>

          {/* Badges List */}
          <View style={styles.sectionHeader}>
            <Ionicons name="ribbon-outline" size={18} color="#A855F7" />
            <Text style={styles.sectionTitle}>Insignias y Trofeos Desbloqueables</Text>
          </View>

          <View style={styles.badgesGrid}>
            {profile.badges.map(badge => (
              <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.lockedBadgeCard]}>
                <View style={[styles.iconCircle, badge.unlocked ? styles.unlockedIcon : styles.lockedIcon]}>
                  <Ionicons
                    name={badge.icon as any}
                    size={22}
                    color={badge.unlocked ? '#F59E0B' : '#64748B'}
                  />
                </View>
                <View style={styles.badgeInfo}>
                  <View style={styles.badgeTitleRow}>
                    <Text style={[styles.badgeTitle, !badge.unlocked && styles.lockedText]}>
                      {badge.title}
                    </Text>
                    {badge.unlocked ? (
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    ) : (
                      <Ionicons name="lock-closed" size={14} color="#64748B" />
                    )}
                  </View>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(100, (badge.progress / badge.maxProgress) * 100)}%`,
                          backgroundColor: badge.unlocked ? '#10B981' : '#38BDF8',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {badge.progress} / {badge.maxProgress}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  userHandle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rankDescription: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F44',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FCD34D',
  },
  levelProgressSection: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  levelProgressNumbers: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  levelTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  levelFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelHint: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'right',
  },
  waysToEarnCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  earnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  earnItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  earnPoints: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 2,
  },
  earnLabel: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  subscriptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  badgesGrid: {
    gap: 12,
  },
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  lockedBadgeCard: {
    opacity: 0.7,
    borderColor: '#33415555',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  unlockedIcon: {
    backgroundColor: '#78350F44',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  lockedIcon: {
    backgroundColor: '#0F172A',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  lockedText: {
    color: '#94A3B8',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  progressContainer: {
    height: 5,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'right',
  },
});
