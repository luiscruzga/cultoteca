import { Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UpdateInfo } from '../types';

const appJson = require('../../app.json');

const STORAGE_KEYS = {
  AUTO_UPDATES_ENABLED: '@cultoteca_auto_updates_enabled',
  LAST_UPDATE_CHECK: '@cultoteca_last_update_check',
  CACHED_UPDATE_INFO: '@cultoteca_cached_update_info',
};

// Minimum time between non-forced (automatic) checks; also keeps us under GitHub's 60 req/h limit
const AUTO_CHECK_INTERVAL_MS = 60 * 60 * 1000;

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
   * Inicia la descarga e instalación del archivo APK abriendo el enlace
   */
  static async downloadAndInstallApk(apkUrl?: string): Promise<boolean> {
    if (!apkUrl) {
      Alert.alert(
        'Enlace no disponible',
        'No se encontró una URL válida para descargar el archivo APK.'
      );
      return false;
    }

    try {
      const supported = await Linking.canOpenURL(apkUrl);
      if (supported) {
        await Linking.openURL(apkUrl);
        return true;
      } else {
        // En algunos dispositivos canOpenURL puede dar false para descargas directas, intentar abrir directamente
        await Linking.openURL(apkUrl);
        return true;
      }
    } catch (error) {
      console.error('Error al intentar abrir el enlace de la APK:', error);
      Alert.alert(
        'Error de descarga',
        'No fue posible iniciar la descarga de la nueva versión. Por favor verifica tu conexión a internet.'
      );
      return false;
    }
  }
}

