import React, { useState, useMemo } from 'react';
import { Player } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowRightLeft, X } from 'lucide-react';
import { useRama } from '@/hooks/useRama';

interface Props {
  roster: Player[];
  onCourtIds: string[];
  /** Llamado una vez por cada par (in, out). El reducer registra cada substitución. */
  onSubstitute: (playerIn: string, playerOut: string) => void;
  triggerClassName?: string;
  triggerLabel?: string;
}

const SubstitutionDialog: React.FC<Props> = ({ roster, onCourtIds, onSubstitute, triggerClassName, triggerLabel }) => {
  const { t } = useRama();
  const [open, setOpen] = useState(false);
  // Selección múltiple: hasta 5 jugadoras saliendo y 5 entrando
  const [outIds, setOutIds] = useState<string[]>([]);
  const [inIds, setInIds] = useState<string[]>([]);

  const onCourt = useMemo(() => roster.filter(p => onCourtIds.includes(p.id)), [roster, onCourtIds]);
  const bench = useMemo(() => roster.filter(p => !onCourtIds.includes(p.id)), [roster, onCourtIds]);

  const reset = () => { setOutIds([]); setInIds([]); };

  const toggleOut = (id: string) => setOutIds(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  const toggleIn = (id: string) => setInIds(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const canConfirm = outIds.length > 0 && outIds.length === inIds.length;

  const handleConfirm = () => {
    if (!canConfirm) return;
    // Empareja 1-a-1 en orden de selección
    for (let i = 0; i < outIds.length; i++) {
      onSubstitute(inIds[i], outIds[i]);
    }
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          className={triggerClassName ?? "w-full px-3 py-2 rounded-lg text-xs font-bold tap-feedback border-2 bg-card text-card-foreground border-border hover:border-primary flex items-center justify-center gap-1"}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          {triggerLabel ?? 'Cambios'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">Cambios de {t.playerCap}</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Selecciona la misma cantidad que sale y que entra (se emparejan en orden).
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Players OUT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">Salen ({outIds.length})</p>
              {outIds.length > 0 && (
                <button onClick={() => setOutIds([])} className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {onCourt.map(p => {
                const idx = outIds.indexOf(p.id);
                const selected = idx >= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleOut(p.id)}
                    className={`relative flex flex-col items-center py-2 px-1 rounded-lg tap-feedback transition-colors ${
                      selected
                        ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive'
                        : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    <span className="text-lg font-extrabold">#{p.number}</span>
                    <span className="text-[10px] font-medium truncate w-full text-center">{p.name.split(' ')[0]}</span>
                    {selected && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background text-destructive text-[10px] font-black flex items-center justify-center ring-1 ring-destructive">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Players IN */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-success uppercase tracking-wider">Entran ({inIds.length})</p>
              {inIds.length > 0 && (
                <button onClick={() => setInIds([])} className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            {bench.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No hay {t.players} en banca</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {bench.map(p => {
                  const idx = inIds.indexOf(p.id);
                  const selected = idx >= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleIn(p.id)}
                      className={`relative flex flex-col items-center py-2 px-1 rounded-lg tap-feedback transition-colors ${
                        selected
                          ? 'bg-success text-success-foreground ring-2 ring-success'
                          : 'bg-card text-card-foreground border border-border'
                      }`}
                    >
                      <span className="text-lg font-extrabold">#{p.number}</span>
                      <span className="text-[10px] font-medium truncate w-full text-center">{p.name.split(' ')[0]}</span>
                      {selected && (
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background text-success text-[10px] font-black flex items-center justify-center ring-1 ring-success">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {outIds.length !== inIds.length && (outIds.length > 0 || inIds.length > 0) && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold text-center">
              Salen {outIds.length} ≠ Entran {inIds.length}. Iguala la cantidad para confirmar.
            </p>
          )}

          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full h-11 font-bold"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {canConfirm ? `Confirmar ${outIds.length} cambio${outIds.length > 1 ? 's' : ''}` : 'Confirmar Cambio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubstitutionDialog;
