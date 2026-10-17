import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../types';
import { DEFAULT_REMINDER_OFFSETS } from '../services/eventReminderService';
import { formatEventDateLong } from '../utils/eventDates';
import { HideWhenPastSwitch } from './EventScheduleFields';
import { ReminderPicker } from './ReminderPicker';

export interface EventAddOptions {
  reminderOffsets: number[];
  hideWhenPast: boolean;
}

interface EventAddOptionsSheetProps {
  visible: boolean;
  item: MediaItem | null;
  onConfirm: (options: EventAddOptions) => void;
  onClose: () => void;
}

const SheetContent: React.FC<{ item: MediaItem; onConfirm: (options: EventAddOptions) => void; onClose: () => void }> = ({
  item,
  onConfirm,
  onClose,
}) => {
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(DEFAULT_REMINDER_OFFSETS);
  const [hideWhenPast, setHideWhenPast] = useState(true);

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      {item.eventStartsAt ? (
        <View style={styles.metaRow}>
          <Ionicons name="calendar" size={15} color="#FB7185" />
          <Text style={styles.metaText}>{formatEventDateLong(item.eventStartsAt, item.eventAllDay)}</Text>
        </View>
      ) : null}
      {item.eventLocation ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color="#94A3B8" />
          <Text style={styles.metaText} numberOfLines={2}>
            {item.eventLocation}
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <ReminderPicker value={reminderOffsets} onChange={setReminderOffsets} />
        <View style={styles.divider} />
        <HideWhenPastSwitch value={hideWhenPast} onChange={setHideWhenPast} />
      </ScrollView>

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => onConfirm({ reminderOffsets, hideWhenPast })}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Ionicons name="add-circle" size={20} color="#0F172A" />
        <Text style={styles.confirmBtnText}>Agregar evento a la lista</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
        <Text style={styles.cancelBtnText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
};

/** Avisos y "ocultar al pasar" antes de agregar un evento encontrado en la búsqueda. */
export const EventAddOptionsSheet: React.FC<EventAddOptionsSheetProps> = ({ visible, item, onConfirm, onClose }) => (
  <Modal visible={visible && Boolean(item)} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
      {item ? <SheetContent key={item.id} item={item} onConfirm={onConfirm} onClose={onClose} /> : null}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginBottom: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
  },
  body: {
    marginTop: 8,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
