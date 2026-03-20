import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Ad {
  id: string;
  image_url: string;
  destination_link: string;
  priority: number;
}

const AdBannerCarousel: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('global_ads')
        .select('id, image_url, destination_link, priority')
        .eq('active', true)
        .order('priority', { ascending: false });
      if (data && data.length > 0) setAds(data);
    };
    fetch();
  }, []);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % ads.length);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [ads.length, next]);

  if (ads.length === 0) return null;

  const ad = ads[current];

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-md">
      <a
        href={ad.destination_link || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={ad.image_url}
          alt="Sponsor"
          className="w-full h-[120px] object-contain rounded-lg bg-black/5"
          loading="lazy"
        />
      </a>

      {/* Dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-primary-foreground scale-125 shadow-sm'
                  : 'bg-primary-foreground/40'
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdBannerCarousel;
