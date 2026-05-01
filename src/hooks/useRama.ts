import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { getRamaTerms, type Rama, type RamaTerms } from '@/utils/genderTerms';

interface CategoryRow {
  category: string;
  rama: Rama;
}

interface UseRamaResult {
  /** Rama de la categoría activa (default: 'femenino' si no se configuró). */
  rama: Rama;
  /** Terms helpers (player, players, the, etc.) ya resueltos para la rama activa. */
  t: RamaTerms;
  /** Mapa categoría → rama, útil en pantallas que listan categorías. */
  ramaByCategory: Record<string, Rama>;
  /** Recarga desde la base. */
  refresh: () => Promise<void>;
  loading: boolean;
}

/**
 * Lee la configuración de rama (femenino/masculino/mixto) por categoría desde
 * la tabla `club_categories` y devuelve la rama efectiva de la categoría activa.
 */
export const useRama = (overrideCategory?: string | null): UseRamaResult => {
  const { profile } = useAuth();
  const { state } = useApp();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const clubId = profile?.club_id ?? null;
  const category = overrideCategory ?? state.activeCategory;

  const load = async () => {
    if (!clubId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('club_categories')
      .select('category, rama')
      .eq('club_id', clubId);
    if (!error && data) {
      setRows(data as CategoryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const ramaByCategory = useMemo(() => {
    const m: Record<string, Rama> = {};
    rows.forEach((r) => { m[r.category] = r.rama; });
    return m;
  }, [rows]);

  const rama: Rama = ramaByCategory[category] ?? 'femenino';
  const t = useMemo(() => getRamaTerms(rama), [rama]);

  return { rama, t, ramaByCategory, refresh: load, loading };
};
