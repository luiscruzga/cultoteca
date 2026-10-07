import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PointsToastPayload {
  points: number;
  missions: string[];
}

type Listener = (payload: PointsToastPayload) => void;
const listeners = new Set<Listener>();

/** Muestra el aviso de puntos en todos los hosts montados; solo el del modal superior queda visible. */
export function showPointsToast(payload: PointsToastPayload) {
  listeners.forEach(listener => listener(payload));
}

const VISIBLE_MS = 2600;

/** Host del aviso flotante «+N Puntos Culto». Se monta en la raíz y dentro de cada modal a pantalla completa. */
export const PointsToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<PointsToastPayload | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = next => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setPayload(next);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setPayload(null));
      }, VISIBLE_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [anim]);

  if (!payload) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  const mission = payload.missions[0];

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: insets.top + 12 }]}>
      <Animated.View style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]}>
        <Ionicons name={mission ? 'trophy' : 'sparkles'} size={18} color="#F59E0B" />
        <View style={styles.texts}>
          {payload.points > 0 && <Text style={styles.points}>+{payload.points} Puntos Culto</Text>}
          {mission && (
            <Text style={styles.mission} numberOfLines={1}>
              ¡Misión completada: {mission}
              {payload.missions.length > 1 ? ` y ${payload.missions.length - 1} más` : ''}!
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  texts: {
    flexShrink: 1,
  },
  points: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FCD34D',
  },
  mission: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
});
