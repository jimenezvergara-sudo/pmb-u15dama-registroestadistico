import React, { useState, useMemo, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useApp } from '@/context/AppContext';
import { Game, QuarterId, QUARTER_LABELS } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Trash2, Target, CircleDot, Crosshair, FileDown, Pencil, HelpCircle, Grab, Handshake, ShieldCheck } from 'lucide-react';
import AiAnalysis from '@/components/AiAnalysis';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import logoBasqest from '@/assets/logo-basqest-full.webp';
import { generatePdfReport } from '@/utils/generatePdfReport';
import GameEventEditor from '@/components/GameEventEditor';
import AdBannerCarousel from '@/components/AdBannerCarousel';
import { supabase } from '@/integrations/supabase/client';

const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const Dashboard: React.FC = () => {
  const { games, tournaments, removeGame, updateGame, teams, activeCategory, myTeamName, myTeamLogo, players } = useApp();
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [filterTournamentId, setFilterTournamentId] = useState<string>('ALL');
  const [selectedGameId, setSelectedGameId] = useState<string>('ALL');
  const [filterQuarter, setFilterQuarter] = useState<QuarterId | 'ALL'>('ALL');
  const [filterPlayer, setFilterPlayer] = useState<string>('ALL');
  const [filterTeamId, setFilterTeamId] = useState<string>('ALL');
  const [premiumBanner, setPremiumBanner] = useState<{ url: string; link: string } | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    supabase
      .from('global_ads')
      .select('image_url, destination_link')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPremiumBanner({ url: data[0].image_url, link: data[0].destination_link });
        }
      });
  }, []);

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
    // Deduplicate by player id, keeping the latest version
    const map = new Map<string, typeof tournamentGames[0]['roster'][0]>();
    tournamentGames.forEach(g => g.roster.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, p);
    }));
    // Also deduplicate players that share the same name (merged but old ID remains in some games)
    const byName = new Map<string, typeof tournamentGames[0]['roster'][0]>();
    map.forEach(p => {
      const existing = byName.get(p.name);
      if (!existing) {
        byName.set(p.name, p);
      }
      // Keep the one that exists in the current players list
    });
    return Array.from(map.values());
  }, [isAggregate, selectedGame, tournamentGames]);

  const allActions = useMemo(() => {
    if (isAggregate) return tournamentGames.flatMap(g => g.actions || []);
    return selectedGame?.actions || [];
  }, [isAggregate, tournamentGames, selectedGame]);

  if (games.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full gap-4">
        <img src={logoBasqest} alt="BASQUEST+" className="w-24 h-24 opacity-30" />
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

    const playerActions = allActions.filter(a => a.playerId === player.id);
    const oReb = playerActions.filter(a => a.type === 'offensive_rebound').length;
    const dReb = playerActions.filter(a => a.type === 'defensive_rebound' || a.type === 'rebound').length;
    const reb = oReb + dReb;
    const ast = playerActions.filter(a => a.type === 'assist').length;
    const stl = playerActions.filter(a => a.type === 'steal').length;
    const pf = playerActions.filter(a => a.type === 'foul').length;

    // Calculate court time percentage
    let courtTimePct = 0;
    if (!isAggregate && selectedGame) {
      const totalGameTime = Object.values(selectedGame.courtTimeMs || {}).reduce((max, t) => Math.max(max, t), 0);
      const playerTime = (selectedGame.courtTimeMs || {})[player.id] || 0;
      if (totalGameTime > 0) {
        courtTimePct = Math.round((playerTime / totalGameTime) * 100);
      }
    } else if (isAggregate) {
      // Average across games
      let totalPct = 0;
      let gamesWithData = 0;
      tournamentGames.forEach(g => {
        const ct = g.courtTimeMs || {};
        const maxTime = Object.values(ct).reduce((max: number, t: unknown) => Math.max(max, t as number), 0);
        if (maxTime > 0 && ct[player.id] !== undefined) {
          totalPct += ((ct[player.id] || 0) / maxTime) * 100;
          gamesWithData++;
        }
      });
      courtTimePct = gamesWithData > 0 ? Math.round(totalPct / gamesWithData) : 0;
    }

    const eFG = fga > 0 ? Math.round(((twoM + 0.5 * threeM) / fga) * 100) : 0;
    const tsDenom = 2 * (fga + 0.44 * ftA);
    const ts = tsDenom > 0 ? Math.round((pts / tsDenom) * 100) : 0;

    return {
      player, pts, fga, fgm, twoA, twoM, threeA, threeM, ftA, ftM,
      reb, oReb, dReb, ast, stl, pf, courtTimePct,
      fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
      twoPct: twoA > 0 ? Math.round((twoM / twoA) * 100) : 0,
      threePct: threeA > 0 ? Math.round((threeM / threeA) * 100) : 0,
      ftPct: ftA > 0 ? Math.round((ftM / ftA) * 100) : 0,
      eFG, ts,
    };
  }).sort((a, b) => {
    const key = sortKey ?? 'pts';
    if (key === 'name') {
      const cmp = a.player.name.localeCompare(b.player.name, 'es', { sensitivity: 'base' });
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return b.pts - a.pts;
    }
    const av = (a as any)[key] ?? 0;
    const bv = (b as any)[key] ?? 0;
    if (bv !== av) return sortDir === 'asc' ? av - bv : bv - av;
    return b.pts - a.pts;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (key === 'name') {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(null);
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const totalPoints = filteredShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const totalOpponent = filteredOpponentScores.reduce((sum, s) => sum + s.points, 0);

  const numGames = tournamentGames.length;
  const ppg = numGames > 0 ? (totalPoints / numGames).toFixed(1) : '0';
  const oppPpg = numGames > 0 ? (totalOpponent / numGames).toFixed(1) : '0';

  // Mínimos estadísticamente significativos para líderes de eficiencia
  const MIN_TRIPLES = 5;
  const MIN_DOBLES = 8;
  const MIN_FT = 4;
  const MIN_FGA = 10;

  const efficiencyLeaders = (() => {
    const withTriples = boxScore.filter(r => r.threeA >= MIN_TRIPLES).sort((a, b) => b.threePct - a.threePct || b.threeM - a.threeM);
    const withDoubles = boxScore.filter(r => r.twoA >= MIN_DOBLES).sort((a, b) => b.twoPct - a.twoPct || b.twoM - a.twoM);
    const withFt = boxScore.filter(r => r.ftA >= MIN_FT).sort((a, b) => b.ftPct - a.ftPct || b.ftM - a.ftM);
    const withReb = boxScore.filter(r => r.reb > 0).sort((a, b) => b.reb - a.reb);
    const withAst = boxScore.filter(r => r.ast > 0).sort((a, b) => b.ast - a.ast);
    const withStl = boxScore.filter(r => r.stl > 0).sort((a, b) => b.stl - a.stl);
    return {
      triples: withTriples[0] || null,
      dobles: withDoubles[0] || null,
      tl: withFt[0] || null,
      reb: withReb[0] || null,
      ast: withAst[0] || null,
      stl: withStl[0] || null,
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
      {/* Ad Banner */}
      <AdBannerCarousel />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoBasqest} alt="BASQUEST+" className="w-10 h-10" />
          <h2 className="text-lg font-extrabold text-foreground">Estadísticas</h2>
        </div>
        <div className="flex items-center gap-2">
          <AiAnalysis
            boxScore={boxScore.map(r => ({
              playerName: r.player.name,
              number: r.player.number,
              pts: r.pts,
              fgm: r.fgm,
              fga: r.fga,
              fgPct: r.fgPct,
              twoM: r.twoM,
              twoA: r.twoA,
              twoPct: r.twoPct,
              threeM: r.threeM,
              threeA: r.threeA,
              threePct: r.threePct,
              ftM: r.ftM,
              ftA: r.ftA,
              ftPct: r.ftPct,
              reb: r.reb,
              oReb: r.oReb,
              dReb: r.dReb,
              ast: r.ast,
              stl: r.stl,
              pf: r.pf,
              courtTimePct: r.courtTimePct,
            }))}
            chartData={chartData}
            totalPoints={totalPoints}
            totalOpponent={totalOpponent}
            numGames={numGames}
            gameLabel={selectedGameId === 'ALL' ? `Todos los partidos (${tournamentGames.length})` : `vs ${selectedGame?.opponentName || ''}`}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold"
            onClick={() => {
              const filterLabel = filterTournamentId === 'ALL'
                ? 'Todos los torneos'
                : tournaments.find(t => t.id === filterTournamentId)?.name || '';
              const gameLabel = selectedGameId === 'ALL'
                ? `Todos los partidos (${tournamentGames.length})`
                : `vs ${selectedGame?.opponentName || ''}`;
              const pdfGames = selectedGameId !== 'ALL' && selectedGame ? [selectedGame] : tournamentGames;
              generatePdfReport(games, pdfGames, players, {
                teamName: myTeamName,
                teamLogo: myTeamLogo,
                appLogo: logoBasqest,
                category: activeCategory,
                filterLabel,
                gameLabel,
                quarterFilter: filterQuarter,
                playerFilter: filterPlayer,
                premiumBannerUrl: premiumBanner?.url,
                premiumBannerLink: premiumBanner?.link,
              });
              toast.success('PDF descargado');
            }}
          >
            <FileDown className="w-4 h-4" />
            PDF
          </Button>
        </div>
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
            const homeLabel = g.isHome === true ? ' (L)' : g.isHome === false ? ' (V)' : '';
            return (
              <option key={g.id} value={g.id}>
                vs {g.opponentName}{homeLabel}{legLabel} ({teamPts}-{oppPts}) — {new Date(g.date).toLocaleDateString()}
              </option>
            );
          })}
        </select>
        {selectedGameId !== 'ALL' && selectedGame && (
          <>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setEditingGame(selectedGame)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon" className="h-10 w-10 shrink-0" onClick={() => {
              if (confirm('¿Eliminar este partido? Se borrará de todas las estadísticas.')) {
                removeGame(selectedGameId); setSelectedGameId('ALL');
                toast('Partido eliminado', { duration: 2000 });
              }
            }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
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
          <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">BASQUEST+</p>
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
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }} formatter={(val: number, name: string) => [`${val} pts`, name === 'points' ? 'BASQUEST+' : 'Rival']} />
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
          {([
            { kind: 'pct' as const, label: 'Triples', icon: <Target className="w-4 h-4" />, data: efficiencyLeaders.triples, pct: efficiencyLeaders.triples?.threePct ?? 0, made: efficiencyLeaders.triples ? `${efficiencyLeaders.triples.threeM}/${efficiencyLeaders.triples.threeA}` : '-', volume: efficiencyLeaders.triples?.threeA ?? 0, min: MIN_TRIPLES },
            { kind: 'pct' as const, label: 'Dobles', icon: <CircleDot className="w-4 h-4" />, data: efficiencyLeaders.dobles, pct: efficiencyLeaders.dobles?.twoPct ?? 0, made: efficiencyLeaders.dobles ? `${efficiencyLeaders.dobles.twoM}/${efficiencyLeaders.dobles.twoA}` : '-', volume: efficiencyLeaders.dobles?.twoA ?? 0, min: MIN_DOBLES },
            { kind: 'pct' as const, label: 'Tiros Libres', icon: <Crosshair className="w-4 h-4" />, data: efficiencyLeaders.tl, pct: efficiencyLeaders.tl?.ftPct ?? 0, made: efficiencyLeaders.tl ? `${efficiencyLeaders.tl.ftM}/${efficiencyLeaders.tl.ftA}` : '-', volume: efficiencyLeaders.tl?.ftA ?? 0, min: MIN_FT },
            { kind: 'count' as const, label: 'Rebotes', icon: <Grab className="w-4 h-4" />, data: efficiencyLeaders.reb, count: efficiencyLeaders.reb?.reb ?? 0 },
            { kind: 'count' as const, label: 'Asistencias', icon: <Handshake className="w-4 h-4" />, data: efficiencyLeaders.ast, count: efficiencyLeaders.ast?.ast ?? 0 },
            { kind: 'count' as const, label: 'Robos', icon: <ShieldCheck className="w-4 h-4" />, data: efficiencyLeaders.stl, count: efficiencyLeaders.stl?.stl ?? 0 },
          ]).map(item => {
            const lowSample = item.kind === 'pct' && item.data && item.volume < item.min * 1.5;
            const perGame = item.kind === 'count' && item.data && numGames > 0 ? (item.count / numGames).toFixed(1) : null;
            return (
              <Card key={item.label} className="border-border/40 bg-background">
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1.5 text-primary">{item.icon}</div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  {item.data ? (
                    <>
                      <p className="text-xs font-bold text-foreground mt-1 truncate">{!isAggregate ? `#${item.data.player.number} ` : ''}{item.data.player.name.split(' ')[0]}</p>
                      {item.kind === 'pct' ? (
                        <>
                          <p className="text-lg font-black text-primary leading-tight">{item.pct}%</p>
                          <p className="text-[10px] text-muted-foreground">({item.made})</p>
                          {lowSample && (
                            <p className="mt-1 inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/40">⚠️ Muestra pequeña ({item.volume})</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-black text-primary leading-tight">{item.count}</p>
                          {perGame && <p className="text-[10px] text-muted-foreground">{perGame}/partido</p>}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic mt-2 leading-tight">{item.kind === 'pct' ? `Sin datos suficientes — se requieren más partidos (mín. ${item.min} intentos)` : 'Sin datos suficientes — se requieren más partidos'}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Box Score */}
      <div className="bg-card rounded-xl p-3">
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
          Box Score {isAggregate && tournamentGames.length > 1 ? `(${tournamentGames.length} partidos)` : ''}
        </p>
        <div className="overflow-x-auto -mx-3 px-3">
          <table className="text-xs w-full min-w-[520px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th
                  onClick={() => handleSort('name')}
                  className={`text-left py-2 pr-1 font-bold sticky left-0 bg-card z-10 min-w-[80px] cursor-pointer select-none transition-colors hover:text-primary ${sortKey === 'name' ? 'text-primary' : ''}`}
                  title={sortKey === 'name' ? 'Cambiar dirección de orden' : 'Ordenar alfabéticamente'}
                >
                  Jug.{sortKey === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                </th>
                {[
                  { label: 'TC', key: 'fgm' },
                  { label: '2PT', key: 'twoM' },
                  { label: '3PT', key: 'threeM' },
                  { label: 'TL', key: 'ftM' },
                  { label: 'PTS', key: 'pts' },
                  { label: 'RO', key: 'oReb' },
                  { label: 'RD', key: 'dReb' },
                  { label: 'REB', key: 'reb' },
                  { label: 'AST', key: 'ast' },
                  { label: 'STL', key: 'stl' },
                  { label: 'PF', key: 'pf' },
                  { label: 'eFG%', key: 'eFG' },
                  { label: 'TS%', key: 'ts' },
                  { label: 'MIN%', key: 'courtTimePct' },
                ].map(col => {
                  const active = (sortKey ?? 'pts') === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-center py-2 px-0.5 font-bold cursor-pointer select-none transition-colors hover:text-primary ${active ? 'text-primary' : ''}`}
                      title={active ? 'Click para volver al orden por PTS' : `Ordenar por ${col.label}`}
                    >
                      {col.label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {boxScore.map(row => (
                <tr key={row.player.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-1 font-semibold sticky left-0 bg-card z-10 min-w-[80px]">
                    <span className="block text-[10px] leading-tight max-w-[70px] break-words">
                      {!isAggregate ? `#${row.player.number} ${row.player.name}` : row.player.name}
                    </span>
                  </td>
                  <td className="text-center py-2 px-0.5">
                    <div className="text-[10px]">{row.fgm}/{row.fga}</div>
                    <div className={`text-[9px] ${row.fgPct >= 50 ? 'text-success font-bold' : row.fgPct < 30 && row.fga > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.fgPct}%</div>
                  </td>
                  <td className="text-center py-2 px-0.5">
                    <div className="text-[10px]">{row.twoM}/{row.twoA}</div>
                    <div className={`text-[9px] ${row.twoPct >= 50 ? 'text-success font-bold' : row.twoA > 0 && row.twoPct < 30 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.twoPct}%</div>
                  </td>
                  <td className="text-center py-2 px-0.5">
                    <div className="text-[10px]">{row.threeM}/{row.threeA}</div>
                    <div className={`text-[9px] ${row.threePct >= 40 ? 'text-success font-bold' : row.threeA > 0 && row.threePct < 25 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.threePct}%</div>
                  </td>
                  <td className="text-center py-2 px-0.5">
                    <div className="text-[10px]">{row.ftM}/{row.ftA}</div>
                    <div className={`text-[9px] ${row.ftPct >= 75 ? 'text-success font-bold' : row.ftA > 0 && row.ftPct < 50 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{row.ftPct}%</div>
                  </td>
                  <td className="text-center py-2 px-0.5 font-extrabold">{row.pts}</td>
                  <td className="text-center py-2 px-0.5 font-semibold">{row.oReb}</td>
                  <td className="text-center py-2 px-0.5 font-semibold">{row.dReb}</td>
                  <td className="text-center py-2 px-0.5 font-bold">{row.reb}</td>
                  <td className="text-center py-2 px-0.5 font-semibold">{row.ast}</td>
                  <td className="text-center py-2 px-0.5 font-semibold">{row.stl}</td>
                  <td className={`text-center py-2 px-0.5 font-semibold ${row.pf >= 5 ? 'text-destructive font-bold' : row.pf === 4 ? 'text-amber-500 font-bold' : ''}`}>{row.pf}</td>
                  <td className={`text-center py-2 px-0.5 font-semibold ${row.eFG >= 50 ? 'text-success font-bold' : row.fga > 0 && row.eFG < 30 ? 'text-destructive font-bold' : ''}`}>{row.fga > 0 ? `${row.eFG}%` : '—'}</td>
                  <td className={`text-center py-2 px-0.5 font-semibold ${row.ts >= 55 ? 'text-success font-bold' : row.fga > 0 && row.ts < 40 ? 'text-destructive font-bold' : ''}`}>{row.fga > 0 || row.ftA > 0 ? `${row.ts}%` : '—'}</td>
                  <td className="text-center py-2 px-0.5 font-semibold">
                    {row.courtTimePct > 0 ? `${row.courtTimePct}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Glossary legend */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="underline underline-offset-2">¿Qué significa cada sigla?</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3">
              {[
                ['PTS', 'Puntos anotados'],
                ['TC', 'Tiros de Campo (2PT + 3PT)'],
                ['2PT', 'Tiros de 2 puntos (Dobles)'],
                ['3PT', 'Tiros de 3 puntos (Triples)'],
                ['TL', 'Tiros Libres'],
                ['RO', 'Rebotes Ofensivos'],
                ['RD', 'Rebotes Defensivos'],
                ['REB', 'Rebotes Totales (RO + RD)'],
                ['AST', 'Asistencias'],
                ['STL', 'Robos de balón'],
                ['TOV', 'Pérdidas de balón'],
                ['PF', 'Faltas Personales'],
                ['eFG%', 'Eficiencia de tiro ponderada'],
                ['TS%', 'Eficiencia real de anotación'],
                ['MIN%', '% de tiempo en cancha'],
              ].map(([sigla, def]) => (
                <div key={sigla} className="flex gap-1.5">
                  <span className="font-bold text-primary shrink-0">{sigla}</span>
                  <span>{def}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Banner publicitario después del Box Score */}
      <AdBannerCarousel />

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

export default Dashboard;
