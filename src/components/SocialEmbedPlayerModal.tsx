import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinkEmbed, describeEmbedKind } from '../utils/linkEmbeds';
import { SocialEmbed } from './SocialEmbed';

interface SocialEmbedPlayerModalProps {
  embed: LinkEmbed | null;
  /** Enlace original, para abrirlo fuera si el embed falla. */
  url?: string;
  title: string;
  visible: boolean;
  onClose: () => void;
}

/** Publicación o vídeo social a pantalla completa, con sonido y orientación libre. */
export const SocialEmbedPlayerModal: React.FC<SocialEmbedPlayerModalProps> = ({ embed, url, title, visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [hasFailed, setHasFailed] = React.useState(false);

  if (!embed) return null;
  const isWide = embed.kind === 'youtube' || embed.kind === 'facebook-video';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop}>
        {visible && !hasFailed ? (
          <View style={isWide ? styles.widePlayer : styles.tallPlayer}>
            <SocialEmbed embed={embed} muted={false} fill={!isWide} onError={() => setHasFailed(true)} />
          </View>
        ) : null}

        {hasFailed ? (
          <View style={styles.errorBox}>
            <Ionicons name="videocam-off-outline" size={40} color="#EF4444" />
            <Text style={styles.errorText}>Esta publicación no se puede reproducir aquí.</Text>
            {url ? (
              <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(url).catch(() => {})}>
                <Text style={styles.openBtnText}>Abrir en {describeEmbedKind(embed.kind)}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          accessibilityLabel={`Cerrar ${title}`}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  widePlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: '100%',
    alignSelf: 'center',
  },
  tallPlayer: {
    flex: 1,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF33',
  },
  errorBox: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#F8FAFC',
    fontSize: 15,
    textAlign: 'center',
  },
  openBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  openBtnText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
