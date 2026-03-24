import React, { useState, useMemo } from 'react';
import { Game, QuarterId, QUARTER_LABELS, ShotEvent, OpponentScore, GameAction } from '@/types/basketball';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface Props {
  game: Game;
  open: boolean;
  onClose: () => void;
  onSave: (game: Game) => void;
}

type EventRow = {
  id: string;
  type: 'shot' | 'opponent' | 'action';
  playerName: string;
  playerNumber: string;
  description: string;
  quarterId: QuarterId;
  timestamp: number;
};

const QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const ACTION_LABELS: Record<string, string> = {
  rebound: '🏀 Rebote',
  offensive_rebound: '🏀 Reb. Ofensivo',
  defensive_rebound: '🏀 Reb. Defensivo',
  assist: '🤝 Asistencia',
  steal: '🖐️ Robo',
  turnover: '❌ Pérdida',
  foul: '🟡 Falta',
};

type TabId = 'all' | 'shots' | 'opponent' | 'actions';

const GameEventEditor: React.FC<Props> = ({ game, open, onClose, onSave }) => {
  const [editedGame, setEditedGame] = useState<Game>(game);
  const [tab, setTab] = useState<TabId>('all');

  React.useEffect(() => {
    setEditedGame(game);
  }, [game]);

  const playerMap = useMemo(() => {
    const map = new Map<string, { name: string; number: number }>();
    game.roster.forEach(p => map.set(p.id, { name: p.name, number: p.number }));
    return map;
  }, [game.roster]);

  // Build unified event rows
  const rows = useMemo(() => {
    const result: EventRow[] = [];

    editedGame.shots.forEach(s => {
      const p = playerMap.get(s.playerId);
      result.push({
        id: s.id,
        type: 'shot',
        playerName: p?.name || '?',
        playerNumber: p ? `#${p.number}` : '?',
        description: `${s.points}PT ${s.made ? '✅ Anotado' : '❌ Fallado'}`,
        quarterId: s.quarterId,
        timestamp: s.timestamp,
      });
    });

    editedGame.opponentScores.forEach(s => {
      result.push({
        id: s.id,
        type: 'opponent',
        playerName: 'Rival',
        playerNumber: '—',
        description: `${s.points}PT Anotado`,
        quarterId: s.quarterId,
        timestamp: s.timestamp,
      });
    });

    (editedGame.actions || []).forEach(a => {
      const p = playerMap.get(a.playerId);
      result.push({
        id: a.id,
        type: 'action',
        playerName: p?.name || '?',
        playerNumber: p ? `#${p.number}` : '?',
        description: ACTION_LABELS[a.type] || a.type,
        quarterId: a.quarterId,
        timestamp: a.timestamp,
      });
    });

    result.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  }, [editedGame, playerMap]);

  const filteredRows = useMemo(() => {
    if (tab === 'all') return rows;
    if (tab === 'shots') return rows.filter(r => r.type === 'shot');
    if (tab === 'opponent') return rows.filter(r => r.type === 'opponent');
    return rows.filter(r => r.type === 'action');
  }, [rows, tab]);

  const updateQuarter = (id: string, type: EventRow['type'], newQ: QuarterId) => {
    setEditedGame(g => {
      if (type === 'shot') return { ...g, shots: g.shots.map(s => s.id === id ? { ...s, quarterId: newQ } : s) };
      if (type === 'opponent') return { ...g, opponentScores: g.opponentScores.map(s => s.id === id ? { ...s, quarterId: newQ } : s) };
      return { ...g, actions: (g.actions || []).map(a => a.id === id ? { ...a, quarterId: newQ } : a) };
    });
  };

  const deleteEvent = (id: string, type: EventRow['type']) => {
    setEditedGame(g => {
      if (type === 'shot') return { ...g, shots: g.shots.filter(s => s.id !== id) };
      if (type === 'opponent') return { ...g, opponentScores: g.opponentScores.filter(s => s.id !== id) };
      return { ...g, actions: (g.actions || []).filter(a => a.id !== id) };
    });
  };

  const handleSave = () => {
    onSave(editedGame);
    toast.success('Registros actualizados');
    onClose();
  };

  const hasChanges = JSON.stringify(editedGame) !== JSON.stringify(game);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'Todo', count: rows.length },
    { id: 'shots', label: 'Tiros', count: editedGame.shots.length },
    { id: 'opponent', label: 'Rival', count: editedGame.opponentScores.length },
    { id: 'actions', label: 'Acciones', count: (editedGame.actions || []).length },
  ];

  const typeBadge = (type: EventRow['type']) => {
    const styles: Record<string, string> = {
      shot: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
      opponent: 'bg-red-500/15 text-red-700 dark:text-red-300',
      action: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    };
    const labels: Record<string, string> = { shot: 'Tiro', opponent: 'Rival', action: 'Acción' };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Editar Registros del Partido</DialogTitle>
          <DialogDescription className="text-xs">
            vs {game.opponentName} — {new Date(game.date).toLocaleDateString()}
            {' · '}Selecciona el cuarto correcto para cada registro o elimínalo.
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

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {filteredRows.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-[11px]">#</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Jugadora</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Tipo</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Detalle</TableHead>
                  <TableHead className="h-8 px-2 text-[11px]">Cuarto</TableHead>
                  <TableHead className="h-8 px-2 text-[11px] w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2 text-xs font-bold">{row.playerNumber}</TableCell>
                    <TableCell className="p-2 text-xs truncate max-w-[120px]">{row.playerName}</TableCell>
                    <TableCell className="p-2">{typeBadge(row.type)}</TableCell>
                    <TableCell className="p-2 text-xs">{row.description}</TableCell>
                    <TableCell className="p-2">
                      <select
                        value={row.quarterId}
                        onChange={e => updateQuarter(row.id, row.type, e.target.value as QuarterId)}
                        className="h-7 rounded border border-input bg-background px-1.5 text-xs font-bold w-16"
                      >
                        {QUARTERS.map(q => (
                          <option key={q} value={q}>{QUARTER_LABELS[q]}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="p-2">
                      <button
                        onClick={() => deleteEvent(row.id, row.type)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
