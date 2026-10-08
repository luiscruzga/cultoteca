import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YouTubeEmbed } from './YouTubeEmbed';
import { youtubeWatchUrl } from './youtubeEmbedConfig';

interface TrailerPlayerModalProps {
  videoId: string | null;
  title: string;
  visible: boolean;
  onClose: () => void;
}

/** Reproductor de trailer a pantalla completa, con sonido y controles de YouTube. */
export const TrailerPlayerModal: React.FC<TrailerPlayerModalProps> = ({ videoId, title, visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);

  if (!videoId) return null;
  const hasFailed = failedVideoId === videoId;

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
          <View style={styles.player}>
            <YouTubeEmbed videoId={videoId} controls onError={() => setFailedVideoId(videoId)} />
          </View>
        ) : null}

        {hasFailed ? (
          <View style={styles.errorBox}>
            <Ionicons name="logo-youtube" size={40} color="#EF4444" />
            <Text style={styles.errorText}>Este trailer no se puede reproducir aquí.</Text>
            <TouchableOpacity
              style={styles.youtubeBtn}
              onPress={() => Linking.openURL(youtubeWatchUrl(videoId)).catch(() => {})}
            >
              <Text style={styles.youtubeBtnText}>Abrir en YouTube</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          accessibilityLabel={`Cerrar trailer de ${title}`}
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
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: '100%',
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF22',
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
  youtubeBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  youtubeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
