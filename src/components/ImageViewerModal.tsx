import React, { useState } from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHighResImageUrl, remoteImageSource } from '../utils/remoteImage';

interface ImageViewerModalProps {
  uri?: string;
  visible: boolean;
  onClose: () => void;
  accessibilityLabel?: string;
}

/** Full-screen, uncropped view of an image in the best resolution its provider offers. */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ uri, visible, onClose, accessibilityLabel }) => {
  const insets = useSafeAreaInsets();
  const highRes = getHighResImageUrl(uri);
  // Fall back to the original URL if the high-resolution variant fails to load.
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const source = highRes && highRes !== failedUri ? highRes : uri;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Cerrar imagen"
        />
        {/* pointerEvents none: tapping the image (or its letterbox) also closes the viewer. */}
        <Image
          source={remoteImageSource(source)}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
          onError={() => {
            if (source === highRes && highRes !== uri) setFailedUri(highRes);
          }}
        />
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar imagen"
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
