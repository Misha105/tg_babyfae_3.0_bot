import { 
  init, 
  backButton, 
  mainButton, 
  viewport, 
  themeParams, 
  miniApp
} from '@telegram-apps/sdk-react';

export function initTelegram() {
  try {
    // Initialize the SDK
    init();

    // Mount components if supported
    try { if (backButton && !backButton.isMounted()) backButton.mount(); } catch (e) { console.warn('backButton mount failed', e); }
    try { if (mainButton && !mainButton.isMounted()) mainButton.mount(); } catch (e) { console.warn('mainButton mount failed', e); }
    
    try {
      if (viewport) {
        // Viewport mounting and syncing is handled by TelegramViewportSync component
        // to ensure proper React lifecycle integration and polling for Android
      }
    } catch (e) { console.warn('viewport init failed', e); }
    
    try { if (themeParams && !themeParams.isMounted()) themeParams.mount(); } catch (e) { console.warn('themeParams mount failed', e); }
    
    try {
      if (miniApp) {
          if (!miniApp.isMounted()) {
            miniApp.mount();
          }
          // Match slate-900 (#0f172a)
          miniApp.setHeaderColor('#0f172a'); 
          miniApp.setBackgroundColor('#0f172a');
      }
    } catch (e) { console.warn('miniApp mount failed', e); }
    
    // HapticFeedback usually doesn't require mounting in recent SDKs
    // try { if (hapticFeedback && !hapticFeedback.isMounted()) hapticFeedback.mount(); } catch (e) { console.warn('hapticFeedback mount failed', e); }
    
    console.log('Telegram SDK initialized');
  } catch (e) {
    console.error('Telegram SDK init failed (running in browser?)', e);
  }
}
