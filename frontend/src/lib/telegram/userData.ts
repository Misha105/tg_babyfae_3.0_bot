import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

// Cache the user ID to avoid repeated parsing
let cachedUserId: number | null = null;
let cachedDevUserId: number | null = null;

const DEV_ID_STORAGE_KEY = 'babyfae_dev_user_id';
const DEV_ID_MIN = 100000;
const DEV_ID_MAX = 999999;

const readStoredDevId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage?.getItem(DEV_ID_STORAGE_KEY) || window.sessionStorage?.getItem(DEV_ID_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
  } catch {
    // Storage may be unavailable; ignore
  }
  return null;
};

const persistDevId = (id: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(DEV_ID_STORAGE_KEY, String(id));
    window.sessionStorage?.setItem(DEV_ID_STORAGE_KEY, String(id));
  } catch {
    // Ignore storage failures in dev
  }
};

const generateDevUserId = (): number => {
  const envValue = parseInt(import.meta.env.VITE_DEV_USER_ID || '', 10);
  if (Number.isFinite(envValue) && envValue > 0) {
    return envValue;
  }

  const stored = readStoredDevId();
  if (stored) {
    return stored;
  }

  const randomId = Math.floor(Math.random() * (DEV_ID_MAX - DEV_ID_MIN + 1)) + DEV_ID_MIN;
  persistDevId(randomId);
  return randomId;
};

/**
 * Gets the Telegram User ID from multiple sources.
 * Caches the result for performance.
 */
export const getTelegramUserId = (): number => {
  // Return cached value if available
  if (cachedUserId !== null && cachedUserId > 0) {
    return cachedUserId;
  }

  let userId: number | null = null;

  // 1. Try standard WebApp API first (window.Telegram.WebApp) - most reliable in production
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    userId = window.Telegram.WebApp.initDataUnsafe.user.id;
    console.log('[TG Auth] Got user ID from WebApp.initDataUnsafe:', userId);
  }

  // 2. Try parsing initData string manually (fallback)
  if (!userId && window.Telegram?.WebApp?.initData) {
    try {
      const urlParams = new URLSearchParams(window.Telegram.WebApp.initData);
      const userJson = urlParams.get('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user?.id) {
          userId = user.id;
          console.log('[TG Auth] Got user ID from parsed initData:', userId);
        }
      }
    } catch (e) {
      console.error('[TG Auth] Failed to parse initData:', e);
    }
  }

  // 3. Try SDK (may fail in some environments)
  if (!userId) {
    try {
      const { initData } = retrieveLaunchParams();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((initData as any)?.user?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userId = (initData as any).user.id;
        console.log('[TG Auth] Got user ID from SDK retrieveLaunchParams:', userId);
      }
    } catch (e) {
      // Expected error if running outside Telegram or without params
      console.debug('[TG Auth] SDK retrieveLaunchParams failed:', e);
    }
  }

  // 4. Try parsing URL hash directly (last resort for Telegram WebApp)
  if (!userId && typeof window !== 'undefined' && window.location.hash) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const tgWebAppData = hashParams.get('tgWebAppData');
      if (tgWebAppData) {
        const dataParams = new URLSearchParams(tgWebAppData);
        const userJson = dataParams.get('user');
        if (userJson) {
          const user = JSON.parse(decodeURIComponent(userJson));
          if (user?.id) {
            userId = user.id;
            console.log('[TG Auth] Got user ID from URL hash:', userId);
          }
        }
      }
    } catch (e) {
      console.debug('[TG Auth] Failed to parse URL hash:', e);
    }
  }
  
  // 5. Fallback for development/browser testing if not in Telegram
  if (!userId && import.meta.env.DEV) {
    if (!cachedDevUserId) {
      cachedDevUserId = generateDevUserId();
      persistDevId(cachedDevUserId);
    }
    userId = cachedDevUserId;
    console.warn('[TG Auth] Running in dev mode without Telegram context, using mock ID', userId);
  }

  // Cache and return
  if (userId && userId > 0) {
    cachedUserId = userId;
    return userId;
  }

  // Production fallback - log detailed error
  console.error('[TG Auth] CRITICAL: Could not retrieve Telegram User ID!', {
    hasTelegram: typeof window.Telegram !== 'undefined',
    hasWebApp: typeof window.Telegram?.WebApp !== 'undefined',
    hasInitData: !!window.Telegram?.WebApp?.initData,
    hasInitDataUnsafe: !!window.Telegram?.WebApp?.initDataUnsafe,
    initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
    hash: window.location?.hash?.substring(0, 100) || 'none'
  });
  
  return 0;
};

/**
 * Clears the cached user ID (useful for testing or logout)
 */
export const clearUserIdCache = (): void => {
  cachedUserId = null;
  cachedDevUserId = null;
};

/**
 * Returns the cached user ID or 0 if not cached.
 * Use this for checking if user is authenticated without re-parsing.
 */
export const getCachedUserId = (): number => {
  return cachedUserId || 0;
};

/**
 * Returns a user ID guaranteed to be > 0 in development.
 * In production, falls back to 0 so callers can surface auth errors.
 */
export const getSafeUserId = (): number => {
  const userId = getTelegramUserId();
  if (userId > 0) {
    return userId;
  }
  if (import.meta.env.DEV) {
    if (!cachedDevUserId) {
      cachedDevUserId = generateDevUserId();
      persistDevId(cachedDevUserId);
    }
    return cachedDevUserId;
  }
  return 0;
};
