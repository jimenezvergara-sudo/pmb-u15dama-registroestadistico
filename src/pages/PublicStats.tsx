import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePageView } from '@/hooks/useAnalytics';
import AdBannerCarousel from '@/components/AdBannerCarousel';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, CircleDot, Percent, Grab, Handshake, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoBasqest from '@/assets/logo-basqest-new.png';

interface SharedSnapshot {
  teamName: string;
  teamLogo: string;
  category: string;
  sharedBy: string;
  sharedAt: string;
  games: any[];
  players: any[];
}

const PublicStats: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageView({ page: `/public/${shareId}`, isPublicView: true, shareId });

  useEffect(() => {
    const fetchStats = async () => {
      if (!shareId) { setError(true); setLoading(false); return; }

      const { data, error: err } = await supabase
        .from('shared_stats')
        .select('data')
        .eq('id', shareId)
        .single();

      if (err || !data) { setError(true); setLoading(false); return; }
      setSnapshot(data.data as unknown as SharedSnapshot);
      setLoading(false);
    };
    fetchStats();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-xl font-black text-foreground mb-2">Enlace no válido</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este enlace ha expirado o no existe.
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Ir a BASQUEST+
          </Button>
        </Link>
      </div>
    );
  }

  const { games, players, teamName, teamLogo, category, sharedBy, sharedAt } = snapshot;
  const totalGames = games.length;

  const wins = games.filter(g => {
    const team = (g.shots || []).filter((s: any) => s.made).reduce((sum: number, s: any) => sum + s.points, 0);
    const opp = (g.opponentScores || []).reduce((sum: number, s: any) => sum + s.points, 0);
    return team > opp;
  }).length;
  const losses = totalGames - wins;

  const totalTeamPts = games.reduce(
    (sum: number, g: any) => sum + (g.shots || []).filter((s: any) => s.made).reduce((a: number, s: any) => a + s.points, 0), 0
  );
  const totalOppPts = games.reduce(
    (sum: number, g: any) => sum + (g.opponentScores || []).reduce((a: number, s: any) => a + s.points, 0), 0
  );
  const ptsPerGame = totalGames > 0 ? (totalTeamPts / totalGames).toFixed(1) : '0';
  const ptsAgainst = totalGames > 0 ? (totalOppPts / totalGames).toFixed(1) : '0';

  // Player stats
  const allShots = games.flatMap((g: any) => g.shots || []);
  const allActions = games.flatMap((g: any) => g.actions || []);

  const playerStats = players.map((p: any) => {
    const shots = allShots.filter((s: any) => s.playerId === p.id);
    const totalPts = shots.filter((s: any) => s.made).reduce((sum: number, s: any) => sum + s.points, 0);
    const rebounds = allActions.filter((a: any) => a.playerId === p.id && a.type === 'rebound').length;
    const assists = allActions.filter((a: any) => a.playerId === p.id && a.type === 'assist').length;
    const steals = allActions.filter((a: any) => a.playerId === p.id && a.type === 'steal').length;
    const fieldMade = shots.filter((s: any) => s.points >= 2 && s.made).length;
    const fieldAttempts = shots.filter((s: any) => s.points >= 2).length;
    const fieldPct = fieldAttempts > 0 ? (fieldMade / fieldAttempts * 100) : 0;
    return { ...p, totalPts, rebounds, assists, steals, fieldPct, fieldAttempts };
  });

  const topScorer = [...playerStats].sort((a, b) => b.totalPts - a.totalPts)[0];
  const topReb = [...playerStats].sort((a, b) => b.rebounds - a.rebounds).find(p => p.rebounds > 0);
  const topAst = [...playerStats].sort((a, b) => b.assists - a.assists).find(p => p.assists > 0);
  const topStl = [...playerStats].sort((a, b) => b.steals - a.steals).find(p => p.steals > 0);

  const leaders = [
    { title: 'Puntos', icon: <Trophy className="w-5 h-5" />, player: topScorer, value: topScorer?.totalPts, sub: `${topScorer?.fieldPct?.toFixed(0)}% TC` },
    { title: 'Rebotes', icon: <Grab className="w-5 h-5" />, player: topReb, value: topReb?.rebounds, sub: '' },
    { title: 'Asistencias', icon: <Handshake className="w-5 h-5" />, player: topAst, value: topAst?.assists, sub: '' },
    { title: 'Robos', icon: <ShieldCheck className="w-5 h-5" />, player: topStl, value: topStl?.steals, sub: '' },
  ];

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="bg-primary px-5 pt-8 pb-10 rounded-b-3xl text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="w-12 h-12 rounded-full object-cover border-2 border-primary-foreground/30" />
          ) : (
            <img src={logoBasqest} alt="BASQEST+" className="w-10 h-10" />
          )}
        </div>
        <h1 className="text-xl font-black text-primary-foreground tracking-tight">
          {teamName || 'Estadísticas'}
        </h1>
        <p className="text-xs text-primary-foreground/60 font-semibold mt-1">
          {category} • Compartido por {sharedBy}
        </p>
        <p className="text-[10px] text-primary-foreground/40 mt-1">
          {new Date(sharedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Record cards */}
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
      <div className="px-4 mt-8">
        <h2 className="text-base font-extrabold text-foreground mb-4">Líderes</h2>
        <div className="grid grid-cols-2 gap-3">
          {leaders.map(l => (
            <Card key={l.title} className="border-border/40 shadow-md bg-card overflow-hidden">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <span className="text-primary">{l.icon}</span>
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{l.title}</p>
                {l.player ? (
                  <>
                    <p className="text-xs font-bold text-foreground">#{l.player.number} {l.player.name}</p>
                    <p className="text-2xl font-black text-primary leading-tight mt-1">{l.value}</p>
                    {l.sub && <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{l.sub}</p>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-2">Sin datos</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Box Score per game */}
      <div className="px-4 mt-8">
        <h2 className="text-base font-extrabold text-foreground mb-4">Resultados ({totalGames})</h2>
        <div className="space-y-2">
          {games.map((g: any, i: number) => {
            const teamPts = (g.shots || []).filter((s: any) => s.made).reduce((sum: number, s: any) => sum + s.points, 0);
            const oppPts = (g.opponentScores || []).reduce((sum: number, s: any) => sum + s.points, 0);
            const won = teamPts > oppPts;
            return (
              <Card key={g.id || i} className="border-border/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">{g.opponentName || `Partido ${i + 1}`}</p>
                    <p className="text-[10px] text-muted-foreground">{g.date ? new Date(g.date).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${won ? 'text-green-600' : 'text-destructive'}`}>
                      {teamPts} - {oppPts}
                    </p>
                    <p className={`text-[10px] font-bold ${won ? 'text-green-600' : 'text-destructive'}`}>
                      {won ? 'VICTORIA' : 'DERROTA'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Banner */}
      <div className="px-4 py-6">
        <AdBannerCarousel />
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-3">
          Estadísticas generadas con
        </p>
        <Link to="/">
          <Button variant="default" size="sm" className="gap-2">
            <img src={logoBasqest} alt="" className="w-4 h-4" />
            Probar BASQEST+ Gratis
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PublicStats;
