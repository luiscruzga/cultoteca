import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarPickerModalProps {
  visible: boolean;
  value: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const isSameDay = (a: Date | null, b: Date) =>
  Boolean(a) && a!.getFullYear() === b.getFullYear() && a!.getMonth() === b.getMonth() && a!.getDate() === b.getDate();

/** Calendario mensual táctil con el estilo de la app (semana que empieza en lunes). */
export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({ visible, value, onSelect, onClose }) => {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(value ?? today));

  // Celdas: 6 filas × 7 columnas, con los días de los meses contiguos atenuados.
  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const moveMonth = (delta: number) => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.navBtn} accessibilityLabel="Mes anterior">
              <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => moveMonth(1)} style={styles.navBtn} accessibilityLabel="Mes siguiente">
              <Ionicons name="chevron-forward" size={20} color="#F8FAFC" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map(day => {
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const selected = isSameDay(value, day);
              const isToday = isSameDay(today, day);
              const isPast = day.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[styles.cell, selected && styles.cellSelected, isToday && !selected && styles.cellToday]}
                  onPress={() => {
                    onSelect(new Date(day.getFullYear(), day.getMonth(), day.getDate()));
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                >
                  <Text
                    style={[
                      styles.cellText,
                      !inMonth && styles.cellTextMuted,
                      isPast && inMonth && !selected && styles.cellTextPast,
                      selected && styles.cellTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => {
                setViewMonth(startOfMonth(today));
                onSelect(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
                onClose();
              }}
            >
              <Text style={styles.footerLink}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.footerCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  monthLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellSelected: {
    backgroundColor: '#0284C7',
  },
  cellToday: {
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  cellText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  cellTextMuted: {
    color: '#475569',
  },
  cellTextPast: {
    color: '#94A3B8',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerLink: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  footerCancel: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
