import { useEffect, useState } from 'react';

/**
 * Reactive hook for device orientation. Updates automatically on rotation
 * without requiring a page reload. Uses a combination of matchMedia and
 * window dimensions for maximum compatibility (some mobile browsers don't
 * fire the orientation media query reliably on rotation).
 */
function computeIsLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth;
  const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight;
  // Primary: viewport dimensions (works everywhere, incl. iPad Safari/Chrome)
  const byDims = width > height;
  // Secondary: media query / Screen Orientation API
  const byMQ = window.matchMedia?.('(orientation: landscape)').matches ?? byDims;
  const byScreen = window.screen?.orientation?.type?.includes('landscape') ?? false;
  return byDims || byMQ || byScreen;
}

function computeIsTouchLikeViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth;
  const coarsePointer = window.matchMedia?.('(hover: none), (pointer: coarse)').matches ?? false;
  return coarsePointer || width < 1024;
}

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(computeIsLandscape);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: number | undefined;
    let rafId: number | undefined;
    const update = () => setIsLandscape(computeIsLandscape());
    const updateSoon = () => {
      update();
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timeoutId) window.clearTimeout(timeoutId);
      rafId = window.requestAnimationFrame(update);
      timeoutId = window.setTimeout(update, 160);
    };

    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) mql.addEventListener('change', updateSoon);
    else mql.addListener(updateSoon);

    window.addEventListener('resize', updateSoon);
    window.addEventListener('orientationchange', updateSoon);
    window.screen?.orientation?.addEventListener?.('change', updateSoon);
    window.visualViewport?.addEventListener('resize', updateSoon);
    updateSoon();

    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', updateSoon);
      else mql.removeListener(updateSoon);
      window.removeEventListener('resize', updateSoon);
      window.removeEventListener('orientationchange', updateSoon);
      window.screen?.orientation?.removeEventListener?.('change', updateSoon);
      window.visualViewport?.removeEventListener('resize', updateSoon);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return isLandscape;
}

export function useIsLiveGameLandscape(): boolean {
  const isLandscape = useIsLandscape();
  const [isTouchLike, setIsTouchLike] = useState<boolean>(computeIsTouchLikeViewport);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsTouchLike(computeIsTouchLikeViewport());
    const pointerMql = window.matchMedia('(hover: none), (pointer: coarse)');
    if (pointerMql.addEventListener) pointerMql.addEventListener('change', update);
    else pointerMql.addListener(update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    update();

    return () => {
      if (pointerMql.removeEventListener) pointerMql.removeEventListener('change', update);
      else pointerMql.removeListener(update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return isLandscape && isTouchLike;
}
