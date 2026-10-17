import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarPickerModal } from './CalendarPickerModal';
import { TimePickerModal, TimeValue } from './TimePickerModal';
import { isPastIso } from '../utils/eventDates';

export interface EventScheduleValue {
  date: Date | null;
  time: TimeValue | null;
  allDay: boolean;
  location: string;
  /** Ocultar el evento de la lista cuando ya haya pasado. */
  hideWhenPast: boolean;
}

export const EMPTY_EVENT_SCHEDULE: EventScheduleValue = {
  date: null,
  time: null,
  allDay: false,
  location: '',
  hideWhenPast: true,
};

/** ISO (UTC) de la fecha elegida, o null si falta la fecha (o la hora sin "todo el día"). */
export const scheduleToIso = (value: EventScheduleValue): string | null => {
  if (!value.date) return null;
  if (!value.allDay && !value.time) return null;
  const d = new Date(
    value.date.getFullYear(),
    value.date.getMonth(),
    value.date.getDate(),
    value.allDay ? 0 : value.time!.h,
    value.allDay ? 0 : value.time!.m,
    0,
    0
  );
  return d.toISOString();
};

/** Valor del formulario a partir de una fecha detectada en la publicación. */
export const isoToSchedule = (iso: string, hasTime: boolean, location = '', hideWhenPast = true): EventScheduleValue => {
  const d = new Date(iso);
  return {
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    time: hasTime ? { h: d.getHours(), m: d.getMinutes() } : null,
    allDay: !hasTime,
    location,
    hideWhenPast,
  };
};

interface HideWhenPastSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Interruptor "Ocultar de la lista cuando pase"; se reutiliza al agregar un evento encontrado en la búsqueda. */
export const HideWhenPastSwitch: React.FC<HideWhenPastSwitchProps> = ({ value, onChange }) => (
  <View style={styles.switchRow}>
    <View style={styles.switchTextBlock}>
      <Text style={styles.switchLabel}>Ocultar de la lista cuando pase</Text>
      <Text style={styles.switchHint}>Seguirá disponible en «Eventos pasados».</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: '#334155', true: '#0284C7' }}
      thumbColor={value ? '#38BDF8' : '#94A3B8'}
    />
  </View>
);

const pad = (n: number) => String(n).padStart(2, '0');

interface EventScheduleFieldsProps {
  value: EventScheduleValue;
  onChange: (value: EventScheduleValue) => void;
  /** La fecha se precargó desde la publicación. */
  detectedFromPost?: boolean;
}

/** Fecha, hora, "todo el día" y lugar de un evento; fecha y hora se eligen con selectores, nunca se escriben. */
export const EventScheduleFields: React.FC<EventScheduleFieldsProps> = ({ value, onChange, detectedFromPost }) => {
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [isTimeOpen, setTimeOpen] = useState(false);

  const iso = scheduleToIso(value);
  const isPast = iso ? isPastIso(iso) : false;
  const dateLabel = value.date
    ? value.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Elegir fecha';
  const timeLabel = value.time ? `${pad(value.time.h)}:${pad(value.time.m)}` : 'Elegir hora';

  return (
    <View style={styles.container}>
      {detectedFromPost ? (
        <View style={styles.detectedRow}>
          <Ionicons name="sparkles" size={14} color="#FBBF24" />
          <Text style={styles.detectedText}>Fecha detectada en la publicación. Revísala y corrígela si hace falta.</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Fecha del evento *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.pickerBtn, styles.pickerBtnDate, !value.date && styles.pickerBtnEmpty]}
          onPress={() => setCalendarOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Elegir la fecha del evento"
        >
          <Ionicons name="calendar-outline" size={18} color={value.date ? '#38BDF8' : '#64748B'} />
          <Text style={[styles.pickerText, !value.date && styles.pickerTextEmpty]} numberOfLines={1}>
            {dateLabel}
          </Text>
        </TouchableOpacity>
        {!value.allDay ? (
          <TouchableOpacity
            style={[styles.pickerBtn, styles.pickerBtnTime, !value.time && styles.pickerBtnEmpty]}
            onPress={() => setTimeOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Elegir la hora del evento"
          >
            <Ionicons name="time-outline" size={18} color={value.time ? '#38BDF8' : '#64748B'} />
            <Text style={[styles.pickerText, !value.time && styles.pickerTextEmpty]}>{timeLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Todo el día</Text>
        <Switch
          value={value.allDay}
          onValueChange={allDay => onChange({ ...value, allDay })}
          trackColor={{ false: '#334155', true: '#0284C7' }}
          thumbColor={value.allDay ? '#38BDF8' : '#94A3B8'}
        />
      </View>

      {!iso ? (
        <Text style={styles.hint}>
          {value.date ? 'Elige la hora o marca "Todo el día".' : 'Elige el día del evento en el calendario.'}
        </Text>
      ) : isPast ? (
        <View style={styles.warningRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#FBBF24" />
          <Text style={styles.warningText}>Esa fecha ya pasó. Puedes guardarlo igual, pero no se programarán avisos.</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Lugar (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Movistar Arena, Santiago"
        placeholderTextColor="#64748B"
        value={value.location}
        onChangeText={location => onChange({ ...value, location })}
      />

      <HideWhenPastSwitch value={value.hideWhenPast} onChange={hideWhenPast => onChange({ ...value, hideWhenPast })} />

      <CalendarPickerModal
        visible={isCalendarOpen}
        value={value.date}
        onSelect={date => onChange({ ...value, date })}
        onClose={() => setCalendarOpen(false)}
      />
      <TimePickerModal
        visible={isTimeOpen}
        value={value.time}
        onSelect={time => onChange({ ...value, time })}
        onClose={() => setTimeOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBBF2415',
    borderWidth: 1,
    borderColor: '#FBBF2455',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  detectedText: {
    flex: 1,
    color: '#FDE68A',
    fontSize: 12,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerBtnDate: {
    flex: 1,
  },
  pickerBtnTime: {
    minWidth: 118,
  },
  pickerBtnEmpty: {
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  pickerText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  pickerTextEmpty: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  switchTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  switchHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  hint: {
    color: '#64748B',
    fontSize: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: {
    flex: 1,
    color: '#FBBF24',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
});
