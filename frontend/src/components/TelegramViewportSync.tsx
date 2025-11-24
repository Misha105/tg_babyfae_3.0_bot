import { useEffect, useState } from 'react';
import { viewport } from '@telegram-apps/sdk-react';

export const TelegramViewportSync = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    try {
      if (viewport && !viewport.isMounted()) {
        viewport.mount().then(() => {
          setIsMounted(true);
        }).catch(e => console.error('Viewport mount failed', e));
      } else if (viewport && viewport.isMounted()) {
        // Defer state update to avoid synchronous update warning
        setTimeout(() => setIsMounted(true), 0);
      }
    } catch (e) {
      console.error('Viewport access failed', e);
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
