import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Game, QuarterId, QUARTER_LABELS } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Trash2, Target, CircleDot, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import logoBasqest from '@/assets/logo-basqest.png';

const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const Dashboard: React.FC = () => {
  const { games, tournaments, removeGame, teams } = useApp();
  const [filterTournamentId, setFilterTournamentId] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [filterQuarter, setFilterQuarter] = useState<QuarterId | 'ALL'>('ALL');
  const [filterPlayer, setFilterPlayer] = useState<string>('ALL');
  const [filterTeamId, setFilterTeamId] = useState<string>('ALL');

  const tournamentGames = useMemo(() => {
    let filtered = games;
    if (filterTournamentId !== 'ALL') filtered = filtered.filter(g => g.tournamentId === filterTournamentId);
    if (filterTeamId !== 'ALL') filtered = filtered.filter(g => g.opponentTeamId === filterTeamId);
    return filtered;
  }, [games, filterTournamentId, filterTeamId]);

  const isAggregate = selectedGameId === 'ALL';
  const selectedGame = !isAggregate ? tournamentGames.find(g => g.id === selectedGameId) : null;

  const allShots = useMemo(() => {
    if (isAggregate) return tournamentGames.flatMap(g => g.shots);
    return selectedGame?.shots || [];
  }, [isAggregate, tournamentGames, selectedGame]);

  const allOpponentScores = useMemo(() => {
    if (isAggregate) return tournamentGames.flatMap(g => g.opponentScores || []);
    return selectedGame?.opponentScores || [];
  }, [isAggregate, tournamentGames, selectedGame]);

  const roster = useMemo(() => {
    if (!isAggregate && selectedGame) return selectedGame.roster;
    const map = new Map<string, typeof tournamentGames[0]['roster'][0]>();
    tournamentGames.forEach(g => g.roster.forEach(p => map.set(p.id, p)));
    return Array.from(map.values());
  }, [isAggregate, selectedGame, tournamentGames]);

  if (games.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <img src={logoBasqest} alt="BASQEST+" className="w-24 h-24 opacity-30" />
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

  const boxScore = roster.map(player => {
    const playerShots = filteredShots.filter(s => s.playerId === player.id);
    const fieldShots = playerShots.filter(s => s.points >= 2);
    const fga = fieldShots.length;
    const fgm = fieldShots.filter(s => s.made).length;
    const pts = playerShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const twoA = playerShots.filter(s => s.points === 2).length;
    const twoM = playerShots.filter(s => s.points === 2 && s.made).length;
    const threeA = playerShots.filter(s => s.points === 3).length;
    const threeM = playerShots.filter(s => s.points === 3 && s.made).length;
    const ftA = playerShots.filter(s => s.points === 1).length;
    const ftM = playerShots.filter(s => s.points === 1 && s.made).length;
    return {
      player, pts, fga, fgm, twoA, twoM, threeA, threeM, ftA, ftM,
      fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
      twoPct: twoA > 0 ? Math.round((twoM / twoA) * 100) : 0,
      threePct: threeA > 0 ? Math.round((threeM / threeA) * 100) : 0,
      ftPct: ftA > 0 ? Math.round((ftM / ftA) * 100) : 0,
    };
  }).sort((a, b) => b.pts - a.pts);

  const totalPoints = filteredShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const totalOpponent = filteredOpponentScores.reduce((sum, s) => sum + s.points, 0);

  const numGames = tournamentGames.length;
  const ppg = numGames > 0 ? (totalPoints / numGames).toFixed(1) : '0';
  const oppPpg = numGames > 0 ? (totalOpponent / numGames).toFixed(1) : '0';

  const efficiencyLeaders = (() => {
    const withTriples = boxScore.filter(r => r.threeA > 0).sort((a, b) => b.threePct - a.threePct || b.threeM - a.threeM);
    const withDoubles = boxScore.filter(r => r.twoA > 0).sort((a, b) => b.twoPct - a.twoPct || b.twoM - a.twoM);
    const withFt = boxScore.filter(r => r.ftA > 0).sort((a, b) => b.ftPct - a.ftPct || b.ftM - a.ftM);
    return {
      triples: withTriples[0] || null,
      dobles: withDoubles[0] || null,
      tl: withFt[0] || null,
    };
  })();

  const rivalGames = filterTeamId === 'ALL' ? [] : games.filter(g => g.opponentTeamId === filterTeamId);

  const opponentTeamIds = (() => {
    const ids = new Set<string>();
    games.forEach(g => { if (g.opponentTeamId) ids.add(g.opponentTeamId); });
    return Array.from(ids);
  })();

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={logoBasqest} alt="BASQEST+" className="w-10 h-10" />
        <h2 className="text-lg font-extrabold text-foreground">Estadísticas</h2>
      </div>

      {/* Filters */}
      <select
        value={filterTournamentId}
        onChange={e => { setFilterTournamentId(e.target.value); setSelectedGameId('ALL'); setFilterPlayer('ALL'); }}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
      >
        <option value="ALL">Todos los torneos</option>
        {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {opponentTeamIds.length > 0 && (
        <select
          value={filterTeamId}
          onChange={e => { setFilterTeamId(e.target.value); setSelectedGameId('ALL'); }}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
        >
          <option value="ALL">Todos los rivales</option>
          {opponentTeamIds.map(id => {
            const team = teams.find(t => t.id === id);
            const name = team?.clubName || games.find(g => g.opponentTeamId === id)?.opponentName || id;
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>
      )}

      <div className="flex gap-2">
        <select
          value={selectedGameId}
          onChange={e => { setSelectedGameId(e.target.value); setFilterPlayer('ALL'); }}
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
        >
          <option value="ALL">
            {tournamentGames.length > 0 ? `Todos los partidos (${tournamentGames.length})` : 'Sin partidos'}
          </option>
          {tournamentGames.map(g => {
            const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
            const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
            const legLabel = g.leg ? ` (${g.leg === 'ida' ? 'Ida' : 'Vuelta'})` : '';
            return (
              <option key={g.id} value={g.id}>
                vs {g.opponentName}{legLabel} ({teamPts}-{oppPts}) — {new Date(g.date).toLocaleDateString()}
              </option>
            );
          })}
        </select>
        {selectedGameId !== 'ALL' && (
          <Button variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={() => {
            if (confirm('¿Eliminar este partido? Se borrará de todas las estadísticas.')) {
              removeGame(selectedGameId); setSelectedGameId('ALL');
              toast('Partido eliminado', { duration: 2000 });
            }
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Quarter filters */}
      <div className="flex gap-2 overflow-x-auto">
        <button onClick={() => setFilterQuarter('ALL')} className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 tap-feedback ${filterQuarter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>Todos</button>
        {activeQuarters.map(q => (
          <button key={q} onClick={() => setFilterQuarter(q)} className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 tap-feedback ${filterQuarter === q ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>{QUARTER_LABELS[q]}</button>
        ))}
      </div>

      {/* Score summary */}
      <div className="bg-primary rounded-xl p-4 flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">BASQEST+</p>
          <p className="text-4xl font-black text-primary-foreground">{isAggregate ? ppg : totalPoints}</p>
          {isAggregate && <p className="text-[9px] text-primary-foreground/50 font-bold">PPG</p>}
        </div>
        <div className="text-center px-3">
          <p className="text-xs text-primary-foreground/50 font-bold">VS</p>
          <p className="text-[10px] text-primary-foreground/50 mt-0.5">
            {filteredShots.length > 0 ? Math.round((filteredShots.filter(s => s.made).length / filteredShots.length) * 100) : 0}% TC
          </p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">Rival</p>
          <p className="text-4xl font-black text-primary-foreground/80">{isAggregate ? oppPpg : totalOpponent}</p>
          {isAggregate && <p className="text-[9px] text-primary-foreground/50 font-bold">PPG</p>}
        </div>
      </div>

      {/* Rival comparison */}
      {filterTeamId !== 'ALL' && rivalGames.length >= 2 && (
        <div className="bg-card rounded-xl p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Comparativa vs {teams.find(t => t.id === filterTeamId)?.clubName}</p>
          <div className="grid grid-cols-2 gap-2">
            {rivalGames.map((g, i) => {
              const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
              const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
              const won = teamPts > oppPts;
              return (
                <div key={g.id} className={`rounded-lg p-3 border-2 ${won ? 'border-success/50 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{g.leg === 'ida' ? 'Ida' : g.leg === 'vuelta' ? 'Vuelta' : `Partido ${i + 1}`}</p>
                  <p className="text-2xl font-black text-foreground">{teamPts}-{oppPts}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(g.date).toLocaleDateString()}</p>
                  <p className={`text-xs font-bold mt-1 ${won ? 'text-success' : 'text-destructive'}`}>{won ? 'Victoria' : 'Derrota'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points per Quarter chart */}
      {chartData.length > 1 && (
        <div className="bg-card rounded-xl p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Puntos por Cuarto</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(268, 76%, 52%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(268, 76%, 52%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="rivalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 86%)" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }} formatter={(val: number, name: string) => [`${val} pts`, name === 'points' ? 'BASQEST+' : 'Rival']} />
              <Area type="monotone" dataKey="points" stroke="hsl(268, 76%, 52%)" fill="url(#primaryGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="rival" stroke="hsl(0, 75%, 55%)" fill="url(#rivalGrad)" strokeWidth={2} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Shot Chart */}
      <div className="bg-card rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shot Chart</p>
          <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs font-semibold">
            <option value="ALL">Todas</option>
            {roster.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
          </select>
        </div>
        <CourtDiagram onZoneTap={() => {}} shots={filteredShots.filter(s => filterPlayer === 'ALL' || s.playerId === filterPlayer).map(s => ({ x: s.x, y: s.y, made: s.made, points: s.points }))} rotation={0} onRotate={() => {}} />
      </div>

      {/* Efficiency Leaders */}
      <div className="bg-card rounded-xl p-3">
        <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Líderes de Eficiencia</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Triples', icon: <Target className="w-4 h-4" />, data: efficiencyLeaders.triples, pct: efficiencyLeaders.triples?.threePct, made: efficiencyLeaders.triples ? `${efficiencyLeaders.triples.threeM}/${efficiencyLeaders.triples.threeA}` : '-' },
            { label: 'Dobles', icon: <CircleDot className="w-4 h-4" />, data: efficiencyLeaders.dobles, pct: efficiencyLeaders.dobles?.twoPct, made: efficiencyLeaders.dobles ? `${efficiencyLeaders.dobles.twoM}/${efficiencyLeaders.dobles.twoA}` : '-' },
            { label: 'Tiros Libres', icon: <Crosshair className="w-4 h-4" />, data: efficiencyLeaders.tl, pct: efficiencyLeaders.tl?.ftPct, made: efficiencyLeaders.tl ? `${efficiencyLeaders.tl.ftM}/${efficiencyLeaders.tl.ftA}` : '-' },
          ].map(item => (
            <Card key={item.label} className="border-border/40 bg-background">
              <CardContent className="p-3 text-center">
                <div className="flex justify-center mb-1.5 text-primary">{item.icon}</div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                {item.data ? (
                  <>
                    <p className="text-xs font-bold text-foreground mt-1 truncate">#{item.data.player.number} {item.data.player.name.split(' ')[0]}</p>
                    <p className="text-lg font-black text-primary leading-tight">{item.pct}%</p>
                    <p className="text-[10px] text-muted-foreground">{item.made}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-2">—</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
              <th className="text-center py-2 px-1 font-bold">Dobles</th>
              <th className="text-center py-2 px-1 font-bold">Triples</th>
              <th className="text-center py-2 px-1 font-bold">TL</th>
            </tr>
          </thead>
          <tbody>
            {boxScore.map(row => (
              <tr key={row.player.id} className="border-b border-border/50">
                <td className="py-2 pr-2 font-extrabold text-primary sticky left-0 bg-card">{row.player.number}</td>
                <td className="py-2 pr-2 font-semibold sticky left-8 bg-card truncate max-w-[80px]">{row.player.name}</td>
                <td className="text-center py-2 px-1 font-extrabold">{row.pts}</td>
                <td className="text-center py-2 px-1">
                  <div>{row.fgm}/{row.fga}</div>
                  <div className={`text-[9px] ${row.fgPct >= 50 ? 'text-success font-bold' : row.fgPct < 30 && row.fga > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.fgPct}%</div>
                </td>
                <td className="text-center py-2 px-1">
                  <div>{row.twoM}/{row.twoA}</div>
                  <div className={`text-[9px] ${row.twoPct >= 50 ? 'text-success font-bold' : row.twoA > 0 && row.twoPct < 30 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.twoPct}%</div>
                </td>
                <td className="text-center py-2 px-1">
                  <div>{row.threeM}/{row.threeA}</div>
                  <div className={`text-[9px] ${row.threePct >= 40 ? 'text-success font-bold' : row.threeA > 0 && row.threePct < 25 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.threePct}%</div>
                </td>
                <td className="text-center py-2 px-1">
                  <div>{row.ftM}/{row.ftA}</div>
                  <div className={`text-[9px] ${row.ftPct >= 75 ? 'text-success font-bold' : row.ftA > 0 && row.ftPct < 50 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.ftPct}%</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
