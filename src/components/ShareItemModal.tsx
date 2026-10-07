import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, MediaItem } from '../types';
import { LIST_CONTENT_TYPES, toListContentType } from '../utils/listCategories';

export interface ShareDestination {
  list: CollaborativeList;
  /** Relación del usuario con la lista, para la etiqueta de la fila. */
  relation: 'owner' | 'collaborator' | 'follower';
  alreadyAdded: boolean;
}

interface ShareItemModalProps {
  visible: boolean;
  item: MediaItem | null;
  destinations: ShareDestination[];
  onShareToList: (listId: string, item: MediaItem) => Promise<boolean>;
  /** Fuera de una lista (p. ej. vista previa de búsqueda) solo se comparte con otras apps. */
  showListSection?: boolean;
  onClose: () => void;
}

const RELATION_LABELS: Record<ShareDestination['relation'], string> = {
  owner: 'Tu lista',
  collaborator: 'Colaboras',
  follower: 'La sigues',
};

const SYNOPSIS_MAX = 160;

/** Mejor enlace para abrir la obra fuera de Cultoteca. */
const bestLink = (item: MediaItem): string | undefined =>
  item.url ||
  item.whereToWatchOrRead?.find(p => p.url && p.linkKind === 'direct')?.url ||
  item.externalLinks?.[0]?.url ||
  item.whereToWatchOrRead?.find(p => p.url)?.url;

export const buildShareMessage = (item: MediaItem): string => {
  const type = LIST_CONTENT_TYPES.find(t => t.key === toListContentType(item.category));
  const year = item.year ? ` (${item.year})` : '';
  const lines = [`${type?.emoji ?? '✨'} «${item.title}»${year}${type && type.key !== 'other' ? ` · ${type.label}` : ''}`];
  const synopsis = item.synopsis?.trim();
  if (synopsis) {
    lines.push(synopsis.length > SYNOPSIS_MAX ? `${synopsis.slice(0, SYNOPSIS_MAX).trimEnd()}…` : synopsis);
  }
  const link = bestLink(item);
  if (link) lines.push(link);
  lines.push('Compartido desde Cultoteca');
  return lines.join('\n\n');
};

export const ShareItemModal: React.FC<ShareItemModalProps> = ({
  visible,
  item,
  destinations,
  onShareToList,
  showListSection = true,
  onClose,
}) => {
  const [savingListId, setSavingListId] = useState<string | null>(null);
  const [addedListIds, setAddedListIds] = useState<string[]>([]);

  const handleClose = () => {
    setSavingListId(null);
    setAddedListIds([]);
    onClose();
  };

  if (!item) return null;

  const handleShareExternal = async () => {
    try {
      await Share.share({ message: buildShareMessage(item), title: item.title });
    } catch (err) {
      console.warn('[ShareItemModal] Error al compartir:', err);
    }
  };

  const handleShareToList = async (listId: string) => {
    if (savingListId) return;
    setSavingListId(listId);
    try {
      if (await onShareToList(listId, item)) {
        setAddedListIds(prev => [...prev, listId]);
      }
    } finally {
      setSavingListId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Compartir</Text>
            <TouchableOpacity onPress={handleClose} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            «{item.title}»
          </Text>

          <TouchableOpacity style={styles.externalBtn} onPress={handleShareExternal} activeOpacity={0.8}>
            <Ionicons name="share-social" size={18} color="#FFFFFF" />
            <View style={styles.externalTextBox}>
              <Text style={styles.externalTitle}>Compartir en otras apps</Text>
              <Text style={styles.externalHint}>WhatsApp, Telegram, Instagram y más</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#E0F2FE" />
          </TouchableOpacity>

          {showListSection && <Text style={styles.sectionLabel}>Agregar a otra lista</Text>}
          {!showListSection ? null : destinations.length === 0 ? (
            <Text style={styles.emptyText}>
              No tienes otras listas que acepten este tipo de contenido. Crea una lista o sigue una lista pública
              abierta a aportes.
            </Text>
          ) : (
            <ScrollView style={styles.listScroll}>
              {destinations.map(({ list, relation, alreadyAdded }) => {
                const added = alreadyAdded || addedListIds.includes(list.id);
                const saving = savingListId === list.id;
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[styles.listRow, added && styles.listRowDisabled]}
                    onPress={() => handleShareToList(list.id)}
                    disabled={added || Boolean(savingListId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={list.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                      size={18}
                      color="#38BDF8"
                    />
                    <View style={styles.listInfo}>
                      <Text style={styles.listName} numberOfLines={1}>
                        {list.title}
                      </Text>
                      <Text style={styles.listMeta}>
                        {RELATION_LABELS[relation]} • {list.items.length} obras
                      </Text>
                    </View>
                    {saving ? (
                      <ActivityIndicator size="small" color="#38BDF8" />
                    ) : added ? (
                      <View style={styles.addedPill}>
                        <Ionicons name="checkmark" size={12} color="#10B981" />
                        <Text style={styles.addedText}>{addedListIds.includes(list.id) ? 'Agregada' : 'Ya está'}</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle-outline" size={22} color="#38BDF8" />
                    )}
                  </TouchableOpacity>
                );
              })}
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
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  externalTextBox: {
    flex: 1,
  },
  externalTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  externalHint: {
    color: '#E0F2FE',
    fontSize: 11,
    marginTop: 2,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  listScroll: {
    maxHeight: 300,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  listRowDisabled: {
    opacity: 0.6,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  listMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  addedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
});
