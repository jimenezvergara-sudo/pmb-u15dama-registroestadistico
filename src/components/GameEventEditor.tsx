import React, { useState, useMemo } from 'react';
import { Game, QuarterId, QUARTER_LABELS, ShotEvent, OpponentScore, GameAction } from '@/types/basketball';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  game: Game;
  open: boolean;
  onClose: () => void;
  onSave: (game: Game) => void;
}

type TabId = 'shots' | 'opponent' | 'actions';

const QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const GameEventEditor: React.FC<Props> = ({ game, open, onClose, onSave }) => {
  const [editedGame, setEditedGame] = useState<Game>(game);
  const [tab, setTab] = useState<TabId>('shots');

  // Reset when game changes
  React.useEffect(() => {
    setEditedGame(game);
  }, [game]);

  const playerMap = useMemo(() => {
    const map = new Map<string, string>();
    game.roster.forEach(p => map.set(p.id, `#${p.number} ${p.name}`));
    return map;
  }, [game.roster]);

  const updateShotQuarter = (shotId: string, newQ: QuarterId) => {
    setEditedGame(g => ({
      ...g,
      shots: g.shots.map(s => s.id === shotId ? { ...s, quarterId: newQ } : s),
    }));
  };

  const updateOpponentQuarter = (scoreId: string, newQ: QuarterId) => {
    setEditedGame(g => ({
      ...g,
      opponentScores: g.opponentScores.map(s => s.id === scoreId ? { ...s, quarterId: newQ } : s),
    }));
  };

  const updateActionQuarter = (actionId: string, newQ: QuarterId) => {
    setEditedGame(g => ({
      ...g,
      actions: (g.actions || []).map(a => a.id === actionId ? { ...a, quarterId: newQ } : a),
    }));
  };

  const deleteShot = (shotId: string) => {
    setEditedGame(g => ({ ...g, shots: g.shots.filter(s => s.id !== shotId) }));
  };

  const deleteOpponentScore = (scoreId: string) => {
    setEditedGame(g => ({ ...g, opponentScores: g.opponentScores.filter(s => s.id !== scoreId) }));
  };

  const deleteAction = (actionId: string) => {
    setEditedGame(g => ({ ...g, actions: (g.actions || []).filter(a => a.id !== actionId) }));
  };

  const handleSave = () => {
    onSave(editedGame);
    toast.success('Registros actualizados');
    onClose();
  };

  const hasChanges = JSON.stringify(editedGame) !== JSON.stringify(game);

  const actionLabel = (type: string) => {
    const labels: Record<string, string> = {
      rebound: '🏀 Rebote', assist: '🤝 Asistencia', steal: '🖐️ Robo',
      turnover: '❌ Pérdida', foul: '🟡 Falta',
    };
    return labels[type] || type;
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'shots', label: 'Tiros', count: editedGame.shots.length },
    { id: 'opponent', label: 'Rival', count: editedGame.opponentScores.length },
    { id: 'actions', label: 'Acciones', count: (editedGame.actions || []).length },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Editar Registros</DialogTitle>
          <DialogDescription className="text-xs">
            vs {game.opponentName} — {new Date(game.date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {tab === 'shots' && (
            <div className="space-y-1 mt-2">
              {editedGame.shots.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin tiros registrados</p>
              )}
              {editedGame.shots.map(shot => (
                <div key={shot.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{playerMap.get(shot.playerId) || '?'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {shot.points}PT {shot.made ? '✅' : '❌'}
                    </p>
                  </div>
                  <select
                    value={shot.quarterId}
                    onChange={e => updateShotQuarter(shot.id, e.target.value as QuarterId)}
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs font-bold w-16"
                  >
                    {QUARTERS.map(q => (
                      <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteShot(shot.id)} className="text-destructive text-xs font-bold px-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'opponent' && (
            <div className="space-y-1 mt-2">
              {editedGame.opponentScores.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin puntos rivales registrados</p>
              )}
              {editedGame.opponentScores.map(score => (
                <div key={score.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div className="flex-1">
                    <p className="text-xs font-bold">Rival: {score.points}PT</p>
                  </div>
                  <select
                    value={score.quarterId}
                    onChange={e => updateOpponentQuarter(score.id, e.target.value as QuarterId)}
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs font-bold w-16"
                  >
                    {QUARTERS.map(q => (
                      <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteOpponentScore(score.id)} className="text-destructive text-xs font-bold px-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-1 mt-2">
              {(editedGame.actions || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sin acciones registradas</p>
              )}
              {(editedGame.actions || []).map(action => (
                <div key={action.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{playerMap.get(action.playerId) || '?'}</p>
                    <p className="text-[10px] text-muted-foreground">{actionLabel(action.type)}</p>
                  </div>
                  <select
                    value={action.quarterId}
                    onChange={e => updateActionQuarter(action.id, e.target.value as QuarterId)}
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs font-bold w-16"
                  >
                    {QUARTERS.map(q => (
                      <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
                    ))}
                  </select>
                  <button onClick={() => deleteAction(action.id)} className="text-destructive text-xs font-bold px-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" disabled={!hasChanges} onClick={handleSave}>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameEventEditor;
