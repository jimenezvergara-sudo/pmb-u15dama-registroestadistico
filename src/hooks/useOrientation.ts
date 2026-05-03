import { useEffect, useState } from 'react';

/**
 * Reactive hook for device orientation. Updates automatically on rotation
 * without requiring a page reload. Uses a combination of matchMedia and
 * window dimensions for maximum compatibility (some mobile browsers don't
 * fire the orientation media query reliably on rotation).
 */
function computeIsLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary: viewport dimensions (works everywhere, incl. iPad Safari/Chrome)
  const byDims = window.innerWidth > window.innerHeight;
  // Secondary: media query
  const byMQ = window.matchMedia?.('(orientation: landscape)').matches ?? byDims;
  return byDims || byMQ;
}

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(computeIsLandscape);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsLandscape(computeIsLandscape());

    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) mql.addEventListener('change', update);
    else mql.addListener(update);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    update();

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update);
      else mql.removeListener(update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isLandscape;
}
