import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

export const getTelegramUserId = (): number => {
  // 1. Try SDK (most robust as it parses URL hash directly)
  try {
    const { initData } = retrieveLaunchParams();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((initData as any)?.user?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (initData as any).user.id;
    }
  } catch (e) {
    // Expected error if running outside Telegram or without params
    console.debug('SDK retrieveLaunchParams failed or no params:', e);
  }

  // 2. Try standard WebApp API (window.Telegram.WebApp)
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
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
      console.error('Failed to parse initData', e);
    }
  }
  
  // 4. Fallback for development/browser testing if not in Telegram
  if (import.meta.env.DEV) {
    console.warn('Running in dev mode without Telegram context, using mock ID 12345');
    return 12345;
  }

  // Fallback for production if something goes wrong (shouldn't happen in bot)
  console.error('Could not retrieve Telegram User ID. Window.Telegram state:', window.Telegram);
  return 0;
};
