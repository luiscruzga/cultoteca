import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { YouTubeEmbed } from './YouTubeEmbed';
import { remoteImageSource } from '../utils/remoteImage';

const BACKGROUND = '#0F172A';

interface TrailerHeroProps {
  videoId: string;
  title: string;
  backdropUrl?: string;
  posterUrl?: string;
  onPress: () => void;
}

/**
 * Cabecera 16:9 con el trailer en reproducción automática, silenciado y en bucle,
 * difuminado hacia el fondo del detalle (estilo Netflix). Al tocarla se abre en grande.
 */
export const TrailerHero: React.FC<TrailerHeroProps> = ({ videoId, title, backdropUrl, posterUrl, onPress }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const fallbackUri = backdropUrl || posterUrl;

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Ver trailer de ${title} con sonido`}
    >
      {fallbackUri ? (
        <Image
          source={remoteImageSource(fallbackUri)}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          // Sin backdrop horizontal (p. ej. anime) el póster se difumina para no verse recortado
          blurRadius={backdropUrl ? 0 : 12}
        />
      ) : null}

      {!hasFailed ? (
        // pointerEvents none: el toque llega a la cabecera y no a los controles de YouTube
        <View pointerEvents="none" style={[styles.videoLayer, !isPlaying && styles.hidden]}>
          <YouTubeEmbed
            videoId={videoId}
            muted
            controls={false}
            loop
            onPlaying={() => setIsPlaying(true)}
            onError={() => setHasFailed(true)}
          />
        </View>
      ) : null}

      <LinearGradient
        pointerEvents="none"
        colors={[`${BACKGROUND}B3`, 'transparent']}
        style={styles.topFade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `${BACKGROUND}CC`, BACKGROUND]}
        locations={[0, 0.65, 1]}
        style={styles.bottomFade}
      />

      <View pointerEvents="none" style={styles.hintRow}>
        <View style={styles.playPill}>
          <Ionicons name="play" size={14} color="#0F172A" />
          <Text style={styles.playText}>Ver trailer</Text>
        </View>
        <View style={styles.mutedBadge}>
          <Ionicons name="volume-mute" size={14} color="#F8FAFC" />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    // Sale del padding horizontal y superior del ScrollView del detalle
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 12,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: BACKGROUND,
  },
  videoLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Ligero zoom para recortar los restos de interfaz de YouTube en los bordes
    transform: [{ scale: 1.2 }],
  },
  hidden: {
    opacity: 0,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  hintRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  playText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  mutedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A99',
    borderWidth: 1,
    borderColor: '#F8FAFC55',
  },
});
