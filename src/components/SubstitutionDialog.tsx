import React, { useState } from 'react';
import { Player } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowRightLeft } from 'lucide-react';

interface Props {
  roster: Player[];
  onCourtIds: string[];
  onSubstitute: (playerIn: string, playerOut: string) => void;
}

const SubstitutionDialog: React.FC<Props> = ({ roster, onCourtIds, onSubstitute }) => {
  const [open, setOpen] = useState(false);
  const [playerOut, setPlayerOut] = useState<string | null>(null);
  const [playerIn, setPlayerIn] = useState<string | null>(null);

  const onCourt = roster.filter(p => onCourtIds.includes(p.id));
  const bench = roster.filter(p => !onCourtIds.includes(p.id));

  const handleConfirm = () => {
    if (playerIn && playerOut) {
      onSubstitute(playerIn, playerOut);
      setPlayerOut(null);
      setPlayerIn(null);
      setOpen(false);
    }
  };

  const reset = () => {
    setPlayerOut(null);
    setPlayerIn(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          className="px-3 py-2 rounded-lg text-xs font-bold tap-feedback border-2 bg-card text-card-foreground border-border hover:border-primary flex items-center gap-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Cambios
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">Cambio de Jugadora</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Player OUT */}
          <div>
            <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">Sale</p>
            <div className="grid grid-cols-3 gap-2">
              {onCourt.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlayerOut(p.id)}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg tap-feedback transition-colors ${
                    playerOut === p.id
                      ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive'
                      : 'bg-card text-card-foreground border border-border'
                  }`}
                >
                  <span className="text-lg font-extrabold">#{p.number}</span>
                  <span className="text-[10px] font-medium truncate w-full text-center">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player IN */}
          <div>
            <p className="text-xs font-bold text-success uppercase tracking-wider mb-2">Entra</p>
            {bench.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No hay jugadoras en banca</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {bench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlayerIn(p.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg tap-feedback transition-colors ${
                      playerIn === p.id
                        ? 'bg-success text-success-foreground ring-2 ring-success'
                        : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    <span className="text-lg font-extrabold">#{p.number}</span>
                    <span className="text-[10px] font-medium truncate w-full text-center">{p.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!playerIn || !playerOut}
            className="w-full h-11 font-bold"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Confirmar Cambio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubstitutionDialog;
