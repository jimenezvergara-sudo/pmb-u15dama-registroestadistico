import React from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, CircleDot, Percent } from 'lucide-react';
import logoPmb from '@/assets/logo-pmb.png';

interface LeaderData {
  name: string;
  number: number;
  value: string;
}

const HomeScreen: React.FC = () => {
  const { games, players } = useApp();

  // Global stats
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

  // Leaders calculations across all games
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
      icon: <Trophy className="w-4 h-4" />,
      data: topScorer ? { name: topScorer.name, number: topScorer.number, value: `${topScorer.totalPts} pts` } : null,
    },
    {
      title: 'Líder Triples',
      icon: <Target className="w-4 h-4" />,
      data: topThrees ? { name: topThrees.name, number: topThrees.number, value: `${topThrees.triples} triples` } : null,
    },
    {
      title: 'Líder Dobles',
      icon: <CircleDot className="w-4 h-4" />,
      data: topDoubles ? { name: topDoubles.name, number: topDoubles.number, value: `${topDoubles.dobles} dobles` } : null,
    },
    {
      title: 'Mejor % Libres',
      icon: <Percent className="w-4 h-4" />,
      data: topFt ? { name: topFt.name, number: topFt.number, value: `${topFt.ftPct.toFixed(0)}% (${topFt.ftMade}/${topFt.ftAttempts})` } : null,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-primary px-5 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-primary-foreground tracking-tight">
            Puerto Montt Basket
          </h1>
          <p className="text-[11px] text-primary-foreground/60 font-semibold uppercase tracking-widest mt-0.5">
            U15 Damas · Temporada 2025
          </p>
        </div>
        <img src={logoPmb} alt="PMB" className="w-12 h-12 rounded-lg" />
      </div>

      {/* Global Stats Row */}
      <div className="grid grid-cols-3 gap-2 px-3 -mt-4">
        {[
          { label: 'RÉCORD', value: `${wins}-${losses}` },
          { label: 'PTS/P', value: ptsPerGame },
          { label: 'PTS/C', value: ptsAgainst },
        ].map(stat => (
          <Card key={stat.label} className="bg-primary border-none shadow-lg">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] font-bold text-primary-foreground/60 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-primary-foreground leading-tight mt-0.5">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Season Leaders */}
      <div className="px-3 mt-5">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
          Líderes de Temporada
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {leaders.map(leader => (
            <Card key={leader.title} className="border-border/50 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-primary">{leader.icon}</span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {leader.title}
                  </p>
                </div>
                {leader.data ? (
                  <>
                    <p className="text-sm font-extrabold text-foreground leading-tight">
                      #{leader.data.number} {leader.data.name.split(' ')[0]}
                    </p>
                    <p className="text-lg font-black text-primary leading-tight mt-0.5">
                      {leader.data.value}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin datos</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Games played indicator */}
      <div className="px-3 mt-5 mb-4">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">
          {totalGames} {totalGames === 1 ? 'partido jugado' : 'partidos jugados'}
        </p>
      </div>
    </div>
  );
};

export default HomeScreen;
