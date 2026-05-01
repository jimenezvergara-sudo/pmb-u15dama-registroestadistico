import React from 'react';
import AdBannerCarousel from '@/components/AdBannerCarousel';
import ShareStatsButton from '@/components/ShareStatsButton';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePageView } from '@/hooks/useAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, CircleDot, Percent, Grab, Handshake, ShieldCheck, Shield, LogOut, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import logoBasqest from '@/assets/logo-basqest.svg';

interface HomeScreenProps {
  onCategoryPress?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onCategoryPress }) => {
  const { games, players, activeCategory, myTeamName, myTeamLogo } = useApp();
  const { signOut, profile, user } = useAuth();
  const [infoDialog, setInfoDialog] = React.useState<{ title: string; description: string } | null>(null);

  usePageView({ page: 'home', userId: user?.id });

  const totalGames = games.length;

  const wins = games.filter(g => {
    const team = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const opp = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
    return team > opp;
  }).length;
  const losses = totalGames - wins;

  const totalTeamPts = games.reduce(
    (sum, g) => sum + g.shots.filter(s => s.made).reduce((a, s) => a + s.points, 0),
    0
  );
  const totalOppPts = games.reduce(
    (sum, g) => sum + (g.opponentScores || []).reduce((a, s) => a + s.points, 0),
    0
  );

  const ptsPerGame = totalGames > 0 ? (totalTeamPts / totalGames).toFixed(1) : '0';
  const ptsAgainst = totalGames > 0 ? (totalOppPts / totalGames).toFixed(1) : '0';

  const allShots = games.flatMap(g => g.shots);

  // Build a unified player map from game rosters (IDs match shots)
  const rosterPlayerMap = new Map<string, { name: string; number: number }>();
  games.forEach(g => {
    (g.roster || []).forEach(p => {
      if (!rosterPlayerMap.has(p.id)) {
        rosterPlayerMap.set(p.id, { name: p.name, number: p.number });
      }
    });
  });

  // Mínimos estadísticamente significativos para líderes de eficiencia
  const MIN_TRIPLE_ATT = 5;
  const MIN_DOUBLE_ATT = 8;
  const MIN_FT_ATT = 4;
  const MIN_FIELD_ATT = 10;

  const minDoubleAttempts = MIN_DOUBLE_ATT;
  const minTripleAttempts = MIN_TRIPLE_ATT;
  const minFtAttempts = MIN_FT_ATT;
  const minFieldAttempts = MIN_FIELD_ATT;

  const allActions = games.flatMap(g => g.actions || []);

  // Use roster-derived players so IDs match shots/actions
  const rosterPlayers = Array.from(rosterPlayerMap.entries()).map(([id, p]) => ({ id, ...p }));

  const playerStats = rosterPlayers.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const totalPts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);

    const triplesMade = shots.filter(s => s.points === 3 && s.made).length;
    const triplesAttempts = shots.filter(s => s.points === 3).length;
    const triplesPct = triplesAttempts > 0 ? (triplesMade / triplesAttempts) * 100 : 0;

    const doblesMade = shots.filter(s => s.points === 2 && s.made).length;
    const doblesAttempts = shots.filter(s => s.points === 2).length;
    const doblesPct = doblesAttempts > 0 ? (doblesMade / doblesAttempts) * 100 : 0;

    const ftMade = shots.filter(s => s.points === 1 && s.made).length;
    const ftAttempts = shots.filter(s => s.points === 1).length;
    const ftPct = ftAttempts > 0 ? (ftMade / ftAttempts) * 100 : 0;

    const fieldMade = shots.filter(s => s.points >= 2 && s.made).length;
    const fieldAttempts = shots.filter(s => s.points >= 2).length;
    const fieldPct = fieldAttempts > 0 ? (fieldMade / fieldAttempts) * 100 : 0;

    const rebounds = allActions.filter(a => a.playerId === p.id && (a.type === 'rebound' || a.type === 'offensive_rebound' || a.type === 'defensive_rebound')).length;
    const assists = allActions.filter(a => a.playerId === p.id && a.type === 'assist').length;
    const steals = allActions.filter(a => a.playerId === p.id && a.type === 'steal').length;

    // Partidos jugados por la jugadora (con al menos un tiro o acción)
    const gamesPlayed = games.filter(g =>
      (g.shots || []).some(s => s.playerId === p.id) ||
      (g.actions || []).some(a => a.playerId === p.id)
    ).length;

    return {
      ...p, totalPts,
      triplesMade, triplesAttempts, triplesPct,
      doblesMade, doblesAttempts, doblesPct,
      ftMade, ftAttempts, ftPct,
      fieldMade, fieldAttempts, fieldPct,
      rebounds, assists, steals, gamesPlayed,
    };
  });

  // Líderes: aplicar mínimos estrictos. Si nadie cumple, devolver null (mostrar "Sin datos suficientes").
  const topScorer = [...playerStats].filter(p => p.fieldAttempts >= minFieldAttempts).sort((a, b) => b.totalPts - a.totalPts)[0] || null;
  const topDoubles = [...playerStats].filter(p => p.doblesAttempts >= minDoubleAttempts).sort((a, b) => b.doblesPct - a.doblesPct || b.doblesMade - a.doblesMade)[0] || null;
  const topThrees = [...playerStats].filter(p => p.triplesAttempts >= minTripleAttempts).sort((a, b) => b.triplesPct - a.triplesPct || b.triplesMade - a.triplesMade)[0] || null;
  const topFt = [...playerStats].filter(p => p.ftAttempts >= minFtAttempts).sort((a, b) => b.ftPct - a.ftPct || b.ftMade - a.ftMade)[0] || null;

  // Leader: Most rebounds
  const topReb = [...playerStats].filter(p => p.rebounds > 0).sort((a, b) => b.rebounds - a.rebounds)[0];
  // Leader: Most assists
  const topAst = [...playerStats].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists)[0];
  // Leader: Most steals
  const topStl = [...playerStats].filter(p => p.steals > 0).sort((a, b) => b.steals - a.steals)[0];

  interface LeaderCard {
    title: string;
    icon: React.ReactNode;
    name: string | null;
    number: number | null;
    mainValue: string;
    subValue: string;
    contextValue?: string;
    lowSample?: boolean;
    emptyMessage?: string;
  }

  const leaders: LeaderCard[] = [
    {
      title: 'Puntos Totales',
      icon: <Trophy className="w-5 h-5" />,
      name: topScorer?.name || null,
      number: topScorer?.number ?? null,
      mainValue: topScorer ? `${topScorer.totalPts}` : '—',
      subValue: topScorer ? `${topScorer.fieldPct.toFixed(0)}% TC (${topScorer.fieldMade}/${topScorer.fieldAttempts})` : '',
      contextValue: topScorer ? `${topScorer.gamesPlayed} ${topScorer.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      lowSample: topScorer ? topScorer.fieldAttempts < minFieldAttempts * 1.5 : false,
      emptyMessage: `Sin datos suficientes — se requieren más partidos (mín. ${minFieldAttempts} TC intentados)`,
    },
    {
      title: 'Líder Dobles',
      icon: <CircleDot className="w-5 h-5" />,
      name: topDoubles?.name || null,
      number: topDoubles?.number ?? null,
      mainValue: topDoubles ? `${topDoubles.doblesPct.toFixed(0)}%` : '—',
      subValue: topDoubles ? `(${topDoubles.doblesMade}/${topDoubles.doblesAttempts})` : '',
      contextValue: topDoubles ? `${topDoubles.gamesPlayed} ${topDoubles.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      lowSample: topDoubles ? topDoubles.doblesAttempts < minDoubleAttempts * 1.5 : false,
      emptyMessage: `Sin datos suficientes — se requieren más partidos (mín. ${minDoubleAttempts} dobles intentados)`,
    },
    {
      title: 'Líder Triples',
      icon: <Target className="w-5 h-5" />,
      name: topThrees?.name || null,
      number: topThrees?.number ?? null,
      mainValue: topThrees ? `${topThrees.triplesPct.toFixed(0)}%` : '—',
      subValue: topThrees ? `(${topThrees.triplesMade}/${topThrees.triplesAttempts})` : '',
      contextValue: topThrees ? `${topThrees.gamesPlayed} ${topThrees.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      lowSample: topThrees ? topThrees.triplesAttempts < minTripleAttempts * 1.5 : false,
      emptyMessage: `Sin datos suficientes — se requieren más partidos (mín. ${minTripleAttempts} triples intentados)`,
    },
    {
      title: 'Mejor % TL',
      icon: <Percent className="w-5 h-5" />,
      name: topFt?.name || null,
      number: topFt?.number ?? null,
      mainValue: topFt ? `${topFt.ftPct.toFixed(0)}%` : '—',
      subValue: topFt ? `(${topFt.ftMade}/${topFt.ftAttempts})` : '',
      contextValue: topFt ? `${topFt.gamesPlayed} ${topFt.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      lowSample: topFt ? topFt.ftAttempts < minFtAttempts * 1.5 : false,
      emptyMessage: `Sin datos suficientes — se requieren más partidos (mín. ${minFtAttempts} TL intentados)`,
    },
    {
      title: 'Líder Rebotes',
      icon: <Grab className="w-5 h-5" />,
      name: topReb?.name || null,
      number: topReb?.number ?? null,
      mainValue: topReb ? `${topReb.rebounds}` : '—',
      subValue: topReb && topReb.gamesPlayed > 0 ? `${(topReb.rebounds / topReb.gamesPlayed).toFixed(1)} reb/partido` : '',
      contextValue: topReb ? `${topReb.gamesPlayed} ${topReb.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      emptyMessage: 'Sin datos suficientes — se requieren más partidos',
    },
    {
      title: 'Líder Asistencias',
      icon: <Handshake className="w-5 h-5" />,
      name: topAst?.name || null,
      number: topAst?.number ?? null,
      mainValue: topAst ? `${topAst.assists}` : '—',
      subValue: topAst && topAst.gamesPlayed > 0 ? `${(topAst.assists / topAst.gamesPlayed).toFixed(1)} ast/partido` : '',
      contextValue: topAst ? `${topAst.gamesPlayed} ${topAst.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      emptyMessage: 'Sin datos suficientes — se requieren más partidos',
    },
    {
      title: 'Líder Robos',
      icon: <ShieldCheck className="w-5 h-5" />,
      name: topStl?.name || null,
      number: topStl?.number ?? null,
      mainValue: topStl ? `${topStl.steals}` : '—',
      subValue: topStl && topStl.gamesPlayed > 0 ? `${(topStl.steals / topStl.gamesPlayed).toFixed(1)} rob/partido` : '',
      contextValue: topStl ? `${topStl.gamesPlayed} ${topStl.gamesPlayed === 1 ? 'partido' : 'partidos'}` : '',
      emptyMessage: 'Sin datos suficientes — se requieren más partidos',
    },
  ];

  const totalShotsAll = allShots.length;
  const madeAll = allShots.filter(s => s.made).length;
  const pctPosesion = totalShotsAll > 0 ? Math.round((madeAll / totalShotsAll) * 100) : 0;

  const doublesAttempted = allShots.filter(s => s.points === 2).length;
  const doublesMade = allShots.filter(s => s.points === 2 && s.made).length;
  const pctDobles = doublesAttempted > 0 ? Math.round((doublesMade / doublesAttempted) * 100) : 0;

  const triplesAttemptedAll = allShots.filter(s => s.points === 3).length;
  const triplesMadeAll = allShots.filter(s => s.points === 3 && s.made).length;
  const pctTriples = triplesAttemptedAll > 0 ? Math.round((triplesMadeAll / triplesAttemptedAll) * 100) : 0;

  const ftAttempted = allShots.filter(s => s.points === 1).length;
  const ftMadeAll = allShots.filter(s => s.points === 1 && s.made).length;
  const pctTL = ftAttempted > 0 ? Math.round((ftMadeAll / ftAttempted) * 100) : 0;

  const fga = allShots.filter(s => s.points >= 2).length;
  const twoMade = doublesMade;
  const threeMade = triplesMadeAll;
  const eFG = fga > 0 ? Math.round(((twoMade + 0.5 * threeMade) / fga) * 100) : 0;

  const totalPtsAll = allShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const tsDenom = 2 * (fga + 0.44 * ftAttempted);
  const tsPercent = tsDenom > 0 ? Math.round((totalPtsAll / tsDenom) * 100) : 0;

  const productivityRow1 = [
    { label: 'EF. POSESIÓN', value: `${pctPosesion}%` },
    {
      label: 'eFG%', value: `${eFG}%`,
      info: {
        title: 'eFG% — Effective Field Goal Percentage',
        description: 'El eFG% (Effective Field Goal Percentage) ajusta el porcentaje de tiros de campo para reflejar que los triples valen más que los dobles.\n\nFórmula:\n(Dobles anotados + 0.5 × Triples anotados) ÷ Total de tiros de campo intentados × 100',
      },
    },
    {
      label: 'TS%', value: `${tsPercent}%`,
      info: {
        title: 'TS% — True Shooting Percentage',
        description: 'El True Shooting Percentage (TS%) es la métrica avanzada para medir la eficiencia anotadora, al incluir triples, tiros de campo de dos puntos y tiros libres en una sola fórmula.\n\nFórmula:\nPuntos convertidos ÷ (2 × (Tiros de campo intentados + 0.44 × Tiros libres intentados)) × 100',
      },
    },
  ];

  const productivityRow2 = [
    { label: 'EF. DOBLES', value: `${pctDobles}%` },
    { label: 'EF. TL', value: `${pctTL}%` },
    { label: 'EF. TRIPLES', value: `${pctTriples}%` },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header marquee - App branding */}
      <div className="bg-primary px-5 pt-6 pb-10 rounded-b-3xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary-foreground/5" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-primary-foreground/5" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-black text-primary-foreground tracking-tight">BASQUEST+</h1>
            <p className="text-xs text-primary-foreground/50 font-semibold mt-0.5">Inteligencia Deportiva · {activeCategory}</p>
            {profile?.full_name && (
              <p className="text-[10px] text-primary-foreground/40 font-medium mt-0.5">👋 {profile.full_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <img src={logoBasqest} alt="BASQUEST+" className="w-14 h-14 rounded-xl shadow-lg ring-2 ring-primary-foreground/20" />
            <button
              onClick={signOut}
              className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-primary-foreground/70" />
            </button>
          </div>
        </div>
      </div>

      {/* Team capsule */}
      {(myTeamName || myTeamLogo) && (
        <div className="flex justify-center -mt-5 relative z-20">
          <div className="bg-card rounded-full pl-1.5 pr-5 py-1.5 flex items-center gap-2.5 shadow-lg border border-border/60">
            {myTeamLogo ? (
              <img src={myTeamLogo} alt={myTeamName} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="font-extrabold text-foreground text-sm tracking-tight">{myTeamName}</span>
          </div>
        </div>
      )}

      {/* Productividad del Equipo */}
      <div className="px-4 mt-4 relative z-10">
        <h2 className="text-base font-extrabold text-foreground mb-3">Productividad del Equipo</h2>
        <div className="grid grid-cols-3 gap-3">
          {productivityRow1.map(stat => (
            <Card key={stat.label} className="bg-card border-2 border-amber-400/70 shadow-xl">
              <CardContent className="p-3 text-center relative">
                {stat.info && (
                  <button
                    onClick={() => setInfoDialog(stat.info!)}
                    className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                )}
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-foreground leading-tight mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {productivityRow2.map(stat => (
            <Card key={stat.label} className="bg-card border-2 border-amber-400/70 shadow-xl">
              <CardContent className="p-3 text-center">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-foreground leading-tight mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-3 relative z-10">
        {[
          { label: 'RÉCORD', value: `${wins}-${losses}` },
          { label: 'PTS/P', value: ptsPerGame },
          { label: 'PTS/C', value: ptsAgainst },
        ].map(stat => (
          <Card key={stat.label} className="bg-card border-2 border-amber-400/70 shadow-xl">
            <CardContent className="p-3 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-foreground leading-tight mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaders */}
      <div className="px-4 mt-8 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-foreground">Líderes de Temporada</h2>
            <ShareStatsButton />
          </div>
          <button
            onClick={onCategoryPress}
            className="text-sm font-extrabold text-accent-foreground bg-accent px-5 py-2.5 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5 border-2 border-accent-foreground/10"
          >
            <span className="text-base">📂</span>
            <span>{activeCategory}</span>
            <span className="text-xs opacity-70">▼</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {leaders.map(leader => (
            <Card key={leader.title} className="border-border/40 shadow-md hover:shadow-lg transition-shadow bg-card overflow-hidden">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <span className="text-primary">{leader.icon}</span>
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{leader.title}</p>
                {leader.name ? (
                  <>
                    <p className="text-xs font-bold text-foreground leading-tight">#{leader.number} {leader.name}</p>
                    <p className="text-2xl font-black text-primary leading-tight mt-1">{leader.mainValue}</p>
                    {leader.subValue && (
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{leader.subValue}</p>
                    )}
                    {leader.contextValue && (
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5">({leader.contextValue})</p>
                    )}
                    {leader.lowSample && (
                      <p className="mt-1 inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/40">⚠️ Muestra pequeña</p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic mt-2 leading-tight">{leader.emptyMessage || 'Sin datos suficientes — se requieren más partidos'}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Banner publicitario */}
      <div className="px-4 pb-2">
        <AdBannerCarousel />
      </div>

      <div className="px-4 py-6">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-semibold">
          {totalGames} {totalGames === 1 ? 'partido jugado' : 'partidos jugados'}
        </p>
      </div>
      {/* Info Dialog */}
      <Dialog open={!!infoDialog} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{infoDialog?.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line text-sm mt-2">
              {infoDialog?.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeScreen;
