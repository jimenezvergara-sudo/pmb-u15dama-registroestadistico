import React, { useState, useRef, useCallback } from 'react';
import { Activity, X } from 'lucide-react';
import { ActionType } from '@/types/basketball';

interface Props {
  disabled: boolean;
  onAction: (action: ActionType) => void;
}

const ACTIONS: { key: ActionType; label: string; subOptions?: { key: ActionType; label: string; className: string }[] }[] = [
  {
    key: 'rebound' as ActionType,
    label: '🏀 Rebote',
    subOptions: [
      { key: 'offensive_rebound', label: 'OF', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
      { key: 'defensive_rebound', label: 'DEF', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
    ],
  },
  { key: 'assist', label: '🤝 Asistencia' },
  { key: 'steal', label: '🖐️ Robo' },
  { key: 'turnover', label: '❌ Pérdida' },
  { key: 'foul', label: '🟡 Falta' },
];

const QuickActionFAB: React.FC<Props> = ({ disabled, onAction }) => {
  const [open, setOpen] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(false);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos, disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setDragging(true);
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragging && !disabled) {
      setOpen(o => !o);
      setExpandedAction(null);
    }
    dragRef.current = null;
  }, [dragging, disabled]);

  return (
    <div
      className="relative"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Vertical menu above FAB */}
      {open && !disabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-1.5 items-center z-20">
          {ACTIONS.map(action => (
            <div key={action.key} className="flex flex-col items-center gap-1">
              {action.subOptions && expandedAction === action.key ? (
                <div className="flex gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                  {action.subOptions.map(sub => (
                    <button
                      key={sub.key}
                      onClick={() => { onAction(sub.key); setOpen(false); setExpandedAction(null); }}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold shadow-lg tap-feedback transition-all duration-200 ${sub.className}`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (action.subOptions) {
                      setExpandedAction(expandedAction === action.key ? null : action.key);
                    } else {
                      onAction(action.key);
                      setOpen(false);
                      setExpandedAction(null);
                    }
                  }}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg tap-feedback transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                >
                  {action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        ref={fabRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg text-xs font-bold tap-feedback border-2 touch-none flex items-center justify-center gap-1 ${
          disabled
            ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-border'
            : open
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-card text-card-foreground border-border hover:border-primary'
        }`}
        title="Acciones rápidas"
      >
        {open ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
        {open ? 'Cerrar' : 'Acciones'}
      </button>
    </div>
  );
};

export default QuickActionFAB;
