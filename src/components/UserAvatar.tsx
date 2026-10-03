import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { remoteImageSource } from '../utils/remoteImage';

interface UserAvatarProps {
  name?: string;
  avatar?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  borderColor?: string;
  borderWidth?: number;
}

const STOCK_UNSPLASH_PLACEHOLDER = 'photo-1535713875002-d1d0cf377fde';

const INITIALS_PALETTE = [
  { bg: '#E50914', text: '#FFFFFF' }, // Crimson Culto
  { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
  { bg: '#0284C7', text: '#FFFFFF' }, // Sky Blue
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
  { bg: '#F59E0B', text: '#0F172A' }, // Amber
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
];

export const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getColorForName = (name?: string) => {
  if (!name) return INITIALS_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % INITIALS_PALETTE.length;
  return INITIALS_PALETTE[index];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Usuario',
  avatar,
  size = 36,
  style,
  imageStyle,
  borderColor,
  borderWidth,
}) => {
  const hasValidCustomAvatar =
    Boolean(avatar && avatar.trim().length > 0 && !avatar.includes(STOCK_UNSPLASH_PLACEHOLDER));

  const borderStyles = borderColor
    ? {
        borderWidth: borderWidth ?? 2,
        borderColor,
      }
    : {};

  if (hasValidCustomAvatar) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius: size / 2 },
          borderStyles,
          style,
        ]}
      >
        <Image
          source={remoteImageSource(avatar)}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
            imageStyle,
          ]}
        />
      </View>
    );
  }

  const initials = getInitials(name);
  const color = getColorForName(name);
  const fontSize = Math.max(11, Math.floor(size * 0.42));

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.bg,
        },
        borderStyles,
        style,
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            color: color.text,
            fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  image: {
    resizeMode: 'cover',
  },
  initialsText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
