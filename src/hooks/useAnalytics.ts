import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'basquest_session_id';

const getSessionId = (): string => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

interface TrackOptions {
  page: string;
  userId?: string | null;
  isPublicView?: boolean;
  shareId?: string | null;
}

export const usePageView = ({ page, userId, isPublicView = false, shareId }: TrackOptions) => {
  const startTime = useRef(Date.now());
  const viewId = useRef<string | null>(null);

  useEffect(() => {
    startTime.current = Date.now();

    const insertView = async () => {
      const { data } = await supabase
        .from('page_views')
        .insert({
          session_id: getSessionId(),
          page,
          user_id: userId || null,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          is_public_view: isPublicView,
          share_id: shareId || null,
        })
        .select('id')
        .single();

      if (data) viewId.current = data.id;
    };

    insertView();

    return () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      if (viewId.current && duration > 0) {
        // Fire and forget — update duration on unmount
        supabase
          .from('page_views')
          .update({ duration_seconds: duration })
          .eq('id', viewId.current)
          .then(() => {});
      }
    };
  }, [page, userId, isPublicView, shareId]);
};

// Track a single event (for GA4 bridge)
export const trackEvent = (name: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, params);
  }
};
