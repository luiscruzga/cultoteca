import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  icon = 'help-circle-outline',
  iconColor,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animValue, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const resolvedIconColor = iconColor || (destructive ? '#EF4444' : '#38BDF8');

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onCancel}
      />
      <Animated.View
        style={[
          styles.dialogCard,
          {
            opacity: animValue,
            transform: [
              {
                scale: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Glow Icon Header */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: destructive
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(56, 189, 248, 0.12)',
              borderColor: destructive
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(56, 189, 248, 0.3)',
            },
          ]}
        >
          <Ionicons name={icon} size={30} color={resolvedIconColor} />
        </View>

        {/* Text Content */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              destructive ? styles.destructiveBtn : styles.primaryBtn,
            ]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  destructiveBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  primaryBtn: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
