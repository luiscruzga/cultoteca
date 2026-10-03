import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpdateInfo } from '../types';
import { UpdateService } from '../services/updateService';

interface AppUpdatesModalProps {
  visible: boolean;
  onClose: () => void;
  initialUpdateInfo?: UpdateInfo | null;
}

export const AppUpdatesModal: React.FC<AppUpdatesModalProps> = ({
  visible,
  onClose,
  initialUpdateInfo,
}) => {
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [autoUpdates, setAutoUpdates] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [lastCheckedText, setLastCheckedText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible, initialUpdateInfo]);

  const loadInitialData = async () => {
    const version = UpdateService.getCurrentVersion();
    setCurrentVersion(version);

    const autoEnabled = await UpdateService.isAutoUpdateEnabled();
    setAutoUpdates(autoEnabled);

    const lastTs = await UpdateService.getLastCheckedTimestamp();
    if (lastTs) {
      const date = new Date(lastTs);
      setLastCheckedText(
        `Última verificación: ${date.toLocaleDateString()} a las ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
    }

    if (initialUpdateInfo) {
      setUpdateInfo(initialUpdateInfo);
      setHasChecked(true);
    }
  };

  const handleToggleAutoUpdates = async (value: boolean) => {
    setAutoUpdates(value);
    await UpdateService.setAutoUpdateEnabled(value);
  };

  const handleCheckForUpdates = async () => {
    setLoading(true);
    try {
      const info = await UpdateService.checkForUpdates(true);
      setUpdateInfo(info);
      setHasChecked(true);
      const now = new Date();
      setLastCheckedText(
        `Última verificación: Hoy a las ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );

      if (!info.hasUpdate) {
        Alert.alert(
          'Aplicación al día',
          `Ya tienes instalada la versión más reciente de Cultoteca (v${currentVersion}).`
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'No se pudo verificar el estado de las actualizaciones. Revisa tu conexión a internet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadApk = async () => {
    if (!updateInfo?.apkUrl) {
      Alert.alert('Aviso', 'No hay enlace de descarga directa del APK disponible.');
      return;
    }

    setDownloading(true);
    try {
      await UpdateService.downloadAndInstallApk(updateInfo.apkUrl);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Versión & Actualizaciones</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* App Version Info Card */}
          <View style={styles.appCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="cube-outline" size={38} color="#38BDF8" />
            </View>
            <Text style={styles.appName}>Cultoteca</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>Versión instalada: v{currentVersion}</Text>
            </View>
            <Text style={styles.appSubtext}>
              Tu biblioteca cultural unificada para cine, series, anime, libros y videojuegos.
            </Text>

            {/* Status Indicator */}
            {hasChecked && (
              <View
                style={[
                  styles.statusPill,
                  updateInfo?.hasUpdate ? styles.statusPillUpdate : styles.statusPillUpToDate,
                ]}
              >
                <Ionicons
                  name={updateInfo?.hasUpdate ? 'cloud-download' : 'checkmark-circle'}
                  size={16}
                  color={updateInfo?.hasUpdate ? '#F59E0B' : '#10B981'}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: updateInfo?.hasUpdate ? '#F59E0B' : '#10B981' },
                  ]}
                >
                  {updateInfo?.hasUpdate
                    ? `¡Nueva versión disponible (v${updateInfo.latestVersion})!`
                    : 'Esta app está actualizada'}
                </Text>
              </View>
            )}

            {lastCheckedText && <Text style={styles.lastCheckedText}>{lastCheckedText}</Text>}
          </View>

          {/* New Version Card (if available) */}
          {updateInfo?.hasUpdate && (
            <View style={styles.updateCard}>
              <View style={styles.updateCardHeader}>
                <Ionicons name="sparkles" size={20} color="#F59E0B" />
                <Text style={styles.updateCardTitle}>
                  Nueva Versión v{updateInfo.latestVersion}
                </Text>
              </View>

              {updateInfo.publishedAt && (
                <Text style={styles.updateCardDate}>
                  Lanzada el:{' '}
                  {new Date(updateInfo.publishedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}

              {updateInfo.releaseNotes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesTitle}>Novedades y mejoras:</Text>
                  <Text style={styles.notesContent}>{updateInfo.releaseNotes}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={handleDownloadApk}
                disabled={downloading}
                activeOpacity={0.8}
              >
                {downloading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
                    <Text style={styles.downloadBtnText}>Descargar e Instalar APK</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.downloadNotice}>
                Android descargará el archivo .apk y te pedirá confirmar la instalación de la nueva
                versión.
              </Text>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionHeader}>Configuración</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTitleRow}>
                  <Ionicons name="sync-circle-outline" size={20} color="#38BDF8" />
                  <Text style={styles.settingTitle}>Actualizaciones automáticas</Text>
                </View>
                <Text style={styles.settingDescription}>
                  Comprueba de forma silenciosa al abrir la app si existe una nueva APK y te notifica
                  para instalarla.
                </Text>
              </View>
              <Switch
                value={autoUpdates}
                onValueChange={handleToggleAutoUpdates}
                trackColor={{ false: '#3A3A3C', true: '#0284C7' }}
                thumbColor={autoUpdates ? '#38BDF8' : '#AEAEB2'}
              />
            </View>
          </View>

          {/* Manual Check Button */}
          <TouchableOpacity
            style={[styles.checkBtn, loading && styles.checkBtnDisabled]}
            onPress={handleCheckForUpdates}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#FFF" />
                <Text style={styles.checkBtnText}>Buscar actualizaciones ahora</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  appCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  versionBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  versionBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  appSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  statusPillUpToDate: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillUpdate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lastCheckedText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 12,
  },
  updateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 20,
  },
  updateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  updateCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  updateCardDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  notesContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginBottom: 6,
  },
  notesContent: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  downloadBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  downloadNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  settingsSection: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  settingDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  checkBtn: {
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
  },
  checkBtnDisabled: {
    opacity: 0.6,
  },
  checkBtnText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
});
