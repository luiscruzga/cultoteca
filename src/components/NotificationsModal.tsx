import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollaborativeList, DirectRecommendation, ListActivityNotification, ListInvitation, MediaItem, UserProfile } from '../types';
import { StorageService } from '../services/storageService';
import { UserAvatar } from './UserAvatar';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  allLists: CollaborativeList[];
  onAddMediaToList: (listId: string, item: MediaItem) => void;
  onViewMediaDetail: (item: MediaItem) => void;
  onSelectList?: (list: CollaborativeList) => void;
  onRecommendationUpdated?: () => void;
  onInvitationResponded?: (list: CollaborativeList, accepted: boolean) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  currentUser,
  allLists,
  onAddMediaToList,
  onViewMediaDetail,
  onSelectList,
  onRecommendationUpdated,
  onInvitationResponded,
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'lists' | 'invites'>('recommendations');
  const [invitations, setInvitations] = useState<{ list: CollaborativeList; invitation: ListInvitation }[]>([]);
  const [respondingListId, setRespondingListId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<DirectRecommendation[]>([]);
  const [listNotifications, setListNotifications] = useState<ListActivityNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecForList, setSelectedRecForList] = useState<DirectRecommendation | null>(null);

  useEffect(() => {
    if (visible && currentUser) {
      loadAllNotifications();
    }
  }, [visible, currentUser]);

  const loadAllNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [recs, listNotifs, freshLists] = await Promise.all([
        StorageService.getDirectRecommendations(currentUser.id),
        StorageService.getListNotifications(currentUser.id),
        StorageService.getLists(),
      ]);
      setRecommendations(recs);
      setListNotifications(listNotifs);
      const pending = StorageService.getPendingInvitations(freshLists, currentUser.id);
      setInvitations(pending);
      if (pending.length > 0) setActiveTab('invites');
    } catch (e) {
      console.warn('Error loading notifications in modal:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (recId: string) => {
    try {
      const updated = await StorageService.markRecommendationAsRead(recId);
      setRecommendations(prev => prev.map(r => (r.id === recId ? { ...r, read: true } : r)));
      onRecommendationUpdated?.();
    } catch (e) {
      console.warn('Error marking recommendation read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      for (const rec of recommendations) {
        if (!rec.read) {
          await StorageService.markRecommendationAsRead(rec.id);
        }
      }
      setRecommendations(prev => prev.map(r => ({ ...r, read: true })));
      onRecommendationUpdated?.();
    } catch (e) {
      console.warn('Error marking all read:', e);
    }
  };

  const handleMarkListNotificationAsRead = async (notifId: string) => {
    try {
      const updated = await StorageService.markListNotificationAsRead(notifId);
      setListNotifications(updated);
      onRecommendationUpdated?.();
    } catch (e) {
      console.warn('Error marking list notification read:', e);
    }
  };

  const handleMarkAllListNotificationsAsRead = async () => {
    try {
      const updated = await StorageService.markAllListNotificationsAsRead(currentUser?.id);
      setListNotifications(updated);
      onRecommendationUpdated?.();
    } catch (e) {
      console.warn('Error marking all list notifications read:', e);
    }
  };

  const handleNavigateToList = (notif: ListActivityNotification) => {
    handleMarkListNotificationAsRead(notif.id);
    const target = allLists.find(l => l.id === notif.listId);
    if (target && onSelectList) {
      onSelectList(target);
      onClose();
    } else if (target) {
      Alert.alert('Lista encontrada', `Has seleccionado «${target.title}».`);
      onClose();
    } else {
      Alert.alert('Lista no disponible', 'La lista ya no se encuentra en el dispositivo o ha sido removida.');
    }
  };

  const handleRespondInvitation = async (list: CollaborativeList, accept: boolean) => {
    if (!currentUser || respondingListId) return;
    setRespondingListId(list.id);
    try {
      const updated = await StorageService.respondToListInvitation(
        list.id,
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
        accept
      );
      setInvitations(prev => prev.filter(i => i.list.id !== list.id));
      if (updated) onInvitationResponded?.(updated, accept);
    } catch (e) {
      console.warn('Error responding to list invitation:', e);
      Alert.alert('Error', 'No se pudo responder a la invitación. Inténtalo de nuevo.');
    } finally {
      setRespondingListId(null);
    }
  };

  const handleAddToList = (rec: DirectRecommendation, listId: string) => {
    const targetList = allLists.find(l => l.id === listId);
    if (!targetList) return;

    onAddMediaToList(listId, rec.item);
    handleMarkAsRead(rec.id);
    setSelectedRecForList(null);
    Alert.alert(
      '¡Agregada!',
      `"${rec.item.title}" se ha añadido con éxito a la lista "${targetList.title}".`
    );
  };

  const unreadRecCount = recommendations.filter(r => !r.read).length;
  const unreadListCount = listNotifications.filter(n => !n.read).length;
  const totalUnreadCount = unreadRecCount + unreadListCount + invitations.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <Ionicons name="notifications" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.title}>Centro de Notificaciones</Text>
              {totalUnreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {totalUnreadCount} nueva{totalUnreadCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Tabs Selector */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'recommendations' && styles.tabButtonActive]}
              onPress={() => setActiveTab('recommendations')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="gift-outline"
                size={16}
                color={activeTab === 'recommendations' ? '#F59E0B' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'recommendations' && styles.tabButtonTextActive,
                ]}
                numberOfLines={1}
              >
                Recomendaciones
              </Text>
              {unreadRecCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadRecCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'lists' && styles.tabButtonActive]}
              onPress={() => setActiveTab('lists')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={activeTab === 'lists' ? '#38BDF8' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'lists' && styles.tabButtonTextActive,
                ]}
                numberOfLines={1}
              >
                Listas
              </Text>
              {unreadListCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#38BDF8' }]}>
                  <Text style={[styles.tabBadgeText, { color: '#0F172A' }]}>{unreadListCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'invites' && styles.tabButtonActive]}
              onPress={() => setActiveTab('invites')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-unread-outline"
                size={16}
                color={activeTab === 'invites' ? '#30D158' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'invites' && styles.tabButtonTextActive,
                ]}
                numberOfLines={1}
              >
                Invitaciones
              </Text>
              {invitations.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#30D158' }]}>
                  <Text style={[styles.tabBadgeText, { color: '#0F172A' }]}>{invitations.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Subheader / Actions */}
          {activeTab === 'recommendations' ? (
            <View style={styles.subHeader}>
              <Text style={styles.subHeaderSubtitle}>
                Obras sugeridas directamente por tus conexiones
              </Text>
              {unreadRecCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllBtnText}>Marcar leídas</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : activeTab === 'invites' ? (
            <View style={styles.subHeader}>
              <Text style={styles.subHeaderSubtitle}>
                Listas a las que te han invitado a colaborar
              </Text>
            </View>
          ) : (
            <View style={styles.subHeader}>
              <Text style={styles.subHeaderSubtitle}>
                Cambios, obras agregadas o eliminadas en tus listas
              </Text>
              {unreadListCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllListNotificationsAsRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllBtnText}>Marcar leídas</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>Cargando notificaciones...</Text>
            </View>
          ) : activeTab === 'recommendations' ? (
            recommendations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="mail-open-outline" size={36} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>Bandeja de Recomendaciones Vacía</Text>
                <Text style={styles.emptyText}>
                  Cuando tus amigos te recomienden una película, libro o serie de culto, aparecerá aquí con sus notas y opciones para guardarla en tus listas.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {recommendations.map(rec => (
                  <View key={rec.id} style={[styles.recCard, !rec.read && styles.recCardUnread]}>
                    {/* Sender Header */}
                    <View style={styles.recHeaderRow}>
                      <UserAvatar name={rec.fromUser.name} avatar={rec.fromUser.avatar} size={36} />
                      <View style={styles.senderInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.senderName}>{rec.fromUser.name}</Text>
                          {!rec.read && <View style={styles.blueDot} />}
                        </View>
                        <Text style={styles.senderHandle}>
                          {rec.fromUser.handle || rec.fromUser.userCode || 'Amigo de Culto'}
                        </Text>
                      </View>
                      <Text style={styles.recDate}>
                        {new Date(rec.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>

                    {/* Personal Message / Note */}
                    {rec.message && (
                      <View style={styles.messageBubble}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#38BDF8" />
                        <Text style={styles.messageText}>"{rec.message}"</Text>
                      </View>
                    )}

                    {/* Media Item Snapshot */}
                    <TouchableOpacity
                      style={styles.mediaSnapshot}
                      onPress={() => {
                        handleMarkAsRead(rec.id);
                        onViewMediaDetail(rec.item);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{
                          uri:
                            rec.item.posterUrl ||
                            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80',
                        }}
                        style={styles.mediaThumbnail}
                      />
                      <View style={styles.mediaSnapshotInfo}>
                        <Text style={styles.mediaSnapshotTitle} numberOfLines={1}>
                          {rec.item.title}
                        </Text>
                        <View style={styles.mediaSnapshotMeta}>
                          <View style={styles.miniCategoryBadge}>
                            <Text style={styles.miniCategoryText}>
                              {rec.item.category.toUpperCase()}
                            </Text>
                          </View>
                          {Boolean(rec.item.year) && (
                            <Text style={styles.mediaSnapshotYear}>{rec.item.year}</Text>
                          )}
                        </View>
                        {rec.item.synopsis ? (
                          <Text style={styles.mediaSnapshotSynopsis} numberOfLines={2}>
                            {rec.item.synopsis}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#64748B" />
                    </TouchableOpacity>

                    {/* Actions Row */}
                    <View style={styles.recActionsRow}>
                      <TouchableOpacity
                        style={styles.addToListBtn}
                        onPress={() => {
                          handleMarkAsRead(rec.id);
                          setSelectedRecForList(rec);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#0F172A" />
                        <Text style={styles.addToListBtnText}>Guardar en otra lista</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewDetailBtn}
                        onPress={() => {
                          handleMarkAsRead(rec.id);
                          onViewMediaDetail(rec.item);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye-outline" size={16} color="#38BDF8" />
                        <Text style={styles.viewDetailBtnText}>Ver ficha</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          ) : activeTab === 'invites' ? (
            invitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="mail-outline" size={36} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>Sin invitaciones pendientes</Text>
                <Text style={styles.emptyText}>
                  Cuando alguien te invite a colaborar en una de sus listas, podrás aceptarla o rechazarla aquí.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {invitations.map(({ list, invitation }) => (
                  <View key={list.id} style={[styles.recCard, styles.recCardUnread]}>
                    <View style={styles.recHeaderRow}>
                      <UserAvatar name={invitation.invitedBy.name} avatar={invitation.invitedBy.avatar} size={36} />
                      <View style={styles.senderInfo}>
                        <Text style={styles.senderName}>{invitation.invitedBy.name}</Text>
                        <Text style={styles.senderHandle}>te invitó a colaborar</Text>
                      </View>
                      <Text style={styles.recDate}>
                        {new Date(invitation.invitedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>

                    <View style={styles.listNotifActionBox}>
                      <View style={[styles.actionIconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                        <Ionicons name="albums" size={16} color="#38BDF8" />
                      </View>
                      <Text style={styles.listNotifActionText}>
                        <Text style={{ fontWeight: '700', color: '#38BDF8' }}>«{list.title}»</Text>
                        {' · '}
                        {list.items.length} obra{list.items.length === 1 ? '' : 's'} · {list.collaborators.length} miembro
                        {list.collaborators.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View style={styles.recActionsRow}>
                      <TouchableOpacity
                        style={styles.addToListBtn}
                        onPress={() => handleRespondInvitation(list, true)}
                        disabled={Boolean(respondingListId)}
                        activeOpacity={0.8}
                      >
                        {respondingListId === list.id ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#0F172A" />
                            <Text style={styles.addToListBtnText}>Aceptar</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewDetailBtn}
                        onPress={() => handleRespondInvitation(list, false)}
                        disabled={Boolean(respondingListId)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#F87171" />
                        <Text style={[styles.viewDetailBtnText, { color: '#F87171' }]}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          ) : (
            listNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="layers-outline" size={36} color="#64748B" />
                </View>
                <Text style={styles.emptyTitle}>Sin novedades en tus listas</Text>
                <Text style={styles.emptyText}>
                  Cuando otros miembros o amigos agreguen o eliminen obras en las listas que sigues, recibirás notificaciones aquí con acceso directo.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {listNotifications.map(notif => (
                  <View key={notif.id} style={[styles.recCard, !notif.read && styles.recCardUnread]}>
                    {/* Actor Row */}
                    <View style={styles.recHeaderRow}>
                      <UserAvatar name={notif.actor.name} avatar={notif.actor.avatar} size={36} />
                      <View style={styles.senderInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.senderName}>{notif.actor.name}</Text>
                          {!notif.read && <View style={styles.blueDot} />}
                        </View>
                        <Text style={styles.senderHandle}>
                          {notif.actor.handle || 'Miembro de Cultoteca'}
                        </Text>
                      </View>
                      <Text style={styles.recDate}>
                        {new Date(notif.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>

                    {/* Action pill / description */}
                    <View style={styles.listNotifActionBox}>
                      <View
                        style={[
                          styles.actionIconWrapper,
                          {
                            backgroundColor:
                              notif.action === 'item_added'
                                ? 'rgba(48, 209, 88, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={notif.action === 'item_added' ? 'add-circle' : 'trash'}
                          size={16}
                          color={notif.action === 'item_added' ? '#30D158' : '#EF4444'}
                        />
                      </View>
                      <Text style={styles.listNotifActionText}>
                        {notif.action === 'item_added' ? 'Agregó' : 'Eliminó'}{' '}
                        <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>
                          «{notif.mediaTitle || notif.mediaItem?.title || 'una obra'}»
                        </Text>{' '}
                        en{' '}
                        <Text style={{ fontWeight: '700', color: '#38BDF8' }}>
                          «{notif.listTitle}»
                        </Text>
                      </Text>
                    </View>

                    {/* Optional Media Snapshot */}
                    {notif.mediaItem && (
                      <TouchableOpacity
                        style={styles.mediaSnapshot}
                        onPress={() => {
                          handleMarkListNotificationAsRead(notif.id);
                          onViewMediaDetail(notif.mediaItem!);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{
                            uri:
                              notif.mediaItem.posterUrl ||
                              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80',
                          }}
                          style={styles.mediaThumbnail}
                        />
                        <View style={styles.mediaSnapshotInfo}>
                          <Text style={styles.mediaSnapshotTitle} numberOfLines={1}>
                            {notif.mediaItem.title}
                          </Text>
                          <View style={styles.mediaSnapshotMeta}>
                            <View style={styles.miniCategoryBadge}>
                              <Text style={styles.miniCategoryText}>
                                {notif.mediaItem.category.toUpperCase()}
                              </Text>
                            </View>
                            {Boolean(notif.mediaItem.year) && (
                              <Text style={styles.mediaSnapshotYear}>{notif.mediaItem.year}</Text>
                            )}
                          </View>
                          {notif.mediaItem.synopsis ? (
                            <Text style={styles.mediaSnapshotSynopsis} numberOfLines={2}>
                              {notif.mediaItem.synopsis}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748B" />
                      </TouchableOpacity>
                    )}

                    {/* Action buttons */}
                    <View style={styles.recActionsRow}>
                      <TouchableOpacity
                        style={styles.addToListBtn}
                        onPress={() => handleNavigateToList(notif)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="open-outline" size={16} color="#0F172A" />
                        <Text style={styles.addToListBtnText}>Ir a la lista</Text>
                      </TouchableOpacity>

                      {notif.mediaItem && (
                        <TouchableOpacity
                          style={styles.viewDetailBtn}
                          onPress={() => {
                            handleMarkListNotificationAsRead(notif.id);
                            onViewMediaDetail(notif.mediaItem!);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="eye-outline" size={16} color="#38BDF8" />
                          <Text style={styles.viewDetailBtnText}>Ver ficha</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          )}

          {/* List Picker Modal when user chooses "Guardar en otra lista" */}
          {selectedRecForList && (
            <Modal visible={Boolean(selectedRecForList)} transparent animationType="fade">
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Elige una lista de destino</Text>
                    <TouchableOpacity onPress={() => setSelectedRecForList(null)}>
                      <Ionicons name="close" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.pickerSubtitle}>
                    Guardando "{selectedRecForList.item.title}"
                  </Text>
                  <ScrollView style={{ maxHeight: 280 }}>
                    {allLists.map(list => (
                      <TouchableOpacity
                        key={list.id}
                        style={styles.pickerListItem}
                        onPress={() => handleAddToList(selectedRecForList, list.id)}
                      >
                        <Ionicons name="list" size={18} color="#38BDF8" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.pickerListName}>{list.title}</Text>
                          <Text style={styles.pickerListCount}>
                            {list.items.length} obras • {list.category.toUpperCase()}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color="#64748B" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIconWrapper: {
    backgroundColor: '#F59E0B20',
    padding: 6,
    borderRadius: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  unreadBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    padding: 4,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E293B60',
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  subHeaderSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  recCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recCardUnread: {
    borderColor: '#38BDF880',
    backgroundColor: '#1E293BEE',
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  senderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  blueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  senderHandle: {
    fontSize: 12,
    color: '#64748B',
  },
  recDate: {
    fontSize: 11,
    color: '#64748B',
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  mediaSnapshot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  mediaThumbnail: {
    width: 48,
    height: 68,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  mediaSnapshotInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  mediaSnapshotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  mediaSnapshotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  miniCategoryBadge: {
    backgroundColor: '#38BDF820',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  mediaSnapshotYear: {
    fontSize: 11,
    color: '#94A3B8',
  },
  mediaSnapshotSynopsis: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  recActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addToListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 10,
  },
  addToListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C720',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  viewDetailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  pickerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  pickerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  pickerListCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 12,
    flexShrink: 1,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  listNotifActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A80',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#33415550',
  },
  actionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  listNotifActionText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
});
