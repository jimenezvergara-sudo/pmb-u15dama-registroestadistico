import React, { useState, useRef, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  disabled: boolean;
  onAction: (action: 'rebound' | 'assist' | 'steal' | 'turnover') => void;
}

const ACTIONS = [
  { key: 'rebound' as const, label: '🏀 Rebote', angle: -90 },
  { key: 'assist' as const, label: '🤝 Asistencia', angle: -45 },
  { key: 'steal' as const, label: '🖐️ Robo', angle: 0 },
];

const QuickActionFAB: React.FC<Props> = ({ disabled, onAction }) => {
  const [open, setOpen] = useState(false);
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
    }
    dragRef.current = null;
  }, [dragging, disabled]);

  return (
    <div
      className="relative"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {/* Radial menu items */}
      {open && !disabled && ACTIONS.map((action, i) => (
        <button
          key={action.key}
          onClick={() => { onAction(action.key); setOpen(false); }}
          className="absolute whitespace-nowrap px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg tap-feedback transition-all duration-200"
          style={{
            transform: `translate(${Math.cos((action.angle * Math.PI) / 180) * 80}px, ${Math.sin((action.angle * Math.PI) / 180) * 80}px)`,
            top: '50%',
            left: '50%',
            marginTop: '-14px',
            marginLeft: '-14px',
            zIndex: 20,
          }}
        >
          {action.label}
        </button>
      ))}

      {/* FAB button */}
      <button
        ref={fabRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        disabled={disabled}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all tap-feedback touch-none ${
          disabled
            ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
            : open
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary/80 text-primary-foreground backdrop-blur-sm'
        }`}
        title="Acciones rápidas"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default QuickActionFAB;
