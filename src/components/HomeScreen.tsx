import React from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, CircleDot, Percent } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest.png';

interface LeaderData {
  name: string;
  number: number;
  value: string;
}

const HomeScreen: React.FC = () => {
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

  const playerStats = players.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const totalPts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const triples = shots.filter(s => s.points === 3 && s.made).length;
    const dobles = shots.filter(s => s.points === 2 && s.made).length;
    const ftMade = shots.filter(s => s.points === 1 && s.made).length;
    const ftAttempts = shots.filter(s => s.points === 1).length;
    const ftPct = ftAttempts > 0 ? (ftMade / ftAttempts) * 100 : 0;
    return { ...p, totalPts, triples, dobles, ftMade, ftAttempts, ftPct };
  });

  const topScorer = [...playerStats].sort((a, b) => b.totalPts - a.totalPts)[0];
  const topThrees = [...playerStats].sort((a, b) => b.triples - a.triples)[0];
  const topDoubles = [...playerStats].sort((a, b) => b.dobles - a.dobles)[0];
  const topFt = [...playerStats].filter(p => p.ftAttempts >= 1).sort((a, b) => b.ftPct - a.ftPct)[0];

  const leaders: { title: string; icon: React.ReactNode; data: LeaderData | null }[] = [
    {
      title: 'Líder Anotación',
      icon: <Trophy className="w-5 h-5" />,
      data: topScorer ? { name: topScorer.name, number: topScorer.number, value: `${topScorer.totalPts} pts` } : null,
    },
    {
      title: 'Líder Triples',
      icon: <Target className="w-5 h-5" />,
      data: topThrees ? { name: topThrees.name, number: topThrees.number, value: `${topThrees.triples} triples` } : null,
    },
    {
      title: 'Líder Dobles',
      icon: <CircleDot className="w-5 h-5" />,
      data: topDoubles ? { name: topDoubles.name, number: topDoubles.number, value: `${topDoubles.dobles} dobles` } : null,
    },
    {
      title: 'Mejor % Tiros Libres',
      icon: <Percent className="w-5 h-5" />,
      data: topFt ? { name: topFt.name, number: topFt.number, value: `${topFt.ftPct.toFixed(1)}%` } : null,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
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

      <div className="grid grid-cols-3 gap-3 px-4 -mt-6 relative z-10">
        {[
          { label: 'RÉCORD', value: `${wins}-${losses}` },
          { label: 'PTS/P', value: ptsPerGame },
          { label: 'PTS/C', value: ptsAgainst },
        ].map(stat => (
          <Card key={stat.label} className="bg-primary border-none shadow-xl shadow-primary/30">
            <CardContent className="p-3 text-center">
              <p className="text-[9px] font-bold text-primary-foreground/50 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-primary-foreground leading-tight mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="px-4 mt-8 flex-1">
        <h2 className="text-base font-extrabold text-foreground mb-4">Líderes de Temporada</h2>
        <div className="grid grid-cols-2 gap-3">
          {leaders.map(leader => (
            <Card key={leader.title} className="border-border/40 shadow-md hover:shadow-lg transition-shadow bg-card">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2.5">
                  <span className="text-primary">{leader.icon}</span>
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{leader.title}</p>
                {leader.data ? (
                  <>
                    <p className="text-sm font-bold text-foreground leading-tight">{leader.data.name}</p>
                    <p className="text-xl font-black text-primary leading-tight mt-1">{leader.data.value}</p>
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
