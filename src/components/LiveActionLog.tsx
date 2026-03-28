import React, { useState } from 'react';
import { Game, QUARTER_LABELS, QuarterId, ActionType } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ACTION_LABELS: Record<ActionType, string> = {
  rebound: 'Rebote',
  offensive_rebound: 'Reb. Ofensivo',
  defensive_rebound: 'Reb. Defensivo',
  assist: 'Asistencia',
  steal: 'Robo',
  turnover: 'Pérdida',
  foul: 'Falta',
};

type UnifiedEvent = {
  id: string;
  timestamp: number;
  quarterId: QuarterId;
} & (
  | { kind: 'shot'; playerId: string; points: 1 | 2 | 3; made: boolean }
  | { kind: 'action'; playerId: string; type: ActionType }
  | { kind: 'opponent'; points: 1 | 2 | 3 }
  | { kind: 'substitution'; playerIn: string; playerOut: string }
);

interface LiveActionLogProps {
  game: Game;
  onDeleteShot: (id: string) => void;
  onDeleteAction: (id: string) => void;
  onDeleteOpponentScore: (id: string) => void;
  onToggleShotResult: (id: string) => void;
}

const LiveActionLog: React.FC<LiveActionLogProps> = ({
  game,
  onDeleteShot,
  onDeleteAction,
  onDeleteOpponentScore,
  onToggleShotResult,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UnifiedEvent | null>(null);

  // Build unified timeline
  const events: UnifiedEvent[] = [
    ...game.shots.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      quarterId: s.quarterId,
      kind: 'shot' as const,
      playerId: s.playerId,
      points: s.points,
      made: s.made,
    })),
    ...(game.actions || []).map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      quarterId: a.quarterId,
      kind: 'action' as const,
      playerId: a.playerId,
      type: a.type,
    })),
    ...(game.opponentScores || []).map(o => ({
      id: o.id,
      timestamp: o.timestamp,
      quarterId: o.quarterId,
      kind: 'opponent' as const,
      points: o.points,
    })),
    ...(game.substitutions || []).map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      quarterId: s.quarterId,
      kind: 'substitution' as const,
      playerIn: s.playerIn,
      playerOut: s.playerOut,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const getPlayerLabel = (playerId: string) => {
    const p = game.roster.find(r => r.id === playerId);
    return p ? `#${p.number} ${p.name.split(' ')[0]}` : '??';
  };

  const handleDelete = (event: UnifiedEvent) => {
    setConfirmDelete(event);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'shot') onDeleteShot(confirmDelete.id);
    else if (confirmDelete.kind === 'action') onDeleteAction(confirmDelete.id);
    else if (confirmDelete.kind === 'opponent') onDeleteOpponentScore(confirmDelete.id);
    setConfirmDelete(null);
  };

  const renderEvent = (event: UnifiedEvent) => {
    let icon = '';
    let label = '';
    let colorClass = 'text-foreground';

    switch (event.kind) {
      case 'shot':
        icon = event.made ? '✅' : '❌';
        label = `${getPlayerLabel(event.playerId)} — ${event.points === 1 ? 'TL' : event.points + 'pts'} ${event.made ? 'Canasta' : 'Fallo'}`;
        colorClass = event.made ? 'text-success' : 'text-destructive';
        break;
      case 'action':
        icon = event.type === 'foul' ? '🟡' : event.type === 'steal' ? '🔥' : event.type === 'assist' ? '🅰️' : event.type.includes('rebound') ? '📏' : event.type === 'turnover' ? '💫' : '⚡';
        label = `${getPlayerLabel(event.playerId)} — ${ACTION_LABELS[event.type]}`;
        break;
      case 'opponent':
        icon = '🏀';
        label = `Rival +${event.points}`;
        colorClass = 'text-destructive';
        break;
      case 'substitution':
        icon = '🔄';
        label = `${getPlayerLabel(event.playerIn)} ↔ ${getPlayerLabel(event.playerOut)}`;
        colorClass = 'text-muted-foreground';
        break;
    }

    const canDelete = event.kind !== 'substitution';
    const canToggle = event.kind === 'shot';

    return (
      <div
        key={event.id}
        className="flex items-center gap-2 py-1.5 px-2 border-b border-border/50 last:border-0"
      >
        <span className="text-[10px] font-bold text-muted-foreground w-7 shrink-0">
          {QUARTER_LABELS[event.quarterId]}
        </span>
        <span className="text-sm shrink-0">{icon}</span>
        <span className={`text-xs font-medium flex-1 truncate ${colorClass}`}>
          {label}
        </span>
        <div className="flex gap-0.5 shrink-0">
          {canToggle && (
            <button
              onClick={() => onToggleShotResult(event.id)}
              className="p-1 rounded hover:bg-accent tap-feedback"
              title="Cambiar resultado"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDelete(event)}
              className="p-1 rounded hover:bg-destructive/10 tap-feedback"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-card border-t border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 tap-feedback"
        >
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Registro de Acciones ({events.length})
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="max-h-64 overflow-y-auto px-1 pb-2">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin acciones registradas
              </p>
            ) : (
              events.map(renderEvent)
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción se eliminará del registro del partido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveActionLog;
