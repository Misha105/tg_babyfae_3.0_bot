import { useEffect, useState } from 'react';
import { viewport } from '@telegram-apps/sdk-react';
import { isSdkInitialized } from '@/lib/telegram/init';

export const TelegramViewportSync = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // Track timers for cleanup
    const intervals = new Set<ReturnType<typeof setInterval>>();
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    
    // Helper to track intervals for cleanup
    const trackInterval = (id: ReturnType<typeof setInterval>) => {
      intervals.add(id);
      return id;
    };
    
    const trackTimeout = (id: ReturnType<typeof setTimeout>) => {
      timeouts.add(id);
      return id;
    };
    
    const clearTrackedInterval = (id: ReturnType<typeof setInterval>) => {
      clearInterval(id);
      intervals.delete(id);
    };
    
    // Wait for viewport to be mounted (by init.ts), don't try to mount it ourselves
    const waitForViewport = () => {
      if (cancelled) return;
      
      try {
        if (viewport && viewport.isMounted()) {
          setIsMounted(true);
          return;
        }
        
        // Viewport not mounted yet - wait and check again
        // init.ts should be mounting it, so we just wait
        const waitInterval = trackInterval(setInterval(() => {
          if (cancelled) {
            clearTrackedInterval(waitInterval);
            return;
          }
          try {
            if (viewport && viewport.isMounted()) {
              clearTrackedInterval(waitInterval);
              setIsMounted(true);
            }
          } catch (e) {
            console.warn('Viewport check failed', e);
          }
        }, 100));
        
        // Timeout after 3 seconds - give up waiting
        trackTimeout(setTimeout(() => {
          if (!cancelled) {
            clearTrackedInterval(waitInterval);
          }
        }, 3000));
        
      } catch (e) {
        console.warn('Viewport access failed', e);
      }
    };
    
    // Wait for SDK to be initialized before accessing viewport
    if (!isSdkInitialized()) {
      // Re-check after a short delay
      const checkInterval = trackInterval(setInterval(() => {
        if (cancelled) return;
        if (isSdkInitialized()) {
          clearTrackedInterval(checkInterval);
          waitForViewport();
        }
      }, 50));
    } else {
      waitForViewport();
    }
    
    // Cleanup all tracked timers
    return () => {
      cancelled = true;
      intervals.forEach(id => clearInterval(id));
      intervals.clear();
      timeouts.forEach(id => clearTimeout(id));
      timeouts.clear();
    };
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
