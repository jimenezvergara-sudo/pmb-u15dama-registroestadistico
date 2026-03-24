import React from 'react';
import { Game, QUARTER_LABELS } from '@/types/basketball';
import { useApp } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Share2, FileText } from 'lucide-react';
import { generatePdfReport } from '@/utils/generatePdfReport';
import logoBasqest from '@/assets/logo-basqest-full.png';

const isRebound = (type: string) => type === 'rebound' || type === 'offensive_rebound' || type === 'defensive_rebound';

interface Props {
  game: Game;
  onClose: () => void;
}

const LiveGameReport: React.FC<Props> = ({ game, onClose }) => {
  const { myTeamName, myTeamLogo, activeCategory } = useApp();

  const teamScore = game.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const oppScore = (game.opponentScores || []).reduce((sum, s) => sum + s.points, 0);

  const allShots = game.shots;
  const allActions = game.actions || [];

  const fga = allShots.filter(s => s.points >= 2).length;
  const fgm = allShots.filter(s => s.points >= 2 && s.made).length;
  const twoPtA = allShots.filter(s => s.points === 2).length;
  const twoPtM = allShots.filter(s => s.points === 2 && s.made).length;
  const threePtA = allShots.filter(s => s.points === 3).length;
  const threePtM = allShots.filter(s => s.points === 3 && s.made).length;
  const ftA = allShots.filter(s => s.points === 1).length;
  const ftM = allShots.filter(s => s.points === 1 && s.made).length;

  const fgPct = fga > 0 ? ((fgm / fga) * 100).toFixed(1) : '0.0';
  const twoPct = twoPtA > 0 ? ((twoPtM / twoPtA) * 100).toFixed(1) : '0.0';
  const threePct = threePtA > 0 ? ((threePtM / threePtA) * 100).toFixed(1) : '0.0';
  const ftPct = ftA > 0 ? ((ftM / ftA) * 100).toFixed(1) : '0.0';

  const totalReb = allActions.filter(a => isRebound(a.type)).length;
  const offReb = allActions.filter(a => a.type === 'offensive_rebound').length;
  const defReb = allActions.filter(a => a.type === 'defensive_rebound').length;
  const legacyReb = allActions.filter(a => a.type === 'rebound').length;
  const totalAst = allActions.filter(a => a.type === 'assist').length;
  const totalStl = allActions.filter(a => a.type === 'steal').length;
  const totalTov = allActions.filter(a => a.type === 'turnover').length;

  // Per-player stats
  const playerStats = game.roster.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const pts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const pActions = allActions.filter(a => a.playerId === p.id);
    const reb = pActions.filter(a => isRebound(a.type)).length;
    const ast = pActions.filter(a => a.type === 'assist').length;
    const stl = pActions.filter(a => a.type === 'steal').length;
    const tov = pActions.filter(a => a.type === 'turnover').length;
    const fouls = pActions.filter(a => a.type === 'foul').length;
    const fg = shots.filter(s => s.points >= 2);
    const fgm = fg.filter(s => s.made).length;
    return { ...p, pts, reb, ast, stl, tov, fouls, fgm, fga: fg.length };
  }).sort((a, b) => b.pts - a.pts);

  const handleShareWhatsApp = () => {
    const text = `📊 *Informe en Vivo — BASQUEST+*\n` +
      `${myTeamName || 'Mi Equipo'} *${teamScore}* vs *${oppScore}* ${game.opponentName}\n` +
      `Cuarto: ${QUARTER_LABELS[game.currentQuarter]}\n\n` +
      `TC: ${fgm}/${fga} (${fgPct}%) | 2PT: ${twoPtM}/${twoPtA} (${twoPct}%)\n` +
      `3PT: ${threePtM}/${threePtA} (${threePct}%) | TL: ${ftM}/${ftA} (${ftPct}%)\n` +
      `REB: ${totalReb} (OF:${offReb} DEF:${defReb + legacyReb}) | AST: ${totalAst} | STL: ${totalStl} | TOV: ${totalTov}\n\n` +
      playerStats.slice(0, 5).map(p => `#${p.number} ${p.name}: ${p.pts}pts ${p.reb}reb ${p.ast}ast`).join('\n') +
      `\n\n_Generado por BASQUEST+ — Inteligencia Deportiva_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = async () => {
    try {
      await generatePdfReport(
        [game],
        [game],
        game.roster,
        {
          teamName: myTeamName,
          teamLogo: myTeamLogo,
          appLogo: logoBasqest,
          category: activeCategory,
          filterLabel: `Informe en Vivo — ${QUARTER_LABELS[game.currentQuarter]}`,
          gameLabel: `vs ${game.opponentName}`,
          quarterFilter: 'ALL',
          playerFilter: 'ALL',
        },
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold flex items-center gap-2">
            📊 Informe — {QUARTER_LABELS[game.currentQuarter]}
          </DialogTitle>
        </DialogHeader>

        {/* Score */}
        <div className="bg-primary rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <div>
              <p className="text-xs text-primary-foreground/70 font-bold">{myTeamName || 'Local'}</p>
              <p className="text-3xl font-black text-primary-foreground">{teamScore}</p>
            </div>
            <span className="text-primary-foreground/50 font-bold text-sm">VS</span>
            <div>
              <p className="text-xs text-primary-foreground/70 font-bold">{game.opponentName}</p>
              <p className="text-3xl font-black text-primary-foreground/80">{oppScore}</p>
            </div>
          </div>
        </div>

        {/* Team totals */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'TC', value: `${fgm}/${fga}`, pct: `${fgPct}%` },
            { label: '2PT', value: `${twoPtM}/${twoPtA}`, pct: `${twoPct}%` },
            { label: '3PT', value: `${threePtM}/${threePtA}`, pct: `${threePct}%` },
            { label: 'TL', value: `${ftM}/${ftA}`, pct: `${ftPct}%` },
          ].map(s => (
            <Card key={s.label} className="border-border/40">
              <CardContent className="p-2 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">{s.label}</p>
                <p className="text-sm font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.pct}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Card className="border-border/40">
            <CardContent className="p-2 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">REB</p>
              <p className="text-sm font-black text-foreground">{totalReb}</p>
              <p className="text-[10px] text-muted-foreground">OF:{offReb} DEF:{defReb + legacyReb}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-2 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">AST</p>
              <p className="text-sm font-black text-foreground">{totalAst}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-2 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">STL</p>
              <p className="text-sm font-black text-foreground">{totalStl}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-2 text-center">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">TOV</p>
              <p className="text-sm font-black text-foreground">{totalTov}</p>
            </CardContent>
          </Card>
        </div>

        {/* Mini box score */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 font-bold text-muted-foreground">JUG</th>
                <th className="text-center py-1 font-bold text-muted-foreground">PTS</th>
                <th className="text-center py-1 font-bold text-muted-foreground">TC</th>
                <th className="text-center py-1 font-bold text-muted-foreground">REB</th>
                <th className="text-center py-1 font-bold text-muted-foreground">AST</th>
                <th className="text-center py-1 font-bold text-muted-foreground">STL</th>
                <th className="text-center py-1 font-bold text-muted-foreground">PF</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map(p => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="py-1 font-bold truncate max-w-[80px]">#{p.number} {p.name.split(' ')[0]}</td>
                  <td className="text-center font-black">{p.pts}</td>
                  <td className="text-center">{p.fgm}/{p.fga}</td>
                  <td className="text-center">{p.reb}</td>
                  <td className="text-center">{p.ast}</td>
                  <td className="text-center">{p.stl}</td>
                  <td className="text-center">{p.fouls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="flex-1 gap-1">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button onClick={handleShareWhatsApp} size="sm" className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Share2 className="w-4 h-4" /> WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveGameReport;
