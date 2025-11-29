import { useEffect, useState } from 'react';
import { viewport } from '@telegram-apps/sdk-react';
import { isSdkInitialized } from '@/lib/telegram/init';
import { logger } from '@/lib/logger';

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
            logger.warn('Viewport check failed', { error: e as unknown });
          }
        }, 100));
        
        // Timeout after 10 seconds - give up waiting
        trackTimeout(setTimeout(() => {
          if (!cancelled) {
            clearTrackedInterval(waitInterval);
          }
        }, 10000));
        
      } catch (e) {
        logger.warn('Viewport access failed', { error: e as unknown });
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
        type MaybeNumberOrFn = number | (() => number);
        type Insets = { top?: MaybeNumberOrFn; bottom?: MaybeNumberOrFn; left?: MaybeNumberOrFn; right?: MaybeNumberOrFn };
        const tvp = viewport as { safeAreaInsets?: Insets | (() => Insets); expand?: () => void } | undefined;
        if (!tvp) return;
        const insets = typeof tvp.safeAreaInsets === 'function' ? tvp.safeAreaInsets() : tvp.safeAreaInsets;
        
        if (insets) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const getVal = (val: MaybeNumberOrFn | undefined) => typeof val === 'number' ? val : (typeof val === 'function' ? val() : 0);
          
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
        logger.warn('Failed to sync safe areas', { error: e as unknown });
      }
    };

    // Initial sync
    sync();
    
    // Expand
    try {
      (viewport as { expand?: () => void } | undefined)?.expand?.();
    } catch (e) { logger.warn('Expand failed', { error: e as unknown }); }

    const interval = setInterval(sync, 500);
    return () => clearInterval(interval);
  }, [isMounted]);

  return null;
};
