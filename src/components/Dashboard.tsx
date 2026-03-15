import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Game, QuarterId, QUARTER_LABELS } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import logoPmb from '@/assets/logo-pmb.png';

const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const Dashboard: React.FC = () => {
  const { games, tournaments, removeGame } = useApp();
  const [filterTournamentId, setFilterTournamentId] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [filterQuarter, setFilterQuarter] = useState<QuarterId | 'ALL'>('ALL');
  const [filterPlayer, setFilterPlayer] = useState<string>('ALL');

  // Games filtered by tournament
  const tournamentGames = useMemo(() => {
    if (filterTournamentId === 'ALL') return games;
    return games.filter(g => g.tournamentId === filterTournamentId);
  }, [games, filterTournamentId]);

  // Aggregate or single game
  const isAggregate = selectedGameId === 'ALL';
  const selectedGame = !isAggregate ? tournamentGames.find(g => g.id === selectedGameId) : null;

  // All shots (aggregate or single)
  const allShots = useMemo(() => {
    if (isAggregate) return tournamentGames.flatMap(g => g.shots);
    return selectedGame?.shots || [];
  }, [isAggregate, tournamentGames, selectedGame]);

  // All opponent scores
  const allOpponentScores = useMemo(() => {
    if (isAggregate) return tournamentGames.flatMap(g => g.opponentScores || []);
    return selectedGame?.opponentScores || [];
  }, [isAggregate, tournamentGames, selectedGame]);

  // Roster (union for aggregate)
  const roster = useMemo(() => {
    if (!isAggregate && selectedGame) return selectedGame.roster;
    const map = new Map<string, typeof tournamentGames[0]['roster'][0]>();
    tournamentGames.forEach(g => g.roster.forEach(p => map.set(p.id, p)));
    return Array.from(map.values());
  }, [isAggregate, selectedGame, tournamentGames]);

  if (games.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <img src={logoPmb} alt="Puerto Montt Basket" className="w-24 h-24 opacity-30" />
        <p className="text-muted-foreground text-center">No hay partidos registrados aún</p>
      </div>
    );
  }

  const filteredShots = allShots.filter(s => {
    if (filterQuarter !== 'ALL' && s.quarterId !== filterQuarter) return false;
    if (filterPlayer !== 'ALL' && s.playerId !== filterPlayer) return false;
    return true;
  });

  const filteredOpponentScores = filterQuarter !== 'ALL'
    ? allOpponentScores.filter(s => s.quarterId === filterQuarter)
    : allOpponentScores;

  const activeQuarters = ALL_QUARTERS.filter(q => allShots.some(s => s.quarterId === q));

  // Points per quarter chart
  const chartData = activeQuarters.map(q => {
    const qShots = allShots.filter(s => s.quarterId === q);
    const points = qShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const opponentPts = allOpponentScores.filter(s => s.quarterId === q).reduce((sum, s) => sum + s.points, 0);
    const attempts = qShots.length;
    const made = qShots.filter(s => s.made).length;
    return {
      quarter: QUARTER_LABELS[q],
      points,
      rival: opponentPts,
      pct: attempts > 0 ? Math.round((made / attempts) * 100) : 0,
    };
  });

  // Box score
  const boxScore = roster.map(player => {
    const playerShots = filteredShots.filter(s => s.playerId === player.id);
    const fga = playerShots.length;
    const fgm = playerShots.filter(s => s.made).length;
    const pts = playerShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const threeA = playerShots.filter(s => s.points === 3).length;
    const threeM = playerShots.filter(s => s.points === 3 && s.made).length;
    const ftA = playerShots.filter(s => s.points === 1).length;
    const ftM = playerShots.filter(s => s.points === 1 && s.made).length;
    return { player, pts, fga, fgm, threeA, threeM, ftA, ftM, pct: fga > 0 ? Math.round((fgm / fga) * 100) : 0 };
  }).sort((a, b) => b.pts - a.pts);

  const totalPoints = filteredShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const totalOpponent = filteredOpponentScores.reduce((sum, s) => sum + s.points, 0);

  const tournamentLabel = filterTournamentId === 'ALL'
    ? 'Todos los torneos'
    : tournaments.find(t => t.id === filterTournamentId)?.name || '';

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header with logo */}
      <div className="flex items-center gap-3">
        <img src={logoPmb} alt="Puerto Montt Basket" className="w-10 h-10" />
        <h2 className="text-lg font-extrabold text-foreground">Estadísticas</h2>
      </div>

      {/* Tournament filter */}
      <select
        value={filterTournamentId}
        onChange={e => {
          setFilterTournamentId(e.target.value);
          setSelectedGameId('ALL');
          setFilterPlayer('ALL');
        }}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
      >
        <option value="ALL">Todos los torneos</option>
        {tournaments.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {/* Game filter */}
      <select
        value={selectedGameId}
        onChange={e => {
          setSelectedGameId(e.target.value);
          setFilterPlayer('ALL');
        }}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
      >
        <option value="ALL">
          {tournamentGames.length > 0 ? `Todos los partidos (${tournamentGames.length})` : 'Sin partidos'}
        </option>
        {tournamentGames.map(g => (
          <option key={g.id} value={g.id}>
            vs {g.opponentName} — {new Date(g.date).toLocaleDateString()}
          </option>
        ))}
      </select>

      {/* Quarter filters */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilterQuarter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 tap-feedback ${
            filterQuarter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
          }`}
        >
          Todos
        </button>
        {activeQuarters.map(q => (
          <button
            key={q}
            onClick={() => setFilterQuarter(q)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 tap-feedback ${
              filterQuarter === q ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
            }`}
          >
            {QUARTER_LABELS[q]}
          </button>
        ))}
      </div>

      {/* Score summary */}
      <div className="bg-primary rounded-xl p-4 flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">PMB</p>
          <p className="text-4xl font-black text-primary-foreground">{totalPoints}</p>
        </div>
        <div className="text-center px-3">
          <p className="text-xs text-primary-foreground/50 font-bold">VS</p>
          <p className="text-[10px] text-primary-foreground/50 mt-0.5">
            {filteredShots.length > 0 ? Math.round((filteredShots.filter(s => s.made).length / filteredShots.length) * 100) : 0}% TC
          </p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">Rival</p>
          <p className="text-4xl font-black text-primary-foreground/80">{totalOpponent}</p>
        </div>
      </div>

      {/* Points per Quarter chart */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-xl p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Puntos por Cuarto</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="navyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 60%, 22%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(220, 60%, 22%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="rivalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 25%, 88%)" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                formatter={(val: number, name: string) => [`${val} pts`, name === 'points' ? 'PMB' : 'Rival']}
              />
              <Area type="monotone" dataKey="points" stroke="hsl(220, 60%, 22%)" fill="url(#navyGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="rival" stroke="hsl(0, 75%, 55%)" fill="url(#rivalGrad)" strokeWidth={2} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Shot Chart */}
      <div className="bg-card rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shot Chart</p>
          <select
            value={filterPlayer}
            onChange={e => setFilterPlayer(e.target.value)}
            className="h-7 rounded border border-input bg-background px-2 text-xs font-semibold"
          >
            <option value="ALL">Todas</option>
            {roster.map(p => (
              <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
            ))}
          </select>
        </div>
        <CourtDiagram
          onZoneTap={() => {}}
          shots={filteredShots
            .filter(s => filterPlayer === 'ALL' || s.playerId === filterPlayer)
            .map(s => ({ x: s.x, y: s.y, made: s.made, points: s.points }))}
        />
      </div>

      {/* Box Score */}
      <div className="bg-card rounded-xl p-3 overflow-x-auto">
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
          Box Score {isAggregate && tournamentGames.length > 1 ? `(${tournamentGames.length} partidos)` : ''}
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-2 font-bold sticky left-0 bg-card">#</th>
              <th className="text-left py-2 pr-2 font-bold sticky left-8 bg-card">Jugadora</th>
              <th className="text-center py-2 px-1 font-bold">PTS</th>
              <th className="text-center py-2 px-1 font-bold">TC</th>
              <th className="text-center py-2 px-1 font-bold">%</th>
              <th className="text-center py-2 px-1 font-bold">3PT</th>
              <th className="text-center py-2 px-1 font-bold">TL</th>
            </tr>
          </thead>
          <tbody>
            {boxScore.map(row => (
              <tr key={row.player.id} className="border-b border-border/50">
                <td className="py-2 pr-2 font-extrabold text-primary sticky left-0 bg-card">{row.player.number}</td>
                <td className="py-2 pr-2 font-semibold sticky left-8 bg-card truncate max-w-[80px]">{row.player.name}</td>
                <td className="text-center py-2 px-1 font-extrabold">{row.pts}</td>
                <td className="text-center py-2 px-1">{row.fgm}/{row.fga}</td>
                <td className="text-center py-2 px-1">
                  <span className={row.pct >= 50 ? 'text-success font-bold' : row.pct < 30 && row.fga > 0 ? 'text-destructive font-bold' : ''}>
                    {row.pct}%
                  </span>
                </td>
                <td className="text-center py-2 px-1">{row.threeM}/{row.threeA}</td>
                <td className="text-center py-2 px-1">{row.ftM}/{row.ftA}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
