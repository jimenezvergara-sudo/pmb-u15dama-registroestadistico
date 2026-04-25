import React, { useState, useMemo } from 'react';
import { Game, QuarterId, QUARTER_LABELS, ActionType } from '@/types/basketball';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CourtDiagram from '@/components/CourtDiagram';
import { toast } from 'sonner';
import { Trash2, Plus, ChevronDown, Trophy, Calendar, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';

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

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'offensive_rebound', label: '🏀 Reb. Ofensivo' },
  { value: 'defensive_rebound', label: '🏀 Reb. Defensivo' },
  { value: 'assist', label: '🤝 Asistencia' },
  { value: 'steal', label: '🖐️ Robo' },
  { value: 'turnover', label: '❌ Pérdida' },
  { value: 'foul', label: '🟡 Falta' },
];

type TabId = 'all' | 'shots' | 'opponent' | 'actions';
type AddTab = 'shot' | 'opponent' | 'action';

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const GameEventEditor: React.FC<Props> = ({ game, open, onClose, onSave }) => {
  const { tournaments } = useApp();
  const [editedGame, setEditedGame] = useState<Game>(game);
  const [tab, setTab] = useState<TabId>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('shot');
  const [courtRotation, setCourtRotation] = useState(0);

  // Shot form
  const [shotPlayerId, setShotPlayerId] = useState('');
  const [shotQuarter, setShotQuarter] = useState<QuarterId>('Q1');
  const [shotPoints, setShotPoints] = useState<1 | 2 | 3>(2);
  const [shotCoords, setShotCoords] = useState<{ x: number; y: number } | null>(null);

  // Opponent form
  const [oppQuarter, setOppQuarter] = useState<QuarterId>('Q1');

  // Action form
  const [actPlayerId, setActPlayerId] = useState('');
  const [actQuarter, setActQuarter] = useState<QuarterId>('Q1');
  const [actType, setActType] = useState<ActionType>('defensive_rebound');

  React.useEffect(() => {
    setEditedGame(game);
    setShotQuarter(game.currentQuarter);
    setOppQuarter(game.currentQuarter);
    setActQuarter(game.currentQuarter);
    setShotCoords(null);
  }, [game]);

  const playerMap = useMemo(() => {
    const map = new Map<string, { name: string; number: number }>();
    game.roster.forEach(p => map.set(p.id, { name: p.name, number: p.number }));
    return map;
  }, [game.roster]);

  const sortedRoster = useMemo(
    () => [...game.roster].sort((a, b) => a.number - b.number),
    [game.roster]
  );

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

  const addShot = (made: boolean) => {
    if (!shotPlayerId) return;
    if (!shotCoords) {
      toast.error('Toca la cancha para indicar la zona del tiro');
      return;
    }
    setEditedGame(g => ({
      ...g,
      shots: [
        ...g.shots,
        {
          id: newId(),
          playerId: shotPlayerId,
          quarterId: shotQuarter,
          x: shotCoords.x,
          y: shotCoords.y,
          made,
          points: shotPoints,
          timestamp: Date.now(),
        },
      ],
    }));
    setShotCoords(null);
    toast.success(`Tiro ${made ? 'anotado' : 'fallado'} agregado`);
  };

  const addOpponent = (points: 1 | 2 | 3) => {
    setEditedGame(g => ({
      ...g,
      opponentScores: [
        ...g.opponentScores,
        { id: newId(), points, quarterId: oppQuarter, timestamp: Date.now() },
      ],
    }));
    toast.success(`+${points} rival`);
  };

  const addAction = () => {
    if (!actPlayerId) return;
    setEditedGame(g => ({
      ...g,
      actions: [
        ...(g.actions || []),
        {
          id: newId(),
          playerId: actPlayerId,
          quarterId: actQuarter,
          type: actType,
          timestamp: Date.now(),
        },
      ],
    }));
    toast.success('Acción agregada');
  };

  const setTournament = (id: string) => {
    setEditedGame(g => ({ ...g, tournamentId: id || undefined }));
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

  const selectCls = "h-8 rounded border border-input bg-background px-2 text-xs font-bold";

  const addTabBtn = (id: AddTab, label: string) => (
    <button
      onClick={() => setAddTab(id)}
      className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
        addTab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Editar Registros del Partido</DialogTitle>
          <DialogDescription className="text-xs">
            vs {game.opponentName} — {new Date(game.date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {/* Date + Opponent editing */}
        <div className="px-4 pb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" /> Fecha
            </label>
            <Input
              type="date"
              value={editedGame.date ? new Date(editedGame.date).toISOString().slice(0, 10) : ''}
              onChange={e => {
                const v = e.target.value;
                if (!v) return;
                // Preserve time-of-day from the original timestamp
                const original = new Date(editedGame.date);
                const [y, m, d] = v.split('-').map(Number);
                const next = new Date(original);
                next.setFullYear(y, m - 1, d);
                setEditedGame(g => ({ ...g, date: next.toISOString() }));
              }}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" /> Rival
            </label>
            <Input
              type="text"
              value={editedGame.opponentName}
              onChange={e => setEditedGame(g => ({ ...g, opponentName: e.target.value }))}
              placeholder="Nombre del rival"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Tournament selector */}
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
            <Trophy className="h-3.5 w-3.5" /> Campeonato
          </label>
          <select
            value={editedGame.tournamentId || ''}
            onChange={e => setTournament(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-medium"
          >
            <option value="">Sin campeonato</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Add event collapsible */}
        <div className="px-4 pb-2">
          <Collapsible open={addOpen} onOpenChange={setAddOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
              <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Agregar evento</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${addOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 p-2 rounded-md border border-border bg-muted/30">
              <div className="flex gap-1">
                {addTabBtn('shot', 'Tiro')}
                {addTabBtn('opponent', 'Rival')}
                {addTabBtn('action', 'Acción')}
              </div>

              {addTab === 'shot' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select value={shotPlayerId} onChange={e => setShotPlayerId(e.target.value)} className={`${selectCls} flex-1 min-w-[140px]`}>
                      <option value="">— Jugadora —</option>
                      {sortedRoster.map(p => (
                        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                      ))}
                    </select>
                    <select value={shotQuarter} onChange={e => setShotQuarter(e.target.value as QuarterId)} className={selectCls}>
                      {QUARTERS.map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
                    </select>
                    <select value={shotPoints} onChange={e => setShotPoints(Number(e.target.value) as 1 | 2 | 3)} className={selectCls}>
                      <option value={1}>1 PT</option>
                      <option value={2}>2 PT</option>
                      <option value={3}>3 PT</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" disabled={!shotPlayerId} onClick={() => addShot(true)}>
                      ✅ Anotado
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled={!shotPlayerId} onClick={() => addShot(false)}>
                      ❌ Fallado
                    </Button>
                  </div>
                </div>
              )}

              {addTab === 'opponent' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">Cuarto:</span>
                    <select value={oppQuarter} onChange={e => setOppQuarter(e.target.value as QuarterId)} className={selectCls}>
                      {QUARTERS.map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map(pts => (
                      <Button key={pts} size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => addOpponent(pts)}>
                        +{pts} PT
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {addTab === 'action' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select value={actPlayerId} onChange={e => setActPlayerId(e.target.value)} className={`${selectCls} flex-1 min-w-[140px]`}>
                      <option value="">— Jugadora —</option>
                      {sortedRoster.map(p => (
                        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                      ))}
                    </select>
                    <select value={actQuarter} onChange={e => setActQuarter(e.target.value as QuarterId)} className={selectCls}>
                      {QUARTERS.map(q => <option key={q} value={q}>{QUARTER_LABELS[q]}</option>)}
                    </select>
                    <select value={actType} onChange={e => setActType(e.target.value as ActionType)} className={`${selectCls} flex-1 min-w-[140px]`}>
                      {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" disabled={!actPlayerId} onClick={addAction}>
                    <Plus className="h-3.5 w-3.5" /> Agregar acción
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

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
