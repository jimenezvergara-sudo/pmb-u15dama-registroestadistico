import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player, GameLeg, Game } from '@/types/basketball';
import { Play, ClipboardList, AlertTriangle, Check } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.svg';
import GameEventEditor from '@/components/GameEventEditor';
import { newGameSchema, zodErrorsToMap } from '@/lib/validation';

const NewGame: React.FC = () => {
  const { players, startGame, tournaments, teams, games, updateGame, isReadOnlyView } = useApp();
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customOpponent, setCustomOpponent] = useState('');
  // Map of confirmed roster: playerId -> jersey number for the game
  const [rosterNumbers, setRosterNumbers] = useState<Record<string, number>>({});
  // Map of in-progress edits: playerId -> string being typed
  const [pendingNumber, setPendingNumber] = useState<Record<string, string>>({});
  const [tournamentId, setTournamentId] = useState<string>('');
  const [leg, setLeg] = useState<GameLeg | ''>('');
  const [isHome, setIsHome] = useState<boolean | undefined>(undefined);

  const opponentName = selectedTeamId
    ? teams.find(t => t.id === selectedTeamId)?.clubName || ''
    : customOpponent.trim();

  const isSelected = (id: string) => id in rosterNumbers || id in pendingNumber;

  // Count usage of each confirmed number to flag duplicates
  const numberUsage = useMemo(() => {
    const usage: Record<number, string[]> = {};
    Object.entries(rosterNumbers).forEach(([pid, n]) => {
      if (!usage[n]) usage[n] = [];
      usage[n].push(pid);
    });
    return usage;
  }, [rosterNumbers]);

  const isDuplicate = (playerId: string) => {
    const n = rosterNumbers[playerId];
    if (n === undefined) return false;
    return (numberUsage[n]?.length ?? 0) > 1;
  };

  const startEditing = (p: Player) => {
    const current = rosterNumbers[p.id] ?? p.number;
    setPendingNumber(prev => ({ ...prev, [p.id]: String(current) }));
  };

  const confirmNumber = (playerId: string) => {
    const raw = pendingNumber[playerId];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    setPendingNumber(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
    if (!isNaN(n) && n >= 0) {
      setRosterNumbers(prev => ({ ...prev, [playerId]: n }));
    } else {
      // invalid -> remove from roster
      setRosterNumbers(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }
  };

  const removePlayer = (playerId: string) => {
    setRosterNumbers(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
    setPendingNumber(prev => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  };

  const handlePlayerTap = (p: Player) => {
    if (isSelected(p.id)) {
      removePlayer(p.id);
    } else {
      startEditing(p);
    }
  };

  const selectedCount = Object.keys(rosterNumbers).length + Object.keys(pendingNumber).length;
  const hasDuplicates = Object.values(numberUsage).some(arr => arr.length > 1);
  const hasPending = Object.keys(pendingNumber).length > 0;

  // Validación con Zod
  const validation = useMemo(() => {
    const result = newGameSchema.safeParse({
      opponentName,
      leg: leg || undefined,
      isHome,
      rosterSize: Object.keys(rosterNumbers).length,
    });
    if (result.success) return { ok: true as const, errors: {} as Record<string, string> };
    return { ok: false as const, errors: zodErrorsToMap(result.error) };
  }, [opponentName, leg, isHome, rosterNumbers]);

  const handleStart = () => {
    if (!validation.ok) return;
    if (hasDuplicates || hasPending) return;
    const roster = players
      .filter(p => p.id in rosterNumbers)
      .map(p => ({ id: p.id, name: p.name, number: rosterNumbers[p.id], photo: p.photo }));
    startGame(
      opponentName,
      roster,
      tournamentId || undefined,
      selectedTeamId || undefined,
      leg || undefined,
      isHome,
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Nuevo Partido</h2>
        <img src={logoHorizontal} alt="BASQUEST+" className="h-8 object-contain" />
      </div>

      <div className="space-y-3">
        {/* Team selector */}
        {teams.length > 0 ? (
          <div className="space-y-1">
            <select
              value={selectedTeamId}
              onChange={e => {
                setSelectedTeamId(e.target.value);
                if (e.target.value) setCustomOpponent('');
              }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
            >
              <option value="">Seleccionar equipo rival...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.clubName} — {t.city}</option>
              ))}
            </select>
            {!selectedTeamId && (
              <Input
                placeholder="O escribe el nombre del rival"
                value={customOpponent}
                onChange={e => setCustomOpponent(e.target.value)}
                className={validation.errors.opponentName && customOpponent.length > 0 ? 'border-destructive ring-2 ring-destructive/40' : ''}
              />
            )}
            {validation.errors.opponentName && (customOpponent.length > 0 || !selectedTeamId) && customOpponent.length > 0 && (
              <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {validation.errors.opponentName}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Input
              placeholder="Equipo rival"
              value={customOpponent}
              onChange={e => setCustomOpponent(e.target.value)}
              className={validation.errors.opponentName && customOpponent.length > 0 ? 'border-destructive ring-2 ring-destructive/40' : ''}
            />
            {validation.errors.opponentName && customOpponent.length > 0 && (
              <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {validation.errors.opponentName}
              </p>
            )}
          </div>
        )}

        {/* Home/Away selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsHome(isHome === true ? undefined : true)}
            className={`flex-1 h-10 rounded-md border text-sm font-semibold transition-colors ${isHome === true ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground'}`}
          >
            🏠 Local
          </button>
          <button
            onClick={() => setIsHome(isHome === false ? undefined : false)}
            className={`flex-1 h-10 rounded-md border text-sm font-semibold transition-colors ${isHome === false ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background text-foreground'}`}
          >
            ✈️ Visita
          </button>
        </div>

        {/* Leg selector */}
        <select
          value={leg}
          onChange={e => setLeg(e.target.value as GameLeg | '')}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
        >
          <option value="">Tipo de partido</option>
          <option value="ida">Ida</option>
          <option value="vuelta">Vuelta</option>
        </select>

        {tournaments.length > 0 && (
          <select
            value={tournamentId}
            onChange={e => setTournamentId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
          >
            <option value="">Sin torneo</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-muted-foreground">
            Selecciona roster ({selectedCount})
          </p>
          {hasDuplicates && (
            <span className="text-xs font-bold text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Números duplicados
            </span>
          )}
        </div>
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">
            Primero añade jugadoras en Plantilla
          </p>
        )}
        <div className="space-y-1.5">
          {players.map((p: Player) => {
            const inRoster = p.id in rosterNumbers;
            const isPending = p.id in pendingNumber;
            const selected = inRoster || isPending;
            const dup = isDuplicate(p.id);
            const displayNum = isPending ? pendingNumber[p.id] : rosterNumbers[p.id];

            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  selected
                    ? dup
                      ? 'bg-destructive/10 border-destructive'
                      : isPending
                        ? 'bg-accent/10 border-accent'
                        : 'bg-primary/10 border-primary'
                    : 'bg-card border-border/50'
                }`}
              >
                <button
                  onClick={() => handlePlayerTap(p)}
                  className="flex-1 flex items-center gap-2 text-left tap-feedback min-h-[40px]"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      selected
                        ? dup
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {selected ? <Check className="w-4 h-4" /> : '+'}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                </button>

                {selected ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Nº</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={displayNum ?? ''}
                      autoFocus={isPending}
                      onFocus={(e) => {
                        if (!isPending) {
                          setPendingNumber(prev => ({ ...prev, [p.id]: String(rosterNumbers[p.id] ?? p.number) }));
                        }
                        e.currentTarget.select();
                      }}
                      onChange={e => setPendingNumber(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onBlur={() => confirmNumber(p.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className={`w-14 h-9 text-center text-base font-extrabold p-1 ${
                        dup ? 'border-destructive ring-2 ring-destructive/40' : ''
                      }`}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground pr-2">#{p.number}</span>
                )}
              </div>
            );
          })}
        </div>
        {hasDuplicates && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Hay jugadoras con el mismo número. Corrige antes de iniciar.
          </p>
        )}
      </div>

      <Button
        onClick={handleStart}
        disabled={!validation.ok || hasDuplicates || hasPending || isReadOnlyView}
        className="w-full h-14 text-lg font-bold tap-feedback gap-2"
      >
        <Play className="w-5 h-5" /> {isReadOnlyView ? 'Solo lectura — cambia a tu categoría' : 'Iniciar Partido'}
      </Button>

      {/* Editar partido anterior */}
      {games.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Editar acciones de partido anterior
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {games.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(g => {
              const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
              const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
              return (
                <button
                  key={g.id}
                  onClick={() => setEditingGame(g)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/60 hover:border-primary/40 transition-colors text-left tap-feedback"
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">vs {g.opponentName}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(g.date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-extrabold text-foreground">{teamPts} - {oppPts}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editingGame && (
        <GameEventEditor
          game={editingGame}
          open={!!editingGame}
          onClose={() => setEditingGame(null)}
          onSave={updateGame}
        />
      )}
    </div>
  );
};

export default NewGame;
