import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList } from '../types';
import { ShareDestination } from './ShareItemModal';
import { detectPlatform } from '../services/api/linkPreviewService';

interface ShareTargetListPickerModalProps {
  visible: boolean;
  /** Enlace recibido desde otra aplicación. */
  url: string;
  /** Listas donde el usuario puede aportar enlaces o eventos. */
  destinations: ShareDestination[];
  onSelect: (list: CollaborativeList) => void;
  onCreateList: () => void;
  onClose: () => void;
}

const RELATION_LABELS: Record<ShareDestination['relation'], string> = {
  owner: 'Tu lista',
  collaborator: 'Colaboras',
  follower: 'La sigues',
};

/** Selector de lista de destino para un enlace compartido con Cultoteca desde otra app. */
export const ShareTargetListPickerModal: React.FC<ShareTargetListPickerModalProps> = ({
  visible,
  url,
  destinations,
  onSelect,
  onCreateList,
  onClose,
}) => {
  const platform = detectPlatform(url);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>¿A qué lista lo agregamos?</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cancelar">
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={[styles.linkRow, { borderColor: platform.platformColor }]}>
            <Ionicons name={platform.platformIcon as any} size={16} color={platform.platformColor} />
            <Text style={styles.linkText} numberOfLines={2}>
              {url}
            </Text>
          </View>

          {destinations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={34} color="#64748B" />
              <Text style={styles.emptyTitle}>No tienes listas que acepten enlaces o eventos</Text>
              <Text style={styles.emptyText}>
                Crea una lista (o permite Enlaces o Eventos en una existente) para guardar lo que compartes desde
                otras apps.
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={onCreateList} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color="#0F172A" />
                <Text style={styles.createBtnText}>Crear lista</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} keyboardShouldPersistTaps="handled">
              {destinations.map(({ list, relation }) => (
                <TouchableOpacity
                  key={list.id}
                  style={styles.listItem}
                  onPress={() => onSelect(list)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar a ${list.title}`}
                >
                  <Ionicons name="list" size={18} color="#38BDF8" />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName} numberOfLines={1}>
                      {list.title}
                    </Text>
                    <Text style={styles.listMeta}>
                      {list.items.length} {list.items.length === 1 ? 'obra' : 'obras'} • {RELATION_LABELS[relation]}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#64748B" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  linkText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
  },
  listScroll: {
    maxHeight: 320,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listInfo: {
    flex: 1,
    marginLeft: 10,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  listMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  createBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
});
