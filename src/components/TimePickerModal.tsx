import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TimeValue {
  h: number;
  m: number;
}

interface TimePickerModalProps {
  visible: boolean;
  value: TimeValue | null;
  onSelect: (time: TimeValue) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, '0');

/** Selector de hora táctil: rejilla de horas (00–23) y minutos de 5 en 5, sin teclado. */
export const TimePickerModal: React.FC<TimePickerModalProps> = ({ visible, value, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      {/* Se remonta en cada apertura para partir de la hora actual del formulario sin efectos. */}
      {visible ? <TimePickerContent key={`${value?.h ?? 'x'}:${value?.m ?? 'x'}`} value={value} onSelect={onSelect} onClose={onClose} /> : null}
    </View>
  </Modal>
);

const TimePickerContent: React.FC<Omit<TimePickerModalProps, 'visible'>> = ({ value, onSelect, onClose }) => {
  const [hour, setHour] = useState(value?.h ?? 20);
  const [minute, setMinute] = useState(value?.m ?? 0);

  return (
        <View style={styles.card}>
          <Text style={styles.preview}>
            {pad(hour)}:{pad(minute)}
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Hora</Text>
            <View style={styles.grid}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.chip, styles.hourChip, hour === h && styles.chipActive]}
                  onPress={() => setHour(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${h} horas`}
                >
                  <Text style={[styles.chipText, hour === h && styles.chipTextActive]}>{pad(h)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Minutos</Text>
            <View style={styles.grid}>
              {MINUTES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, styles.minuteChip, minute === m && styles.chipActive]}
                  onPress={() => setMinute(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m} minutos`}
                >
                  <Text style={[styles.chipText, minute === m && styles.chipTextActive]}>:{pad(m)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.footerCancel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                onSelect({ h: hour, m: minute });
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  preview: {
    color: '#F8FAFC',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 6,
  },
  scroll: {
    flexGrow: 0,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 9,
  },
  hourChip: {
    width: '15.2%',
  },
  minuteChip: {
    width: '15.2%',
  },
  chipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  chipText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerCancel: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  confirmText: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
