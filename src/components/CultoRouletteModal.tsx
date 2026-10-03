import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CultoRouletteService } from '../services/cultoRouletteService';
import { MediaItem } from '../types';
import { ProviderBadge } from './ProviderBadge';
import { RatingStars } from './RatingStars';
import { remoteImageSource } from '../utils/remoteImage';

interface CultoRouletteModalProps {
  visible: boolean;
  onClose: () => void;
  items: MediaItem[];
  listTitle: string;
  onViewSelected: (item: MediaItem) => void;
  onSpinComplete?: (winner: MediaItem | null) => void;
}

export const CultoRouletteModal: React.FC<CultoRouletteModalProps> = ({
  visible,
  onClose,
  items,
  listTitle,
  onViewSelected,
  onSpinComplete,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<MediaItem | null>(null);
  const [spinAnim] = useState(new Animated.Value(0));

  const unwatchedItems = items.filter(item => !item.isWatched);
  const [displayItem, setDisplayItem] = useState<MediaItem | null>(unwatchedItems[0] || null);

  useEffect(() => {
    if (unwatchedItems.length > 0) {
      if (!displayItem || displayItem.isWatched) {
        setDisplayItem(unwatchedItems[0]);
      }
    } else {
      setDisplayItem(null);
    }
  }, [items]);

  const handleSpin = () => {
    if (unwatchedItems.length === 0 || spinning) return;

    setSpinning(true);
    setSelectedWinner(null);

    // Fast cycling effect among unwatched items
    let count = 0;
    const maxCycles = 18;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * unwatchedItems.length);
      setDisplayItem(unwatchedItems[randomIdx]);
      count++;

      if (count >= maxCycles) {
        clearInterval(interval);
        const result = CultoRouletteService.spin(items);
        setSelectedWinner(result.selected);
        setDisplayItem(result.selected);
        setSpinning(false);
        onSpinComplete?.(result.selected);
      }
    }, 90);

    // Spin animation for wheel icon
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={styles.badgeRow}>
              <Ionicons name="dice" size={18} color="#F59E0B" />
              <Text style={styles.badgeText}>¿Qué vemos o leemos hoy?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {unwatchedItems.length} {unwatchedItems.length === 1 ? 'pendiente' : 'pendientes'} por ver en «{listTitle}»
          </Text>

          {/* Center Stage / Winner card */}
          {displayItem ? (
            <View style={[styles.cardStage, selectedWinner && styles.winnerCardStage]}>
              <Image source={remoteImageSource(displayItem.posterUrl)} style={styles.poster} resizeMode="cover" />
              <View style={styles.cardInfo}>
                {selectedWinner && (
                  <View style={styles.winnerBadge}>
                    <Ionicons name="trophy" size={14} color="#0F172A" />
                    <Text style={styles.winnerText}>¡Elegido del Culto!</Text>
                  </View>
                )}
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {displayItem.title}
                </Text>
                <Text style={styles.itemMeta}>
                  {displayItem.year ? `${displayItem.year} • ` : ''}{displayItem.category.toUpperCase()}
                </Text>
                <RatingStars rating={displayItem.averageRating} size={14} showText />

                <View style={styles.providersRow}>
                  {displayItem.whereToWatchOrRead.slice(0, 2).map(p => (
                    <ProviderBadge key={p.id} provider={p} compact category={displayItem.category} />
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyStage}>
              <Ionicons
                name={items.length > 0 ? 'checkmark-done-circle-outline' : 'albums-outline'}
                size={44}
                color={items.length > 0 ? '#10B981' : '#64748B'}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.emptyText}>
                {items.length > 0
                  ? '¡Excelente! Ya has visto, leído o jugado todos los títulos de esta lista. Añade nuevos para volver a girar la ruleta.'
                  : 'Agrega elementos a la lista para activar la ruleta'}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.spinButton, (spinning || unwatchedItems.length === 0) && styles.disabledButton]}
              onPress={handleSpin}
              disabled={spinning || unwatchedItems.length === 0}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <Ionicons name="sync" size={20} color="#0F172A" />
              </Animated.View>
              <Text style={styles.spinButtonText}>
                {spinning ? 'Girando ruleta...' : selectedWinner ? 'Volver a Girar' : 'Girar la Ruleta'}
              </Text>
            </TouchableOpacity>

            {selectedWinner && (
              <TouchableOpacity
                style={styles.viewWinnerBtn}
                onPress={() => {
                  onClose();
                  onViewSelected(selectedWinner);
                }}
              >
                <Ionicons name="eye-outline" size={18} color="#38BDF8" />
                <Text style={styles.viewWinnerText}>Ver Dónde Disfrutarlo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  cardStage: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
  },
  winnerCardStage: {
    borderColor: '#F59E0B',
    backgroundColor: '#1C1917',
  },
  poster: {
    width: 85,
    height: 125,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  winnerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 20,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  providersRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  emptyStage: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 10,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewWinnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewWinnerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
});
