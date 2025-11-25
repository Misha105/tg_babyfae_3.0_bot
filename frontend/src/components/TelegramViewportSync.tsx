import { useEffect, useState } from 'react';
import { viewport } from '@telegram-apps/sdk-react';
import { isSdkInitialized } from '@/lib/telegram/init';

export const TelegramViewportSync = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Wait for SDK to be initialized before accessing viewport
    if (!isSdkInitialized()) {
      // Re-check after a short delay
      const checkInterval = setInterval(() => {
        if (isSdkInitialized()) {
          clearInterval(checkInterval);
          checkViewport();
        }
      }, 50);
      return () => clearInterval(checkInterval);
    } else {
      checkViewport();
    }
    
    function checkViewport() {
      try {
        if (viewport && viewport.isMounted()) {
          setIsMounted(true);
        } else if (viewport && !viewport.isMounted()) {
          // SDK should have mounted it, but try again as fallback
          viewport.mount().then(() => {
            setIsMounted(true);
          }).catch(e => console.warn('Viewport mount failed in sync component', e));
        }
      } catch (e) {
        console.warn('Viewport access failed', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const sync = () => {
      try {
        // Access safeAreaInsets safely handling both signal and object patterns
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vp = viewport as any;
        const insets = typeof vp.safeAreaInsets === 'function' ? vp.safeAreaInsets() : vp.safeAreaInsets;
        
        if (insets) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const getVal = (val: any) => typeof val === 'number' ? val : (typeof val === 'function' ? val() : 0);
          
          const top = getVal(insets.top);
          const bottom = getVal(insets.bottom);
          const left = getVal(insets.left);
          const right = getVal(insets.right);

          document.documentElement.style.setProperty('--tg-safe-area-top', `${top}px`);
          document.documentElement.style.setProperty('--tg-safe-area-bottom', `${bottom}px`);
          document.documentElement.style.setProperty('--tg-safe-area-left', `${left}px`);
          document.documentElement.style.setProperty('--tg-safe-area-right', `${right}px`);
        }
      } catch (e) {
        console.warn('Failed to sync safe areas', e);
      }
    };

    // Initial sync
    sync();
    
    // Expand
    try {
        viewport.expand();
    } catch (e) { console.warn('Expand failed', e); }

    const interval = setInterval(sync, 200);
    return () => clearInterval(interval);
  }, [isMounted]);

  return null;
};
