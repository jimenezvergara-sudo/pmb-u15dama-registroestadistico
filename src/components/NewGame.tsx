import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player, GameLeg, Game } from '@/types/basketball';
import { Play, ClipboardList, Pencil } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';
import GameEventEditor from '@/components/GameEventEditor';

const NewGame: React.FC = () => {
  const { players, startGame, tournaments, teams, games, updateGame } = useApp();
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customOpponent, setCustomOpponent] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [tournamentId, setTournamentId] = useState<string>('');
  const [leg, setLeg] = useState<GameLeg | ''>('');
  const [isHome, setIsHome] = useState<boolean | undefined>(undefined);

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const opponentName = selectedTeamId
    ? teams.find(t => t.id === selectedTeamId)?.clubName || ''
    : customOpponent.trim();

  const handleStart = () => {
    if (!opponentName || selectedPlayers.size === 0) return;
    const roster = players.filter(p => selectedPlayers.has(p.id));
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
          <div className="space-y-2">
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
              />
            )}
          </div>
        ) : (
          <Input
            placeholder="Equipo rival"
            value={customOpponent}
            onChange={e => setCustomOpponent(e.target.value)}
          />
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
        <p className="text-sm font-semibold text-muted-foreground mb-2">
          Selecciona roster ({selectedPlayers.size})
        </p>
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">
            Primero añade jugadoras en Plantilla
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {players.map((p: Player) => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`flex flex-col items-center py-3 px-2 rounded-lg tap-feedback min-h-[60px] transition-colors ${
                selectedPlayers.has(p.id)
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                  : 'bg-card text-card-foreground'
              }`}
            >
              <span className="text-xl font-extrabold">{p.number}</span>
              <span className="text-xs font-medium truncate w-full text-center">{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleStart}
        disabled={!opponentName || selectedPlayers.size === 0}
        className="w-full h-14 text-lg font-bold tap-feedback gap-2"
      >
        <Play className="w-5 h-5" /> Iniciar Partido
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
