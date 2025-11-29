import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { logger } from '@/lib/logger';

export const getTelegramUserId = (): number => {
  // 1. Try SDK (most robust as it parses URL hash directly)
  try {
    const { initData } = retrieveLaunchParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((initData as any)?.user?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (initData as any).user.id;
      logger.info('[userData] Retrieved user id via SDK retrieveLaunchParams', { id });
      return id;
    }
  } catch (e) {
    // Expected error if running outside Telegram or without params
    logger.debug('SDK retrieveLaunchParams failed or no params', { error: e as unknown });
  }

  // 2. Try standard WebApp API (window.Telegram.WebApp)
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    const id = window.Telegram.WebApp.initDataUnsafe.user.id;
    logger.info('[userData] Retrieved user id via window.Telegram.WebApp.initDataUnsafe', { id });
    return id;
  }

  // 3. Try parsing initData string manually (fallback)
  if (window.Telegram?.WebApp?.initData) {
    try {
      const urlParams = new URLSearchParams(window.Telegram.WebApp.initData);
      const userJson = urlParams.get('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        if (user?.id) return user.id;
      }
    } catch (e) {
    logger.error('Failed to parse initData', { error: e as unknown });
    }
  }
  
  // 4. Fallback for development/browser testing if not in Telegram
  if (import.meta.env.DEV) {
    logger.warn('[userData] Running in dev mode without Telegram context, using mock ID 12345');
    return 12345;
  }

  // Fallback for production if something goes wrong (shouldn't happen in bot)
  logger.error('[userData] Could not retrieve Telegram User ID. Window.Telegram state:', { state: window.Telegram });
  return 0;
};
