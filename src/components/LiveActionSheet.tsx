import React from 'react';
import { ActionType } from '@/types/basketball';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  playerLabel: string;
  onClose: () => void;
  onAction: (action: ActionType) => void;
  onShotShortcut: () => void; // open shot flow (focus court)
}

/**
 * Bottom sheet de acciones rápidas para registro en vivo.
 * Aparece fijo en la parte inferior, sin tapar las jugadoras de arriba.
 * Cada acción tiene color sólido distintivo y altura mínima 56px.
 */
const LiveActionSheet: React.FC<Props> = ({ open, playerLabel, onClose, onAction, onShotShortcut }) => {
  if (!open) return null;

  const baseBtn =
    'min-h-[56px] rounded-xl text-white font-extrabold text-base tap-feedback flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform';

  return (
    <>
      {/* Backdrop transparente para cerrar tocando afuera (sin oscurecer la cancha) */}
      <div
        className="fixed inset-0 z-40 bg-black/30 animate-in fade-in"
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-card border-t-2 border-primary rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-label="Acciones rápidas"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registrar acción</p>
            <p className="text-base font-black truncate text-foreground">{playerLabel}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center tap-feedback active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pb-4 pt-1 grid grid-cols-3 gap-2">
          {/* Tiro - morado */}
          <button
            onClick={() => { onShotShortcut(); onClose(); }}
            className={`${baseBtn} bg-[hsl(270_85%_50%)] hover:bg-[hsl(270_85%_45%)] col-span-3`}
            style={{ minHeight: 56 }}
          >
            <span className="text-2xl leading-none">🏀</span>
            <span>Tiro (toca cancha)</span>
          </button>

          {/* Rebote - gris oscuro con sub opciones */}
          <button
            onClick={() => onAction('offensive_rebound')}
            className={`${baseBtn} bg-[hsl(220_15%_25%)] hover:bg-[hsl(220_15%_20%)]`}
          >
            <span className="text-xl leading-none">⬛</span>
            <span className="text-sm">Reb OF</span>
          </button>
          <button
            onClick={() => onAction('defensive_rebound')}
            className={`${baseBtn} bg-[hsl(220_15%_35%)] hover:bg-[hsl(220_15%_30%)]`}
          >
            <span className="text-xl leading-none">⬛</span>
            <span className="text-sm">Reb DEF</span>
          </button>
          {/* Asistencia - dorado */}
          <button
            onClick={() => onAction('assist')}
            className={`${baseBtn} bg-[hsl(45_95%_50%)] hover:bg-[hsl(45_95%_45%)] text-black`}
          >
            <span className="text-xl leading-none">💛</span>
            <span className="text-sm">Asistencia</span>
          </button>

          {/* Robo - verde */}
          <button
            onClick={() => onAction('steal')}
            className={`${baseBtn} bg-[hsl(142_72%_38%)] hover:bg-[hsl(142_72%_33%)]`}
          >
            <span className="text-xl leading-none">🔴</span>
            <span className="text-sm">Robo</span>
          </button>
          {/* Pérdida - rojo */}
          <button
            onClick={() => onAction('turnover')}
            className={`${baseBtn} bg-[hsl(0_75%_50%)] hover:bg-[hsl(0_75%_45%)]`}
          >
            <span className="text-xl leading-none">❌</span>
            <span className="text-sm">Pérdida</span>
          </button>
          {/* Falta - naranja */}
          <button
            onClick={() => onAction('foul')}
            className={`${baseBtn} bg-[hsl(25_95%_53%)] hover:bg-[hsl(25_95%_48%)]`}
          >
            <span className="text-xl leading-none">🟡</span>
            <span className="text-sm">Falta</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveActionSheet;
