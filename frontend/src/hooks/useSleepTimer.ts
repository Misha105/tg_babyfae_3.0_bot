import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { differenceInSeconds } from 'date-fns';

export const useSleepTimer = () => {
  const activeSleepStart = useStore((state) => state.activeSleepStart);
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (!activeSleepStart) {
      return;
    }

    const updateDuration = () => {
      const start = new Date(activeSleepStart);
      const now = new Date();
      const diff = differenceInSeconds(now, start);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      setDuration(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [activeSleepStart]);

  return {
    isActive: !!activeSleepStart,
    duration: activeSleepStart ? duration : '',
    startTime: activeSleepStart,
  };
};
