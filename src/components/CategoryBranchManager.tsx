import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES, Category } from '@/types/basketball';
import type { Rama } from '@/utils/genderTerms';

const RAMA_OPTIONS: { value: Rama; label: string; emoji: string; help: string }[] = [
  { value: 'femenino', label: 'Femenino', emoji: '👩', help: 'Usa "jugadora/jugadoras"' },
  { value: 'masculino', label: 'Masculino', emoji: '👨', help: 'Usa "jugador/jugadores"' },
  { value: 'mixto', label: 'Mixto', emoji: '🧑', help: 'Usa "deportistas"' },
];

interface Row {
  category: Category;
  rama: Rama;
  /** True if the row already exists in DB (vs only in memory). */
  exists: boolean;
  saving?: boolean;
}

const CategoryBranchManager: React.FC = () => {
  const { profile } = useAuth();
  const clubId = profile?.club_id ?? null;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!clubId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('club_categories')
      .select('category, rama')
      .eq('club_id', clubId);
    if (error) {
      toast.error('No se pudo cargar la configuración');
      setLoading(false);
      return;
    }
    const byCat = new Map<string, Rama>();
    (data ?? []).forEach((r: any) => byCat.set(r.category, r.rama as Rama));
    setRows(
      CATEGORIES.map((c) => ({
        category: c,
        rama: (byCat.get(c) as Rama) ?? 'femenino',
        exists: byCat.has(c),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const setRowRama = (category: Category, rama: Rama) => {
    setRows((prev) => prev.map((r) => (r.category === category ? { ...r, rama } : r)));
  };

  const saveRow = async (row: Row) => {
    if (!clubId) return;
    setRows((prev) => prev.map((r) => (r.category === row.category ? { ...r, saving: true } : r)));
    const payload = { club_id: clubId, category: row.category, rama: row.rama };
    const { error } = await supabase
      .from('club_categories')
      .upsert(payload, { onConflict: 'club_id,category' });
    setRows((prev) =>
      prev.map((r) => (r.category === row.category ? { ...r, saving: false, exists: true } : r)),
    );
    if (error) {
      toast.error('No se pudo guardar');
      console.error(error);
    } else {
      toast.success(`${row.category} → ${row.rama}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Rama por categoría
        </p>
        <p>
          BASQUEST+ adapta automáticamente el lenguaje (jugadora / jugador / deportista)
          en informes, análisis IA y la app según la rama configurada.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.category}
            className="rounded-lg border border-border/60 bg-card p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-foreground">{row.category}</span>
              <Button
                onClick={() => saveRow(row)}
                size="sm"
                variant="outline"
                disabled={row.saving}
                className="h-8 gap-1.5 text-xs"
              >
                {row.saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Guardar
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RAMA_OPTIONS.map((opt) => {
                const active = row.rama === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRowRama(row.category, opt.value)}
                    className={`tap-feedback flex flex-col items-center gap-0.5 rounded-md border-2 px-1 py-2 transition-colors ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg leading-none">{opt.emoji}</span>
                    <span className={`text-[11px] font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">
                      {opt.help}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBranchManager;
