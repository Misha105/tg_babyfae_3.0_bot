import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/store';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { CalendarView } from '@/features/calendar/CalendarView';
import { GrowthScreen } from '@/features/growth/GrowthScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/ui/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BrowserFallback } from '@/components/BrowserFallback';
import { initTelegram, isRealTelegramWebApp } from '@/lib/telegram/init';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { processQueue } from '@/lib/api/queue';
import { TelegramViewportSync } from '@/components/TelegramViewportSync';
import '@/lib/i18n';
import '@/mock-env';

// Error types for localization
type InitErrorType = 'user_id' | 'init' | null;

// Check browser environment once at module load (before React renders)
const getInitialBrowserState = (): boolean => {
  return !isRealTelegramWebApp();
};

function App() {
  const { t } = useTranslation();
  const profile = useStore((state) => state.profile);
  const hasHydrated = useStore((state) => state._hasHydrated);
  const isServerSynced = useStore((state) => state._isServerSynced);
  const initializeForUser = useStore((state) => state.initializeForUser);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'growth' | 'settings'>('dashboard');
  const [initErrorType, setInitErrorType] = useState<InitErrorType>(null);
  
  // Check if running in browser (not Telegram) - computed once at initial render
  const isBrowser = getInitialBrowserState();

  useEffect(() => {
    // Don't initialize if we detected it's a regular browser
    if (isBrowser === true) {
      return;
    }

    const initialize = async () => {
      try {
        // Initialize Telegram SDK first (async, waits for all mounts)
        await initTelegram();
        
        // Get the current Telegram user ID
        const userId = getTelegramUserId();
        
        if (!userId || userId === 0) {
          // No valid user ID - this shouldn't happen in production Telegram
          console.error('[App] No valid Telegram user ID available');
          setInitErrorType('user_id');
          return;
        }
        
        console.log(`[App] Initializing app for user ${userId}`);
        
        // Initialize store for this specific user
        // This will fetch data from server and properly scope localStorage
        await initializeForUser(userId);
        
        // Process offline queue after initialization
        processQueue();
        
        // Listen for online events to sync
        window.addEventListener('online', processQueue);
        
      } catch (error) {
        console.error('[App] Initialization failed:', error);
        setInitErrorType('init');
      }
    };
    
    initialize();
    
    return () => {
      window.removeEventListener('online', processQueue);
    };
  }, [initializeForUser, isBrowser]);

  // Manage loading state class on root element
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      if (!hasHydrated) {
        root.classList.add('loading-state');
      } else {
        root.classList.remove('loading-state');
      }
    }
  }, [hasHydrated]);

  // Show loading while initializing
  if (!hasHydrated) {
    // Show browser fallback if detected as regular browser
    if (isBrowser === true) {
      return <BrowserFallback />;
    }
    
    return (
      <>
        <TelegramViewportSync />
        <LoadingSpinner fullScreen size={48} />
      </>
    );
  }

  // Show browser fallback for non-Telegram environments
  if (isBrowser === true) {
    return <BrowserFallback />;
  }

  // Show error if initialization failed
  if (initErrorType) {
    const errorMessage = initErrorType === 'user_id' 
      ? t('app.error_user_id') 
      : t('app.error_init');
    
    return (
      <>
        <TelegramViewportSync />
        <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-950 px-4">
          <div className="text-red-400 text-center">
            <p className="text-lg font-medium mb-2">{t('app.error_title')}</p>
            <p className="text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white text-sm"
            >
              {t('app.try_again')}
            </button>
          </div>
        </div>
      </>
    );
  }

  const renderView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <CalendarView />;
      case 'growth':
        return <GrowthScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <Dashboard />;
    }
  };

  // Show onboarding if no profile exists (new user or user without profile on server)
  if (!profile) {
    return (
      <>
        <TelegramViewportSync />
        <OnboardingScreen />
        {/* Show sync indicator if we're still trying to sync */}
        {!isServerSynced && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-600/90 text-white text-xs px-3 py-1 rounded-full">
            {t('app.syncing')}
          </div>
        )}
      </>
    );
  }

  return (
    <AppLayout>
      <TelegramViewportSync />
      {currentTab !== 'settings' && <Header />}
      {renderView()}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </AppLayout>
  );
}

export default App;
