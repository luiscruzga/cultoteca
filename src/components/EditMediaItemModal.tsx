import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../types';
import { EditableItemFields } from '../utils/itemPermissions';
import { EMPTY_EVENT_SCHEDULE, EventScheduleFields, EventScheduleValue, isoToSchedule, scheduleToIso } from './EventScheduleFields';

interface EditMediaItemModalProps {
  visible: boolean;
  item: MediaItem | null;
  onClose: () => void;
  /** Recibe solo los campos que cambiaron; si lanza, el modal muestra el error y sigue abierto. */
  onSave: (changes: Partial<EditableItemFields>) => Promise<void>;
}

const creatorLabelFor = (category: string): string => {
  switch (category) {
    case 'book':
    case 'manga':
      return 'Autor(a)';
    case 'music':
      return 'Artista';
    case 'podcast':
      return 'Presentador(a)';
    case 'game':
      return 'Estudio / desarrollador';
    case 'boardgame':
      return 'Diseñador(a)';
    case 'recipe':
      return 'Cocina / autor(a)';
    case 'place':
      return 'Ubicación';
    default:
      return 'Director(a) / creador(a)';
  }
};

const scheduleFromItem = (item: MediaItem): EventScheduleValue =>
  item.eventStartsAt
    ? isoToSchedule(item.eventStartsAt, !item.eventAllDay, item.eventLocation ?? '', Boolean(item.eventHideWhenPast))
    : { ...EMPTY_EVENT_SCHEDULE, location: item.eventLocation ?? '', hideWhenPast: Boolean(item.eventHideWhenPast) };

/** Formulario con estado propio; se vuelve a montar por `key` con cada elemento para no sincronizar en efectos. */
const EditMediaItemForm: React.FC<{ item: MediaItem; onClose: () => void; onSave: EditMediaItemModalProps['onSave'] }> = ({
  item,
  onClose,
  onSave,
}) => {
  const isEvent = item.category === 'event';
  const isLink = item.category === 'link';
  const [title, setTitle] = useState(item.title);
  const [synopsis, setSynopsis] = useState(item.synopsis ?? '');
  const [posterUrl, setPosterUrl] = useState(item.posterUrl ?? '');
  const [genres, setGenres] = useState((item.genres ?? []).join(', '));
  const [year, setYear] = useState(item.year ? String(item.year) : '');
  const [director, setDirector] = useState(item.director ?? '');
  const [url, setUrl] = useState(item.url ?? '');
  const [schedule, setSchedule] = useState<EventScheduleValue>(() => scheduleFromItem(item));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventIso = isEvent ? scheduleToIso(schedule) : null;
  const canSave = title.trim().length > 0 && (!isEvent || Boolean(eventIso)) && !isSaving;

  const buildChanges = (): Partial<EditableItemFields> => {
    const changes: Partial<EditableItemFields> = {};
    const trimmedTitle = title.trim();
    if (trimmedTitle !== item.title) changes.title = trimmedTitle;
    const trimmedSynopsis = synopsis.trim();
    if (trimmedSynopsis !== (item.synopsis ?? '')) changes.synopsis = trimmedSynopsis;
    const trimmedPoster = posterUrl.trim();
    if (trimmedPoster && trimmedPoster !== item.posterUrl) changes.posterUrl = trimmedPoster;
    const genreList = genres.split(',').map(g => g.trim()).filter(Boolean);
    if (genreList.join('|') !== (item.genres ?? []).join('|')) changes.genres = genreList;
    if (isEvent) {
      if (eventIso !== item.eventStartsAt) changes.eventStartsAt = eventIso!;
      if (schedule.allDay !== Boolean(item.eventAllDay)) changes.eventAllDay = schedule.allDay;
      const location = schedule.location.trim() || undefined;
      if (location !== item.eventLocation) changes.eventLocation = location;
      if (schedule.hideWhenPast !== Boolean(item.eventHideWhenPast)) changes.eventHideWhenPast = schedule.hideWhenPast;
      if (changes.eventStartsAt) {
        changes.year = new Date(eventIso!).getFullYear();
        changes.releaseDate = eventIso!.split('T')[0];
      }
    } else if (!isLink) {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear) && parsedYear !== item.year) changes.year = parsedYear;
      const trimmedDirector = director.trim() || undefined;
      if (trimmedDirector !== item.director) changes.director = trimmedDirector;
    }
    if (isEvent || isLink) {
      const trimmedUrl = url.trim() || undefined;
      if (trimmedUrl !== item.url) changes.url = trimmedUrl;
    }
    return changes;
  };

  const handleSave = async () => {
    if (!canSave) return;
    const changes = buildChanges();
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(changes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el elemento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cancelar edición">
          <Ionicons name="close" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Editar {isEvent ? 'evento' : isLink ? 'enlace' : 'elemento'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          accessibilityLabel="Guardar cambios"
        >
          {isSaving ? <ActivityIndicator size="small" color="#0F172A" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Título *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Título" placeholderTextColor="#64748B" />

        {isEvent ? (
          <View style={styles.eventBlock}>
            <EventScheduleFields value={schedule} onChange={setSchedule} />
          </View>
        ) : null}

        {!isEvent && !isLink ? (
          <>
            <Text style={styles.fieldLabel}>Año</Text>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
              placeholder="Ej. 2024"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.fieldLabel}>{creatorLabelFor(item.category)}</Text>
            <TextInput style={styles.input} value={director} onChangeText={setDirector} placeholder="Opcional" placeholderTextColor="#64748B" />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>{isEvent ? 'Descripción' : 'Sinopsis'}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={synopsis}
          onChangeText={setSynopsis}
          multiline
          placeholder="Descripción"
          placeholderTextColor="#64748B"
        />

        {isEvent || isLink ? (
          <>
            <Text style={styles.fieldLabel}>Enlace</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://..."
              placeholderTextColor="#64748B"
            />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Géneros o etiquetas (separados por coma)</Text>
        <TextInput style={styles.input} value={genres} onChangeText={setGenres} placeholder="Ej. Drama, Comedia" placeholderTextColor="#64748B" />

        <Text style={styles.fieldLabel}>URL de portada</Text>
        <TextInput
          style={styles.input}
          value={posterUrl}
          onChangeText={setPosterUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://..."
          placeholderTextColor="#64748B"
        />

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color="#F87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.footnote}>Los comentarios, valoraciones y avisos del elemento se conservan.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const EditMediaItemModal: React.FC<EditMediaItemModalProps> = ({ visible, item, onClose, onSave }) => (
  <Modal visible={visible && Boolean(item)} animationType="slide" transparent={false} onRequestClose={onClose}>
    {item ? <EditMediaItemForm key={item.id} item={item} onClose={onClose} onSave={onSave} /> : null}
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  saveBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formContent: {
    paddingBottom: 60,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  eventBlock: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B80',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444455',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 13,
  },
  footnote: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 16,
  },
});
