import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { UpdateInfo } from '../types';

const appJson = require('../../app.json');

const STORAGE_KEYS = {
  AUTO_UPDATES_ENABLED: '@cultoteca_auto_updates_enabled',
  LAST_UPDATE_CHECK: '@cultoteca_last_update_check',
  CACHED_UPDATE_INFO: '@cultoteca_cached_update_info',
};

// Minimum time between non-forced (automatic) checks; also keeps us under GitHub's 60 req/h limit
const AUTO_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;
// Por debajo de esto la "APK" es una página de error o una descarga truncada
const MIN_APK_BYTES = 1024 * 1024;

export interface ApkDownloadProgress {
  writtenBytes: number;
  /** 0 cuando el servidor no informa el tamaño. */
  totalBytes: number;
}

let activeDownload: FileSystem.DownloadResumable | null = null;

// Semver clean & comparison helper
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  const clean = (v: string) =>
    v
      .replace(/^v/i, '')
      .trim()
      .split('-')[0]
      .split('.')
      .map(n => parseInt(n, 10) || 0);

  const rParts = clean(remoteVersion);
  const cParts = clean(currentVersion);
  const maxLen = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export class UpdateService {
  /**
   * Retorna la versión actual declarada en app.json
   */
  static getCurrentVersion(): string {
    return appJson?.expo?.version || '1.0.0';
  }

  /**
   * Consulta si las actualizaciones automáticas están activadas
   * Por defecto: true
   */
  static async isAutoUpdateEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_UPDATES_ENABLED);
      if (val === null) return true;
      return val === 'true';
    } catch {
      return true;
    }
  }

  /**
   * Guarda la preferencia del usuario sobre actualizaciones automáticas
   */
  static async setAutoUpdateEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_UPDATES_ENABLED, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Error saving auto update preference:', e);
    }
  }

  /**
   * Retorna el timestamp en ms de la última comprobación de actualización
   */
  static async getLastCheckedTimestamp(): Promise<number | null> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE_CHECK);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Comprueba si existe una nueva versión contra GitHub Releases o JSON manifest
   */
  static async checkForUpdates(forceCheck: boolean = false): Promise<UpdateInfo> {
    const currentVersion = this.getCurrentVersion();
    const updateUrl = process.env.EXPO_PUBLIC_UPDATE_URL;
    const githubRepo = process.env.EXPO_PUBLIC_GITHUB_REPO;

    if (!forceCheck) {
      const lastCheck = await this.getLastCheckedTimestamp();
      if (lastCheck && Date.now() - lastCheck < AUTO_CHECK_INTERVAL_MS) {
        return { currentVersion, latestVersion: currentVersion, hasUpdate: false };
      }
    }

    try {
      // 1. Si hay configurada una URL de manifiesto JSON directo
      if (updateUrl) {
        const response = await fetch(updateUrl, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (response.ok) {
          const data = await response.json();
          const latestVersion = data.version || currentVersion;
          const hasUpdate = isNewerVersion(latestVersion, currentVersion);
          const updateInfo: UpdateInfo = {
            currentVersion,
            latestVersion,
            hasUpdate,
            apkUrl: data.apkUrl,
            releaseNotes: data.releaseNotes || data.notes || '',
            publishedAt: data.publishedAt,
            mandatory: !!data.mandatory,
          };

          await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE_CHECK, Date.now().toString());
          if (hasUpdate) {
            await AsyncStorage.setItem(STORAGE_KEYS.CACHED_UPDATE_INFO, JSON.stringify(updateInfo));
          }
          return updateInfo;
        }
      }

      // 2. Si hay configurado un repositorio de GitHub (ej. "owner/cultoteca")
      if (githubRepo) {
        const response = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Cultoteca-App',
          },
        });

        if (response.ok) {
          const release = await response.json();
          const tag = (release.tag_name || '').replace(/^v/i, '');
          const latestVersion = tag || currentVersion;
          const hasUpdate = isNewerVersion(latestVersion, currentVersion);

          // Buscar asset que termine en .apk
          const apkAsset = Array.isArray(release.assets)
            ? release.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk'))
            : null;

          const apkUrl = apkAsset?.browser_download_url || release.html_url;

          const updateInfo: UpdateInfo = {
            currentVersion,
            latestVersion,
            hasUpdate,
            apkUrl,
            releaseNotes: release.body || '',
            publishedAt: release.published_at,
          };

          await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE_CHECK, Date.now().toString());
          if (hasUpdate) {
            await AsyncStorage.setItem(STORAGE_KEYS.CACHED_UPDATE_INFO, JSON.stringify(updateInfo));
          }
          return updateInfo;
        }
      }

      // 3. Fallback cuando no hay servidor configurado
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE_CHECK, Date.now().toString());
      return {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
      };
    } catch (err) {
      console.warn('Error checking for updates:', err);
      return {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
      };
    }
  }

  /**
   * Resuelve la mejor URL para descargar el archivo APK más reciente.
   * Prioridades:
   * 1. EXPO_PUBLIC_APK_URL explícita
   * 2. Release latest del repositorio de GitHub configurado (o por defecto luiscruzga/cultoteca)
   */
  static getApkDownloadUrl(): string {
    const directApkUrl = process.env.EXPO_PUBLIC_APK_URL;
    if (directApkUrl) return directApkUrl;

    const githubRepo = process.env.EXPO_PUBLIC_GITHUB_REPO || 'luiscruzga/cultoteca';
    return `https://github.com/${githubRepo}/releases/latest`;
  }

  /**
   * Abre o inicia la descarga del APK directamente (especialmente para entorno Web)
   */
  static async openApkDownload(customUrl?: string): Promise<boolean> {
    const url = customUrl || this.getApkDownloadUrl();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
        return true;
      }
      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.error('Error al abrir la descarga de APK:', error);
      Alert.alert(
        'Error de descarga',
        'No fue posible iniciar la descarga de la APK. Por favor intenta nuevamente más tarde.'
      );
      return false;
    }
  }

  /**
   * Fuera de Android abre el enlace de la APK; en Android la descarga se hace dentro de la app
   * con `downloadApk` + `installApk`.
   */
  static async downloadAndInstallApk(apkUrl?: string): Promise<boolean> {
    if (!apkUrl) {
      Alert.alert(
        'Enlace no disponible',
        'No se encontró una URL válida para descargar el archivo APK.'
      );
      return false;
    }
    return this.openApkDownload(apkUrl);
  }

  /**
   * Descarga la APK al caché de la app informando el progreso. Devuelve la URI local del archivo
   * verificado, o null si se canceló. Lanza un error si la descarga falla o queda incompleta.
   */
  static async downloadApk(
    apkUrl: string,
    version: string,
    onProgress: (progress: ApkDownloadProgress) => void
  ): Promise<string | null> {
    if (!FileSystem.cacheDirectory) throw new Error('Almacenamiento no disponible');
    const dir = `${FileSystem.cacheDirectory}updates/`;
    // Las APK de descargas anteriores (o parciales) se descartan
    await FileSystem.deleteAsync(dir, { idempotent: true });
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const fileUri = `${dir}cultoteca-${version.replace(/[^\w.-]/g, '')}.apk`;

    let expectedBytes = 0;
    const task = FileSystem.createDownloadResumable(
      apkUrl,
      fileUri,
      { headers: { Accept: 'application/vnd.android.package-archive,application/octet-stream,*/*' } },
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) expectedBytes = totalBytesExpectedToWrite;
        onProgress({ writtenBytes: totalBytesWritten, totalBytes: Math.max(totalBytesExpectedToWrite, 0) });
      }
    );
    activeDownload = task;

    try {
      const result = await task.downloadAsync();
      if (!result) return null; // cancelada
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }
      const info = await FileSystem.getInfoAsync(result.uri);
      const size = info.exists ? info.size : 0;
      if (size < MIN_APK_BYTES || (expectedBytes > 0 && size !== expectedBytes)) {
        throw new Error('Descarga incompleta');
      }
      return result.uri;
    } catch (error) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
      if (activeDownload !== task) return null; // cancelada por el usuario
      throw error;
    } finally {
      if (activeDownload === task) activeDownload = null;
    }
  }

  /** Cancela la descarga en curso, si la hay. */
  static async cancelDownload(): Promise<void> {
    const task = activeDownload;
    activeDownload = null;
    await task?.cancelAsync().catch(() => undefined);
  }

  /** Abre el instalador de paquetes de Android con la APK descargada. */
  static async installApk(fileUri: string): Promise<void> {
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: APK_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
    });
  }

  /** Abre el ajuste "Instalar apps desconocidas" de Cultoteca. */
  static async openInstallPermissionSettings(): Promise<void> {
    const packageName = appJson?.expo?.android?.package;
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
      data: packageName ? `package:${packageName}` : undefined,
    });
  }
}
