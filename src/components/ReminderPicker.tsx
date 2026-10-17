import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  REMINDER_PRESETS,
  REMINDER_UNITS,
  ReminderUnit,
  canScheduleReminders,
  formatReminderOffset,
} from '../services/eventReminderService';

interface ReminderPickerProps {
  /** Minutos antes del evento, uno por recordatorio. */
  value: number[];
  onChange: (offsetsMinutes: number[]) => void;
  /** Sin título ni nota de plataforma (dentro del detalle). */
  compact?: boolean;
}

/** Selección múltiple de recordatorios: presets + uno personalizado (cantidad y unidad, sin teclado). */
export const ReminderPicker: React.FC<ReminderPickerProps> = ({ value, onChange, compact }) => {
  const [isCustomOpen, setCustomOpen] = useState(false);
  const [amount, setAmount] = useState(3);
  const [unit, setUnit] = useState<ReminderUnit>('days');

  const presetMinutes = new Set(REMINDER_PRESETS.map(p => p.minutes));
  const customValues = value.filter(m => !presetMinutes.has(m)).sort((a, b) => a - b);

  const toggle = (minutes: number) =>
    onChange(value.includes(minutes) ? value.filter(m => m !== minutes) : [...value, minutes]);

  const addCustom = () => {
    const minutes = amount * (REMINDER_UNITS.find(u => u.key === unit)?.minutes ?? 1);
    if (!value.includes(minutes)) onChange([...value, minutes]);
    setCustomOpen(false);
  };

  return (
    <View style={styles.container}>
      {!compact ? <Text style={styles.label}>Avísame</Text> : null}
      <View style={styles.chipsRow}>
        {REMINDER_PRESETS.map(preset => {
          const active = value.includes(preset.minutes);
          return (
            <TouchableOpacity
              key={preset.minutes}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(preset.minutes)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <Ionicons name={active ? 'notifications' : 'notifications-outline'} size={13} color={active ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}</Text>
            </TouchableOpacity>
          );
        })}
        {customValues.map(minutes => (
          <TouchableOpacity
            key={minutes}
            style={[styles.chip, styles.chipActive]}
            onPress={() => toggle(minutes)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: true }}
          >
            <Ionicons name="notifications" size={13} color="#0F172A" />
            <Text style={[styles.chipText, styles.chipTextActive]}>{formatReminderOffset(minutes)}</Text>
            <Ionicons name="close" size={13} color="#0F172A" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.chip, styles.chipDashed]} onPress={() => setCustomOpen(o => !o)}>
          <Ionicons name={isCustomOpen ? 'remove' : 'add'} size={14} color="#38BDF8" />
          <Text style={[styles.chipText, { color: '#38BDF8' }]}>Personalizado</Text>
        </TouchableOpacity>
      </View>

      {isCustomOpen ? (
        <View style={styles.customBox}>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setAmount(a => Math.max(1, a - 1))} accessibilityLabel="Menos">
              <Ionicons name="remove" size={18} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{amount}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setAmount(a => Math.min(99, a + 1))} accessibilityLabel="Más">
              <Ionicons name="add" size={18} color="#F8FAFC" />
            </TouchableOpacity>
            <View style={styles.unitsRow}>
              {REMINDER_UNITS.map(u => (
                <TouchableOpacity
                  key={u.key}
                  style={[styles.unitChip, unit === u.key && styles.unitChipActive]}
                  onPress={() => setUnit(u.key)}
                >
                  <Text style={[styles.unitText, unit === u.key && styles.unitTextActive]}>{u.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={addCustom} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={16} color="#0F172A" />
            <Text style={styles.addBtnText}>Añadir aviso {amount} {REMINDER_UNITS.find(u => u.key === unit)?.label} antes</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {value.length === 0 ? <Text style={styles.note}>Sin avisos: no se te notificará.</Text> : null}
      {!compact && !canScheduleReminders() ? (
        <Text style={styles.note}>Los avisos se programan en la app Android; aquí solo se guarda tu elección.</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  chipDashed: {
    borderStyle: 'dashed',
    borderColor: '#38BDF8',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  customBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  unitText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    paddingVertical: 9,
  },
  addBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },
  note: {
    color: '#64748B',
    fontSize: 12,
  },
});
