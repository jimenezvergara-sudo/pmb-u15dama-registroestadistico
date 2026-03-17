import React from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, CircleDot, Percent, Grab, Handshake, ShieldCheck } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest-new.png';

interface HomeScreenProps {
  onCategoryPress?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onCategoryPress }) => {
  const { games, players, activeCategory } = useApp();

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

  // Team totals for 20% threshold
  const teamTotalDoubleAttempts = allShots.filter(s => s.points === 2).length;
  const teamTotalTripleAttempts = allShots.filter(s => s.points === 3).length;
  const teamTotalFtAttempts = allShots.filter(s => s.points === 1).length;
  const teamTotalFieldAttempts = allShots.filter(s => s.points >= 2).length;

  const minDoubleAttempts = Math.max(1, Math.floor(teamTotalDoubleAttempts * 0.2));
  const minTripleAttempts = Math.max(1, Math.floor(teamTotalTripleAttempts * 0.2));
  const minFtAttempts = Math.max(1, Math.floor(teamTotalFtAttempts * 0.2));
  const minFieldAttempts = Math.max(1, Math.floor(teamTotalFieldAttempts * 0.2));

  const allActions = games.flatMap(g => g.actions || []);

  const playerStats = players.map(p => {
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

    const rebounds = allActions.filter(a => a.playerId === p.id && a.type === 'rebound').length;
    const assists = allActions.filter(a => a.playerId === p.id && a.type === 'assist').length;
    const steals = allActions.filter(a => a.playerId === p.id && a.type === 'steal').length;

    return {
      ...p, totalPts,
      triplesMade, triplesAttempts, triplesPct,
      doblesMade, doblesAttempts, doblesPct,
      ftMade, ftAttempts, ftPct,
      fieldMade, fieldAttempts, fieldPct,
      rebounds, assists, steals,
    };
  });

  // Leader: Most total points + global FG%
  const topScorer = [...playerStats].filter(p => p.fieldAttempts >= minFieldAttempts).sort((a, b) => b.totalPts - a.totalPts)[0]
    || [...playerStats].sort((a, b) => b.totalPts - a.totalPts)[0];

  // Leader: Most doubles made (with 20% volume threshold for %)
  const topDoubles = [...playerStats].filter(p => p.doblesAttempts >= minDoubleAttempts).sort((a, b) => b.doblesMade - a.doblesMade || b.doblesPct - a.doblesPct)[0]
    || [...playerStats].filter(p => p.doblesMade > 0).sort((a, b) => b.doblesMade - a.doblesMade)[0];

  // Leader: Most triples made (with 20% volume threshold for %)
  const topThrees = [...playerStats].filter(p => p.triplesAttempts >= minTripleAttempts).sort((a, b) => b.triplesMade - a.triplesMade || b.triplesPct - a.triplesPct)[0]
    || [...playerStats].filter(p => p.triplesMade > 0).sort((a, b) => b.triplesMade - a.triplesMade)[0];

  // Leader: Best FT% (with 20% volume threshold)
  const topFt = [...playerStats].filter(p => p.ftAttempts >= minFtAttempts).sort((a, b) => b.ftPct - a.ftPct || b.ftMade - a.ftMade)[0]
    || [...playerStats].filter(p => p.ftAttempts >= 1).sort((a, b) => b.ftPct - a.ftPct)[0];

  interface LeaderCard {
    title: string;
    icon: React.ReactNode;
    name: string | null;
    number: number | null;
    mainValue: string;
    subValue: string;
  }

  const leaders: LeaderCard[] = [
    {
      title: 'Puntos Totales',
      icon: <Trophy className="w-5 h-5" />,
      name: topScorer?.name || null,
      number: topScorer?.number ?? null,
      mainValue: topScorer ? `${topScorer.totalPts}` : '—',
      subValue: topScorer ? `Efic: ${topScorer.fieldPct.toFixed(0)}% TC` : '',
    },
    {
      title: 'Líder Dobles',
      icon: <CircleDot className="w-5 h-5" />,
      name: topDoubles?.name || null,
      number: topDoubles?.number ?? null,
      mainValue: topDoubles ? `${topDoubles.doblesMade}` : '—',
      subValue: topDoubles ? `Efic: ${topDoubles.doblesPct.toFixed(0)}% (${topDoubles.doblesMade}/${topDoubles.doblesAttempts})` : '',
    },
    {
      title: 'Líder Triples',
      icon: <Target className="w-5 h-5" />,
      name: topThrees?.name || null,
      number: topThrees?.number ?? null,
      mainValue: topThrees ? `${topThrees.triplesMade}` : '—',
      subValue: topThrees ? `Efic: ${topThrees.triplesPct.toFixed(0)}% (${topThrees.triplesMade}/${topThrees.triplesAttempts})` : '',
    },
    {
      title: 'Mejor % TL',
      icon: <Percent className="w-5 h-5" />,
      name: topFt?.name || null,
      number: topFt?.number ?? null,
      mainValue: topFt ? `${topFt.ftMade}` : '—',
      subValue: topFt ? `Efic: ${topFt.ftPct.toFixed(0)}% (${topFt.ftMade}/${topFt.ftAttempts})` : '',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header marquee */}
      <div className="bg-primary px-5 pt-6 pb-10 rounded-b-3xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary-foreground/5" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-primary-foreground/5" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-black text-primary-foreground tracking-tight">BASQEST+</h1>
            <p className="text-xs text-primary-foreground/50 font-semibold mt-0.5">Inteligencia Deportiva · {activeCategory}</p>
          </div>
          <img src={logoBasqest} alt="BASQEST+" className="w-14 h-14 rounded-xl shadow-lg ring-2 ring-primary-foreground/20" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 px-4 -mt-6 relative z-10">
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
          <h2 className="text-base font-extrabold text-foreground">Líderes de Temporada</h2>
          <button
            onClick={onCategoryPress}
            className="text-[10px] font-bold text-accent-foreground bg-accent px-3 py-1 rounded-full"
          >
            📂 {activeCategory}
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
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{leader.subValue}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-2">Sin datos</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="px-4 py-6">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-semibold">
          {totalGames} {totalGames === 1 ? 'partido jugado' : 'partidos jugados'}
        </p>
      </div>
    </div>
  );
};

export default HomeScreen;
