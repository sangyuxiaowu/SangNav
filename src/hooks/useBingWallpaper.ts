import { useEffect, useState } from 'react';
import { localDate, readBingWallpaper, refreshBingWallpaper, type BingWallpaper } from '../services/bingWallpaper';

export function useBingWallpaper(enabled: boolean): string {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let updating = false;
    let objectUrl = '';
    let displayedDate = '';
    let timer: ReturnType<typeof setTimeout>;
    let nextAttempt = 0;

    const display = (wallpaper: BingWallpaper) => {
      if (disposed || displayedDate === wallpaper.date) return;
      const previousUrl = objectUrl;
      objectUrl = URL.createObjectURL(wallpaper.blob);
      displayedDate = wallpaper.date;
      setImageUrl(objectUrl);
      if (previousUrl) URL.revokeObjectURL(previousUrl);
    };

    const update = async () => {
      if (disposed || updating || Date.now() < nextAttempt) return;
      updating = true;
      clearTimeout(timer);
      let current = false;
      try {
        const cached = await readBingWallpaper();
        if (disposed) return;
        if (cached) display(cached);
        const wallpaper = await refreshBingWallpaper();
        if (disposed) return;
        if (!cached || cached.date !== wallpaper.date) display(wallpaper);
        current = wallpaper.date >= localDate();
      } catch (error) {
        console.warn('Failed to update Bing wallpaper:', error);
      } finally {
        updating = false;
        if (!disposed) {
          const now = new Date();
          nextAttempt = current
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
            : now.getTime() + 5 * 60_000;
          timer = setTimeout(() => { void update(); }, nextAttempt - now.getTime());
        }
      }
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') void update();
    };
    const handleOnline = () => {
      nextAttempt = 0;
      void update();
    };
    void update();
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);
    window.addEventListener('online', handleOnline);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
      window.removeEventListener('online', handleOnline);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled]);

  return imageUrl;
}