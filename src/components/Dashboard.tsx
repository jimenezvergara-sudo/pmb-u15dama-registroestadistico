import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Game, QuarterId, QUARTER_LABELS, ShotEvent } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const Dashboard: React.FC = () => {
  const { games } = useApp();
  const [selectedGameId, setSelectedGameId] = useState<string>(games[games.length - 1]?.id || '');
  const [filterQuarter, setFilterQuarter] = useState<QuarterId | 'ALL'>('ALL');
  const [filterPlayer, setFilterPlayer] = useState<string>('ALL');

  const game = games.find(g => g.id === selectedGameId);

  if (games.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-muted-foreground text-center">No hay partidos registrados aún</p>
      </div>
    );
  }

  if (!game) return null;

  const filteredShots = game.shots.filter(s => {
    if (filterQuarter !== 'ALL' && s.quarterId !== filterQuarter) return false;
    if (filterPlayer !== 'ALL' && s.playerId !== filterPlayer) return false;
    return true;
  });

  // Quarters that have data
  const activeQuarters = ALL_QUARTERS.filter(q => game.shots.some(s => s.quarterId === q));

  // Points per quarter chart data
  const chartData = activeQuarters.map(q => {
    const qShots = game.shots.filter(s => s.quarterId === q);
    const points = qShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const attempts = qShots.length;
    const made = qShots.filter(s => s.made).length;
    return {
      quarter: QUARTER_LABELS[q],
      points,
      pct: attempts > 0 ? Math.round((made / attempts) * 100) : 0,
    };
  });

  // Box score
  const boxScore = game.roster.map(player => {
    const playerShots = game.shots.filter(s => s.playerId === player.id);
    const filtered = filterQuarter !== 'ALL'
      ? playerShots.filter(s => s.quarterId === filterQuarter)
      : playerShots;
    const fga = filtered.length;
    const fgm = filtered.filter(s => s.made).length;
    const pts = filtered.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const threeA = filtered.filter(s => s.points === 3).length;
    const threeM = filtered.filter(s => s.points === 3 && s.made).length;
    const ftA = filtered.filter(s => s.points === 1).length;
    const ftM = filtered.filter(s => s.points === 1 && s.made).length;
    return { player, pts, fga, fgm, threeA, threeM, ftA, ftM, pct: fga > 0 ? Math.round((fgm / fga) * 100) : 0 };
  }).sort((a, b) => b.pts - a.pts);

  const totalPoints = filteredShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Game selector */}
      <select
        value={selectedGameId}
        onChange={e => setSelectedGameId(e.target.value)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
      >
        {games.map(g => (
          <option key={g.id} value={g.id}>
            vs {g.opponentName} — {new Date(g.date).toLocaleDateString()}
          </option>
        ))}
      </select>

      {/* Filters */}
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
      <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-secondary-foreground/70 uppercase tracking-wider font-medium">vs {game.opponentName}</p>
          <p className="text-4xl font-extrabold text-primary">{totalPoints}</p>
        </div>
        <div className="text-right text-secondary-foreground">
          <p className="text-sm font-semibold">{filteredShots.filter(s => s.made).length}/{filteredShots.length} TC</p>
          <p className="text-xs text-secondary-foreground/70">
            {filteredShots.length > 0 ? Math.round((filteredShots.filter(s => s.made).length / filteredShots.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Points per Quarter chart */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-xl p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Puntos por Cuarto</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}
                formatter={(val: number) => [`${val} pts`, 'Puntos']}
              />
              <Area type="monotone" dataKey="points" stroke="hsl(24, 100%, 50%)" fill="url(#orangeGrad)" strokeWidth={2.5} />
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
            {game.roster.map(p => (
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
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Box Score</p>
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
