import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { CollaborativeList, ListContentType } from '../types';
import {
  ALL_LIST_CONTENT_TYPES,
  LIST_CONTENT_TYPES,
  allowsAllCategories,
  getAllowedCategories,
} from '../utils/listCategories';
import { remoteImageSource } from '../utils/remoteImage';
import { AvatarPickerModal } from './AvatarPickerModal';

export interface ListFormValues {
  title: string;
  description: string;
  coverImage?: string;
  isPublic: boolean;
  allowContributions: boolean;
  allowedCategories: ListContentType[];
}

interface ListFormModalProps {
  visible: boolean;
  /** List being edited; omit to create a new one. */
  list?: CollaborativeList | null;
  saving: boolean;
  onSubmit: (values: ListFormValues) => void;
  onCancel: () => void;
}

const initialValues = (list?: CollaborativeList | null): ListFormValues => ({
  title: list?.title ?? '',
  description: list?.description ?? '',
  coverImage: list?.coverImage,
  isPublic: list?.isPublic ?? true,
  allowContributions: list?.allowContributions !== false,
  allowedCategories: getAllowedCategories(list),
});

/** Create/edit form for a collaborative list. Remount it (via `key`) to reset its values. */
export const ListFormModal: React.FC<ListFormModalProps> = ({ visible, list, saving, onSubmit, onCancel }) => {
  const isEdit = Boolean(list);
  const [values, setValues] = useState<ListFormValues>(() => initialValues(list));
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);

  const set = <K extends keyof ListFormValues>(key: K, value: ListFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const allSelected = allowsAllCategories(values.allowedCategories);
  const hasTypes = values.allowedCategories.length > 0;
  const canSave = Boolean(values.title.trim()) && hasTypes && !saving;

  const toggleType = (type: ListContentType) =>
    set(
      'allowedCategories',
      values.allowedCategories.includes(type)
        ? values.allowedCategories.filter(t => t !== type)
        : [...values.allowedCategories, type]
    );

  const handleSubmit = () => {
    if (!canSave) return;
    onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() });
  };

  const renderBinaryOption = (
    selected: boolean,
    options: { value: boolean; label: string; icon: keyof typeof Ionicons.glyphMap }[],
    onSelect: (value: boolean) => void
  ) => (
    <View style={styles.optionsRow}>
      {options.map(option => {
        const active = selected === option.value;
        return (
          <TouchableOpacity
            key={option.label}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onSelect(option.value)}
            disabled={saving}
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={option.icon} size={14} color={active ? '#0F172A' : '#94A3B8'} />
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => !saving && onCancel()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => !saving && onCancel()}
          accessibilityLabel="Cerrar formulario de lista"
        />
        <View style={styles.dialog}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{isEdit ? 'Editar lista' : 'Crear Nueva Lista Colaborativa'}</Text>

            <View style={styles.coverRow}>
              <TouchableOpacity
                style={styles.coverButton}
                onPress={() => setIsIconPickerVisible(true)}
                disabled={saving}
                accessibilityLabel="Cambiar ícono de la lista"
              >
                {values.coverImage ? (
                  <Image source={remoteImageSource(values.coverImage)} style={styles.coverImage} />
                ) : (
                  <Ionicons name="image-outline" size={22} color="#64748B" />
                )}
                <View style={styles.coverEditBadge}>
                  <Ionicons name="pencil" size={10} color="#0F172A" />
                </View>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.titleInput]}
                placeholder="Nombre de la lista (ej. Cine Noir de los 40)"
                placeholderTextColor="#64748B"
                value={values.title}
                onChangeText={text => set('title', text)}
                editable={!saving}
              />
            </View>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="Descripción para tus amigos..."
              placeholderTextColor="#64748B"
              multiline
              value={values.description}
              onChangeText={text => set('description', text)}
              editable={!saving}
            />

            <Text style={styles.label}>Visibilidad</Text>
            {renderBinaryOption(
              values.isPublic,
              [
                { value: true, label: 'Pública', icon: 'earth-outline' },
                { value: false, label: 'Privada', icon: 'lock-closed-outline' },
              ],
              v => set('isPublic', v)
            )}
            <Text style={styles.hint}>
              {values.isPublic
                ? 'Cualquier usuario podrá encontrarla en Explorar y en tu perfil.'
                : 'Solo tú y las personas que invites podrán verla.'}
            </Text>

            <Text style={styles.label}>¿Aceptar aportes de otros usuarios?</Text>
            {renderBinaryOption(
              values.allowContributions,
              [
                { value: true, label: 'Abiertos', icon: 'people-outline' },
                { value: false, label: 'Solo yo', icon: 'person-outline' },
              ],
              v => set('allowContributions', v)
            )}
            <Text style={styles.hint}>
              {values.allowContributions
                ? 'Los colaboradores y usuarios suscritos a la lista podrán agregar elementos.'
                : 'Solo tú podrás agregar elementos; los demás solo podrán verlos y comentarlos.'}
            </Text>

            <Text style={styles.label}>¿Qué se puede agregar?</Text>
            <View style={styles.typesWrap}>
              <TouchableOpacity
                style={[styles.typeChip, allSelected && styles.typeChipActive]}
                onPress={() => set('allowedCategories', allSelected ? [] : ALL_LIST_CONTENT_TYPES)}
                disabled={saving}
                accessibilityState={{ selected: allSelected }}
              >
                <Text style={[styles.typeChipText, allSelected && styles.typeChipTextActive]}>🌐 Todas</Text>
              </TouchableOpacity>
              {LIST_CONTENT_TYPES.map(type => {
                const active = values.allowedCategories.includes(type.key);
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => toggleType(type.key)}
                    disabled={saving}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {type.emoji} {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.hint, !hasTypes && styles.hintError]}>
              {hasTypes
                ? '«Otros» permite subir cualquier contenido manual con categorías personalizadas.'
                : 'Selecciona al menos un tipo de contenido.'}
            </Text>

            <View style={styles.buttonsRow}>
              <TouchableOpacity style={[styles.cancelBtn, saving && { opacity: 0.5 }]} onPress={onCancel} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !canSave && { opacity: saving ? 0.7 : 0.45 }]}
                onPress={handleSubmit}
                disabled={!canSave}
                accessibilityState={{ busy: saving, disabled: !canSave }}
              >
                {saving && <ActivityIndicator size="small" color="#0F172A" />}
                <Text style={styles.confirmBtnText}>
                  {saving ? (isEdit ? 'Guardando...' : 'Creando...') : isEdit ? 'Guardar cambios' : 'Crear Lista'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <AvatarPickerModal
        visible={isIconPickerVisible}
        onClose={() => setIsIconPickerVisible(false)}
        currentAvatar={values.coverImage}
        userName={values.title || 'Lista'}
        title="Ícono de la lista"
        subtitle="Elige una imagen cultural para identificar tu lista"
        onSelectAvatar={url => {
          if (url) set('coverImage', url);
          setIsIconPickerVisible(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  coverButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: 46,
    height: 46,
    borderRadius: 11,
  },
  coverEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 14,
  },
  titleInput: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  hintError: {
    color: '#F87171',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  optionActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optionTextActive: {
    color: '#0F172A',
  },
  typesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  typeChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeChipTextActive: {
    color: '#38BDF8',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: '#0F172A',
    fontWeight: '800',
  },
});
