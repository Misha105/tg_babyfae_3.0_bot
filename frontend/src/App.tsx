import { useState, useEffect } from 'react';
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
import { initTelegram } from '@/lib/telegram/init';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { processQueue } from '@/lib/api/queue';
import { TelegramViewportSync } from '@/components/TelegramViewportSync';
import '@/lib/i18n';
import '@/mock-env';

function App() {
  const profile = useStore((state) => state.profile);
  const hasHydrated = useStore((state) => state._hasHydrated);
  const isServerSynced = useStore((state) => state._isServerSynced);
  const initializeForUser = useStore((state) => state.initializeForUser);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'growth' | 'settings'>('dashboard');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize Telegram SDK first
        initTelegram();
        
        // Get the current Telegram user ID
        const userId = getTelegramUserId();
        
        if (!userId || userId === 0) {
          // No valid user ID - this shouldn't happen in production Telegram
          console.error('[App] No valid Telegram user ID available');
          setInitError('Не удалось получить ID пользователя Telegram');
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
        setInitError('Ошибка инициализации приложения');
      }
    };
    
    initialize();
    
    return () => {
      window.removeEventListener('online', processQueue);
    };
  }, [initializeForUser]);

  // Show loading while initializing
  if (!hasHydrated) {
    return (
      <>
        <TelegramViewportSync />
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950">
          <LoadingSpinner />
          <p className="text-slate-400 mt-4 text-sm">Загрузка данных...</p>
        </div>
      </>
    );
  }

  // Show error if initialization failed
  if (initError) {
    return (
      <>
        <TelegramViewportSync />
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 px-4">
          <div className="text-red-400 text-center">
            <p className="text-lg font-medium mb-2">Ошибка</p>
            <p className="text-sm">{initError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white text-sm"
            >
              Попробовать снова
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
            Синхронизация...
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
