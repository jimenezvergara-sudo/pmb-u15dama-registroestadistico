import { useEffect, useState } from 'react';

/**
 * Reactive hook for device orientation. Updates automatically on rotation
 * without requiring a page reload.
 */
export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    // Older Safari uses addListener
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    setIsLandscape(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  return isLandscape;
}
