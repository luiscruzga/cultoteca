import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StreamingProvider } from '../types';
import { resolvePlatformBranding } from '../utils/platformLogos';

interface ProviderBadgeProps {
  provider: StreamingProvider;
  compact?: boolean;
  category?: string;
  style?: StyleProp<ViewStyle>;
  hideText?: boolean;
  /** Only used in full mode: makes the badge open the provider destination. */
  onPress?: () => void;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  compact = false,
  category,
  style,
  hideText = false,
  onPress,
}) => {
  const [imageError, setImageError] = useState(false);

  const branding = resolvePlatformBranding(provider.name, provider.logoUrl, category);
  const hasValidLogo = Boolean(branding.logoUrl && !imageError);

  const getTypeLabel = (type: StreamingProvider['type']) => {
    switch (type) {
      case 'stream':
        return 'Streaming';
      case 'rent':
        return 'Alquiler';
      case 'buy':
        return 'Compra';
      case 'read':
        return 'Lectura';
      case 'borrow':
        return 'Préstamo';
      default:
        return 'Disponible';
    }
  };

  // Modo Compacto (Tarjetas de búsqueda, lista y carruseles)
  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { borderColor: branding.color ? `${branding.color}55` : '#334155' },
          style,
        ]}
      >
        {hasValidLogo ? (
          <Image
            source={{ uri: branding.logoUrl }}
            style={styles.compactLogoImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.compactIconContainer,
              { backgroundColor: branding.color ? `${branding.color}33` : '#334155' },
            ]}
          >
            <Ionicons
              name={branding.fallbackIcon as any}
              size={11}
              color={branding.color || '#38BDF8'}
            />
          </View>
        )}

        {!hideText && (
          <Text style={styles.compactText} numberOfLines={1} ellipsizeMode="tail">
            {branding.shortName}
          </Text>
        )}
      </View>
    );
  }

  // Modo Estándar / Detalle (MediaDetailModal)
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={[
        styles.fullContainer,
        { borderColor: branding.color ? `${branding.color}66` : '#334155' },
        style,
      ]}
      {...(onPress
        ? { onPress, activeOpacity: 0.7, accessibilityRole: 'link' as const, accessibilityLabel: `Abrir en ${branding.name}` }
        : {})}
    >
      {hasValidLogo ? (
        <Image
          source={{ uri: branding.logoUrl }}
          style={styles.fullLogoImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.fullIconContainer,
            { backgroundColor: branding.color ? `${branding.color}33` : '#1E293B' },
          ]}
        >
          <Ionicons
            name={branding.fallbackIcon as any}
            size={16}
            color={branding.color || '#38BDF8'}
          />
        </View>
      )}

      <View style={styles.fullInfoContainer}>
        <Text style={styles.fullTitle} numberOfLines={1}>
          {branding.name}
        </Text>
        <Text style={styles.fullSubtitle}>
          {getTypeLabel(provider.type)}
        </Text>
      </View>

      {onPress && <Ionicons name="open-outline" size={14} color="#94A3B8" style={styles.fullOpenIcon} />}
    </Container>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4,
    maxWidth: 130,
    flexShrink: 1,
  },
  compactLogoImage: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    marginRight: 4,
  },
  compactIconContainer: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0',
    flexShrink: 1,
  },

  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 130,
  },
  fullLogoImage: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    marginRight: 10,
  },
  fullIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fullInfoContainer: {
    justifyContent: 'center',
  },
  fullOpenIcon: {
    marginLeft: 8,
  },
  fullTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fullSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
