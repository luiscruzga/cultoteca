import { Platform } from 'react-native';
import {
  CollaborativeList,
  DirectRecommendation,
  FavoriteItem,
  ListActivityNotification,
  UserProfile,
} from '../types';

export interface LoginLogEntry {
  _id?: string;
  userId: string;
  userCode?: string;
  email?: string;
  platform: string;
  authProvider: 'clerk' | 'local' | 'guest';
  timestamp: string;
}

export interface AuditLogEntry {
  _id?: string;
  userId: string;
  userName?: string;
  userCode?: string;
  actionType: string;
  targetTitle?: string;
  targetId?: string;
  targetCategory?: string;
  listTitle?: string;
  details?: string;
  timestamp: string;
}

export interface BackendHealthResponse {
  status: 'connected' | 'disconnected';
  configured: boolean;
  database: string;
  timestamp: string;
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/+$/, '');
const DATABASE = process.env.EXPO_PUBLIC_MONGODB_DATABASE || 'cultoteca';
const IS_CLERK_CONFIGURED = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
const AUTH_READY_TIMEOUT_MS = 5000;

// ==========================================
// AUTH TOKEN PROVIDER (registered by ApiAuthBridge inside <ClerkProvider>)
// ==========================================
type AuthTokenProvider = () => Promise<string | null>;

let authTokenProvider: AuthTokenProvider | null = null;
let authReady = false;
let resolveAuthReady: (() => void) | null = null;
let authReadyPromise: Promise<void> = new Promise(resolve => {
  resolveAuthReady = resolve;
});

export function setAuthTokenProvider(provider: AuthTokenProvider | null): void {
  authTokenProvider = provider;
}

export function setAuthReady(ready: boolean): void {
  authReady = ready;
  if (ready) {
    resolveAuthReady?.();
  } else {
    authReadyPromise = new Promise(resolve => {
      resolveAuthReady = resolve;
    });
  }
}

async function getAuthToken(): Promise<string | null> {
  // Without Clerk there is no verifiable identity: the backend would reject the request
  if (!IS_CLERK_CONFIGURED) return null;

  if (!authReady) {
    await Promise.race([
      authReadyPromise,
      new Promise<void>(resolve => setTimeout(resolve, AUTH_READY_TIMEOUT_MS)),
    ]);
  }

  if (!authTokenProvider) return null;
  try {
    return await authTokenProvider();
  } catch (err) {
    console.warn('[MongoDbService] Could not obtain Clerk session token:', err);
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const MongoDbService = {
  isConfigured(): boolean {
    return Boolean(API_BASE_URL);
  },

  getApiUrl(): string {
    return API_BASE_URL;
  },

  getDatabase(): string {
    return DATABASE;
  },

  /**
   * Verifica el estado de salud del backend y la conexión a MongoDB Atlas
   */
  async checkHealth(): Promise<BackendHealthResponse | null> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return (await response.json()) as BackendHealthResponse;
    } catch {
      return null;
    }
  },

  /**
   * Helper genérico para peticiones a la API del backend
   */
  async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {}
  ): Promise<T | null> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = await getAuthToken();
    if (!token) {
      // No verified session (local/guest mode or signed out): stay on local storage
      return null;
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (options.body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetchWithTimeout(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[MongoDbService] ${options.method || 'GET'} ${path} failed (${response.status}):`, errorText);
        return null;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // Backend not running or timeout; graceful fallback to local cache
      console.warn(`[MongoDbService] Network request to ${path} failed (using offline fallback):`, err?.message || err);
      return null;
    }
  },

  // ==========================================
  // LISTS
  // ==========================================

  async getLists(): Promise<CollaborativeList[] | null> {
    const res = await this.request<{ documents: CollaborativeList[] }>('/api/lists');
    return res?.documents || null;
  },

  async insertOrUpdateList(list: CollaborativeList): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/lists', {
      method: 'POST',
      body: list,
    });
    return Boolean(res?.success);
  },

  async deleteList(listId: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/lists/${encodeURIComponent(listId)}`, {
      method: 'DELETE',
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // USERS & DIRECTORY
  // ==========================================

  async getUsers(): Promise<UserProfile[] | null> {
    const res = await this.request<{ documents: UserProfile[] }>('/api/users');
    return res?.documents || null;
  },

  async getUserById(id: string): Promise<UserProfile | null> {
    const res = await this.request<{ document: UserProfile | null }>(`/api/users/${encodeURIComponent(id)}`);
    return res?.document || null;
  },

  async insertOrUpdateUser(profile: UserProfile): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/users', {
      method: 'POST',
      body: profile,
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  async getNotifications(userId?: string): Promise<ListActivityNotification[] | null> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await this.request<{ documents: ListActivityNotification[] }>(`/api/notifications${query}`);
    return res?.documents || null;
  },

  /** With `fanOut`, the backend creates one copy per list member/follower (excluding the actor) and sends push. */
  async insertNotification(notif: ListActivityNotification, options: { fanOut?: boolean } = {}): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/notifications', {
      method: 'POST',
      body: options.fanOut ? { ...notif, fanOut: true } : notif,
    });
    return Boolean(res?.success);
  },

  async registerPushToken(token: string, platform: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/push-tokens', {
      method: 'POST',
      body: { token, platform },
    });
    return Boolean(res?.success);
  },

  async removePushToken(token: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/push-tokens?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
    return Boolean(res?.success);
  },

  async markNotificationRead(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
    return Boolean(res?.success);
  },

  async markAllNotificationsRead(userId?: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'PUT',
      body: userId ? { userId } : {},
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // DIRECT RECOMMENDATIONS
  // ==========================================

  async getRecommendations(userId?: string): Promise<DirectRecommendation[] | null> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await this.request<{ documents: DirectRecommendation[] }>(`/api/recommendations${query}`);
    return res?.documents || null;
  },

  async insertRecommendation(rec: DirectRecommendation): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/recommendations', {
      method: 'POST',
      body: rec,
    });
    return Boolean(res?.success);
  },

  async markRecommendationRead(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/api/recommendations/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // FAVORITES
  // ==========================================

  async getFavorites(userId?: string): Promise<FavoriteItem[] | null> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await this.request<{ documents: FavoriteItem[] }>(`/api/favorites${query}`);
    return res?.documents || null;
  },

  async insertFavorite(fav: FavoriteItem): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/favorites', {
      method: 'POST',
      body: fav,
    });
    return Boolean(res?.success);
  },

  async removeFavorite(mediaId: string, listId?: string, userId?: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>('/api/favorites', {
      method: 'DELETE',
      body: { mediaId, listId, userId },
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // LOGINS TRACEABILITY
  // ==========================================

  async logLogin(entry: Omit<LoginLogEntry, 'platform' | 'timestamp'> & { platform?: string; timestamp?: string }): Promise<boolean> {
    const document: LoginLogEntry = {
      userId: entry.userId,
      userCode: entry.userCode,
      email: entry.email,
      platform: entry.platform || Platform.OS,
      authProvider: entry.authProvider,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const res = await this.request<{ success: boolean }>('/api/logins', {
      method: 'POST',
      body: document,
    });
    return Boolean(res?.success);
  },

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  async logAction(entry: Omit<AuditLogEntry, 'timestamp'> & { timestamp?: string }): Promise<boolean> {
    const document: AuditLogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const res = await this.request<{ success: boolean }>('/api/audit-logs', {
      method: 'POST',
      body: document,
    });
    return Boolean(res?.success);
  },

  async getAuditLogs(limit = 50): Promise<AuditLogEntry[] | null> {
    const res = await this.request<{ documents: AuditLogEntry[] }>(`/api/audit-logs?limit=${limit}`);
    return res?.documents || null;
  },
};
