import { 
  init, 
  backButton, 
  mainButton, 
  viewport, 
  themeParams, 
  miniApp
} from '@telegram-apps/sdk-react';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Check if we're running in Telegram environment (sync check)
 * Uses window.Telegram.WebApp presence as a simple heuristic
 */
export function isTelegramEnvironment(): boolean {
  try {
    // Simple sync check - if Telegram WebApp object exists
    return typeof window !== 'undefined' && 
           typeof (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Reliable check if app is running inside Telegram WebApp (not mocked browser)
 * This checks for real Telegram environment indicators that cannot be easily faked
 */
export function isRealTelegramWebApp(): boolean {
  // In DEV mode, we have a mock - allow it to work
  if (import.meta.env.DEV) {
    return true;
  }

  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: { user?: unknown } } } }).Telegram?.WebApp;
    
    if (!tg) {
      return false;
    }

    // Real Telegram WebApp has non-empty initData string OR initDataUnsafe with user info
    // When opened in browser, telegram-web-app.js creates WebApp object but:
    // - initData is empty string ""
    // - initDataUnsafe.user is undefined
    const hasValidInitData = typeof tg.initData === 'string' && tg.initData.length > 0;
    const hasUserData = tg.initDataUnsafe?.user !== undefined;
    
    // Must have either valid (non-empty) initData or user data
    return hasValidInitData || hasUserData;
  } catch {
    return false;
  }
}

/**
 * Initialize the Telegram SDK. Safe to call multiple times.
 * Returns a promise that resolves when initialization is complete.
 */
export async function initTelegram(): Promise<void> {
  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Already initialized
  if (isInitialized) {
    return Promise.resolve();
  }

  initPromise = doInit();
  return initPromise;
}

/**
 * Check if SDK is initialized
 */
export function isSdkInitialized(): boolean {
  return isInitialized;
}

async function doInit(): Promise<void> {
  try {
    // Initialize the SDK
    init();
    isInitialized = true;

    // Mount components sequentially to avoid race conditions
    // Each mount is wrapped in try-catch to continue even if one fails
    
    // Back button
    try { 
      if (backButton && !backButton.isMounted()) {
        backButton.mount(); 
      }
    } catch (e) { 
      console.warn('backButton mount failed', e); 
    }
    
    // Main button
    try { 
      if (mainButton && !mainButton.isMounted()) {
        mainButton.mount(); 
      }
    } catch (e) { 
      console.warn('mainButton mount failed', e); 
    }
    
    // Theme params - mount and wait for it
    try { 
      if (themeParams && !themeParams.isMounted()) {
        await themeParams.mount(); 
      }
    } catch (e) { 
      console.warn('themeParams mount failed', e); 
    }
    
    // Viewport - mount and wait for it
    try {
      if (viewport && !viewport.isMounted()) {
        await viewport.mount();
      }
    } catch (e) { 
      console.warn('viewport mount failed', e); 
    }
    
    // Mini App - mount and configure
    try {
      if (miniApp) {
        if (!miniApp.isMounted()) {
          await miniApp.mount();
        }
        // Match slate-900 (#0f172a) - only call after mount is complete
        if (miniApp.isMounted()) {
          miniApp.setHeaderColor('#0f172a'); 
          miniApp.setBackgroundColor('#0f172a');
        }
      }
    } catch (e) { 
      console.warn('miniApp mount failed', e); 
    }
    
    console.log('Telegram SDK initialized');
  } catch (e) {
    console.error('Telegram SDK init failed (running in browser?)', e);
    // Still mark as initialized to prevent repeated attempts
    isInitialized = true;
  }
}
