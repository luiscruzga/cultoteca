import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinkEmbed } from '../utils/linkEmbeds';
import { SocialEmbed } from './SocialEmbed';

interface LinkEmbedHeroProps {
  embed: LinkEmbed;
  title: string;
  onError: () => void;
  onOpenFullscreen: () => void;
}

/**
 * Cabecera del detalle de un enlace social: el embed oficial reproduciéndose en silencio, con botones
 * propios para activar el sonido (recarga el embed con audio) y abrir a pantalla completa.
 * Los controles internos de los reproductores no son fiables dentro de un WebView.
 */
export const LinkEmbedHero: React.FC<LinkEmbedHeroProps> = ({ embed, title, onError, onOpenFullscreen }) => {
  const [muted, setMuted] = useState(true);

  return (
    <View style={styles.container}>
      <SocialEmbed embed={embed} muted={muted} onError={onError} />
      <View pointerEvents="box-none" style={styles.controlsRow}>
        {embed.supportsSound ? (
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setMuted(m => !m)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={muted ? `Activar sonido de ${title}` : `Silenciar ${title}`}
          >
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#F8FAFC" />
            <Text style={styles.controlText}>{muted ? 'Sonido' : 'Silenciar'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={onOpenFullscreen}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Ver ${title} a pantalla completa`}
        >
          <Ionicons name="expand" size={16} color="#F8FAFC" />
          <Text style={styles.controlText}>Pantalla completa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  controlsRow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172ACC',
    borderWidth: 1,
    borderColor: '#F8FAFC55',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controlText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
});
