import React, { useState } from 'react';
import { Player } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useRama } from '@/hooks/useRama';

interface Props {
  roster: Player[];
  onConfirm: (starterIds: string[]) => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  preSelected?: string[];
}

const StartingLineup: React.FC<Props> = ({ roster, onConfirm, onBack, title, subtitle, buttonLabel, preSelected }) => {
  const { t } = useRama();
  const [selected, setSelected] = useState<Set<string>>(new Set(preSelected || []));
  const rosterTooSmall = roster.length < 5;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full p-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground tap-feedback mb-3 -ml-1 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      )}
      <h2 className="text-lg font-extrabold text-foreground mb-1">{title || 'Quinteto Inicial'}</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {subtitle || `Selecciona ${t.thePl} 5 ${t.players} que inician (${selected.size}/5)`}
      </p>

      {rosterTooSmall && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="font-extrabold text-destructive">Faltan jugadoras para iniciar</p>
              <p className="text-xs font-semibold text-muted-foreground">
                El quinteto necesita 5 jugadoras y este partido tiene {roster.length}. Vuelve para corregir el roster.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {roster.map(player => {
          const isSelected = selected.has(player.id);
          return (
            <button
              key={player.id}
              onClick={() => toggle(player.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg tap-feedback transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-card border-2 border-transparent hover:border-border'
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="text-lg font-extrabold text-primary">#{player.number}</span>
              <span className="text-sm font-semibold text-foreground truncate">{player.name}</span>
            </button>
          );
        })}
      </div>

      {rosterTooSmall && onBack ? (
        <Button
          onClick={onBack}
          variant="outline"
          className="mt-4 h-12 text-base font-bold gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> Volver y corregir roster
        </Button>
      ) : (
        <Button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size !== 5}
          className="mt-4 h-12 text-base font-bold"
        >
          {buttonLabel || 'Iniciar Registro'}
        </Button>
      )}
    </div>
  );
};

export default StartingLineup;
