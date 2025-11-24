import { mockCloudStorage } from './lib/storage/mock-cloud-storage';

// Prevent unused variable warning
console.log('Mock Storage initialized:', mockCloudStorage);

// Mock Telegram WebApp environment for development
// Only mock if we are strictly in DEV mode AND window.Telegram is completely missing
// This prevents overwriting the real Telegram object if it exists but WebApp is not yet fully populated
if (import.meta.env.DEV && typeof window.Telegram === 'undefined') {
  console.log('Initializing Mock Telegram Environment');
  
  window.Telegram = {
    WebApp: {
      initData: '',
      initDataUnsafe: {},
      version: '6.0',
      platform: 'unknown',
      colorScheme: 'dark',
      themeParams: {
        bg_color: '#212121',
        text_color: '#ffffff',
        hint_color: '#aaaaaa',
        link_color: '#646cff',
        button_color: '#646cff',
        button_text_color: '#ffffff',
      },
      isExpanded: true,
      viewportHeight: 800,
      viewportStableHeight: 800,
      headerColor: '#212121',
      backgroundColor: '#212121',
      BackButton: {
        isVisible: false,
        onClick: () => {},
        offClick: () => {},
        show: () => {},
        hide: () => {},
      },
      MainButton: {
        text: '',
        color: '#646cff',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: () => {},
        onClick: () => {},
        offClick: () => {},
        show: () => {},
        hide: () => {},
        enable: () => {},
        disable: () => {},
        showProgress: () => {},
        hideProgress: () => {},
      },
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {},
      },
      ready: () => {},
      expand: () => {},
      close: () => {},
    },
  };
}
