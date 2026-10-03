import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ width = '100%', height, radius = 8, style }) => {
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { width, height, borderRadius: radius, opacity }, style]} />;
};

export const MediaCardSkeleton: React.FC = () => (
  <View style={styles.card} accessibilityLabel="Cargando elemento">
    <SkeletonBlock width={86} height={128} radius={10} />
    <View style={styles.cardContent}>
      <SkeletonBlock width="35%" height={12} />
      <SkeletonBlock width="85%" height={16} />
      <SkeletonBlock width="60%" height={12} />
      <SkeletonBlock width="45%" height={12} />
      <SkeletonBlock width="70%" height={22} radius={11} />
    </View>
  </View>
);

export const MediaListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={styles.listPadding}>
    {Array.from({ length: count }, (_, i) => (
      <MediaCardSkeleton key={i} />
    ))}
  </View>
);

export const ListChipsSkeleton: React.FC = () => (
  <View style={styles.chipsRow} accessibilityLabel="Cargando listas">
    {[110, 90, 130].map((w, i) => (
      <SkeletonBlock key={i} width={w} height={34} radius={17} />
    ))}
  </View>
);

export const UserRowSkeleton: React.FC = () => (
  <View style={styles.userRow}>
    <SkeletonBlock width={40} height={40} radius={20} />
    <View style={styles.userInfo}>
      <SkeletonBlock width="55%" height={14} />
      <SkeletonBlock width="35%" height={11} />
    </View>
    <SkeletonBlock width={84} height={30} radius={15} />
  </View>
);

export const UserListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.listPadding} accessibilityLabel="Cargando usuarios">
    {Array.from({ length: count }, (_, i) => (
      <UserRowSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#334155',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  cardContent: {
    flex: 1,
    gap: 9,
  },
  listPadding: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  chipsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
});
