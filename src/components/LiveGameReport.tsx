import React from 'react';
import { Game, QUARTER_LABELS } from '@/types/basketball';
import { useApp } from '@/context/AppContext';
import { useRama } from '@/hooks/useRama';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Share2, FileText, TrendingUp, TrendingDown, Minus, HelpCircle, Clock } from 'lucide-react';
import { generatePdfReport } from '@/utils/generatePdfReport';
import { shareHalftimeWhatsApp, isHalftimeAvailable } from '@/utils/halftimeShare';
import logoBasqest from '@/assets/logo-basqest.png';

const isRebound = (type: string) => type === 'rebound' || type === 'offensive_rebound' || type === 'defensive_rebound';

interface Props {
  game: Game;
  onClose: () => void;
}

const LiveGameReport: React.FC<Props> = ({ game, onClose }) => {
  const { myTeamName, myTeamLogo, activeCategory } = useApp();

  const teamScore = game.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const oppScore = (game.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
  const diff = teamScore - oppScore;

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

  const fgPct = fga > 0 ? Math.round((fgm / fga) * 100) : 0;
  const twoPct = twoPtA > 0 ? Math.round((twoPtM / twoPtA) * 100) : 0;
  const threePct = threePtA > 0 ? Math.round((threePtM / threePtA) * 100) : 0;
  const ftPct = ftA > 0 ? Math.round((ftM / ftA) * 100) : 0;

  // Advanced metrics
  const eFG = fga > 0 ? Math.round(((fgm - threePtM + 0.5 * threePtM + threePtM) / fga) * 100) : 0;
  const eFGReal = fga > 0 ? Math.round(((twoPtM + 1.5 * threePtM) / fga) * 100) : 0;
  const tsDenom = 2 * (fga + 0.44 * ftA);
  const tsPercent = tsDenom > 0 ? Math.round((teamScore / tsDenom) * 100) : 0;

  const totalReb = allActions.filter(a => isRebound(a.type)).length;
  const offReb = allActions.filter(a => a.type === 'offensive_rebound').length;
  const defReb = allActions.filter(a => a.type === 'defensive_rebound').length;
  const legacyReb = allActions.filter(a => a.type === 'rebound').length;
  const totalAst = allActions.filter(a => a.type === 'assist').length;
  const totalStl = allActions.filter(a => a.type === 'steal').length;
  const totalTov = allActions.filter(a => a.type === 'turnover').length;
  const totalFouls = allActions.filter(a => a.type === 'foul').length;

  // Per-player stats
  const playerStats = game.roster.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const pts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const p2A = shots.filter(s => s.points === 2).length;
    const p2M = shots.filter(s => s.points === 2 && s.made).length;
    const p3A = shots.filter(s => s.points === 3).length;
    const p3M = shots.filter(s => s.points === 3 && s.made).length;
    const pFtA = shots.filter(s => s.points === 1).length;
    const pFtM = shots.filter(s => s.points === 1 && s.made).length;
    const pActions = allActions.filter(a => a.playerId === p.id);
    const oReb = pActions.filter(a => a.type === 'offensive_rebound').length;
    const dReb = pActions.filter(a => a.type === 'defensive_rebound' || a.type === 'rebound').length;
    const reb = oReb + dReb;
    const ast = pActions.filter(a => a.type === 'assist').length;
    const stl = pActions.filter(a => a.type === 'steal').length;
    const tov = pActions.filter(a => a.type === 'turnover').length;
    const fouls = pActions.filter(a => a.type === 'foul').length;
    const fg = shots.filter(s => s.points >= 2);
    const fgmP = fg.filter(s => s.made).length;
    return { ...p, pts, reb, oReb, dReb, ast, stl, tov, fouls, fgm: fgmP, fga: fg.length, p2M, p2A, p3M, p3A, pFtM, pFtA };
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

  const pctColor = (pct: number, good = 45) =>
    pct >= good ? 'text-emerald-400' : pct >= good * 0.7 ? 'text-amber-400' : 'text-red-400';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-border">
        {/* Scoreboard header */}
        <div className="bg-primary rounded-t-lg px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-primary-foreground/50 uppercase tracking-widest">
              📊 Informe — {QUARTER_LABELS[game.currentQuarter]}
            </p>
          </div>
          <div className="flex items-center justify-center gap-5">
            <div className="text-center flex-1">
              <p className="text-[10px] text-primary-foreground/60 font-bold uppercase tracking-wider truncate">{myTeamName || 'Local'}</p>
              <p className="text-4xl font-black text-primary-foreground leading-none mt-1">{teamScore}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-primary-foreground/30 font-black text-xs">VS</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-emerald-500/20 text-emerald-300' : diff < 0 ? 'bg-red-500/20 text-red-300' : 'bg-primary-foreground/10 text-primary-foreground/50'}`}>
                {diff > 0 ? '+' : ''}{diff}
              </span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-primary-foreground/60 font-bold uppercase tracking-wider truncate">{game.opponentName}</p>
              <p className="text-4xl font-black text-primary-foreground/70 leading-none mt-1">{oppScore}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3 mt-3">
          {/* Shooting efficiency bars */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">🎯 Eficiencia de Tiro</p>
            {[
              { label: 'TC', made: fgm, att: fga, pct: fgPct },
              { label: '2PT', made: twoPtM, att: twoPtA, pct: twoPct },
              { label: '3PT', made: threePtM, att: threePtA, pct: threePct },
              { label: 'TL', made: ftM, att: ftA, pct: ftPct },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-7 text-right">{s.label}</span>
                <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-primary/80 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(s.pct, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-foreground">
                    {s.made}/{s.att}
                  </span>
                </div>
                <span className={`text-xs font-black w-10 text-right ${pctColor(s.pct)}`}>{s.pct}%</span>
              </div>
            ))}
          </div>

          {/* Advanced metrics + team stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'eFG%', value: `${eFGReal}%`, color: pctColor(eFGReal) },
              { label: 'TS%', value: `${tsPercent}%`, color: pctColor(tsPercent, 50) },
              { label: 'AST/TOV', value: totalTov > 0 ? (totalAst / totalTov).toFixed(1) : `${totalAst}:0`, color: 'text-foreground' },
              { label: 'PF', value: `${totalFouls}`, color: totalFouls >= 15 ? 'text-red-400' : 'text-foreground' },
            ].map(m => (
              <Card key={m.label} className="border-border/40 bg-muted/30">
                <CardContent className="p-2 text-center">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{m.label}</p>
                  <p className={`text-lg font-black leading-tight mt-0.5 ${m.color}`}>{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Team activity row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'REB', value: totalReb, sub: `RO:${offReb} RD:${defReb + legacyReb}` },
              { label: 'AST', value: totalAst, sub: null },
              { label: 'STL', value: totalStl, sub: null },
              { label: 'TOV', value: totalTov, sub: null },
            ].map(s => (
              <Card key={s.label} className="border-border/40 bg-muted/30">
                <CardContent className="p-2 text-center">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-lg font-black text-foreground leading-tight mt-0.5">{s.value}</p>
                  {s.sub && <p className="text-[8px] text-muted-foreground font-semibold">{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Box Score table */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">📋 Box Score</p>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-1.5 px-2 font-bold text-muted-foreground sticky left-0 bg-muted/50 z-10">JUG</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">PTS</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">2PT</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">3PT</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">TL</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">REB</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">AST</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">STL</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">TOV</th>
                    <th className="text-center py-1.5 px-1 font-bold text-muted-foreground">PF</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((p, i) => (
                    <tr key={p.id} className={`border-t border-border/20 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                      <td className="py-1.5 px-2 font-bold truncate max-w-[75px] sticky left-0 z-10" style={{ backgroundColor: 'inherit' }}>
                        {p.name.split(' ')[0]}
                      </td>
                      <td className="text-center font-black text-primary">{p.pts}</td>
                      <td className="text-center">{p.p2M}/{p.p2A}</td>
                      <td className="text-center">{p.p3M}/{p.p3A}</td>
                      <td className="text-center">{p.pFtM}/{p.pFtA}</td>
                      <td className="text-center font-bold">{p.reb}</td>
                      <td className="text-center">{p.ast}</td>
                      <td className="text-center">{p.stl}</td>
                      <td className="text-center">{p.tov}</td>
                      <td className="text-center">{p.fouls}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-primary/30 bg-primary/5 font-black">
                    <td className="py-1.5 px-2 sticky left-0 z-10 bg-primary/5">TOTAL</td>
                    <td className="text-center text-primary">{teamScore}</td>
                    <td className="text-center">{twoPtM}/{twoPtA}</td>
                    <td className="text-center">{threePtM}/{threePtA}</td>
                    <td className="text-center">{ftM}/{ftA}</td>
                    <td className="text-center">{totalReb}</td>
                    <td className="text-center">{totalAst}</td>
                    <td className="text-center">{totalStl}</td>
                    <td className="text-center">{totalTov}</td>
                    <td className="text-center">{totalFouls}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Glossary */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="underline underline-offset-2">¿Qué significa cada sigla?</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground bg-muted/30 rounded-lg p-2">
                {[
                  ['PTS', 'Puntos'], ['TC', 'Tiros de Campo'], ['2PT', 'Dobles'], ['3PT', 'Triples'],
                  ['TL', 'Tiros Libres'], ['REB', 'Rebotes Totales'], ['AST', 'Asistencias'], ['STL', 'Robos'],
                  ['TOV', 'Pérdidas'], ['PF', 'Faltas'], ['eFG%', 'Eficiencia ponderada'], ['TS%', 'Eficiencia real'],
                ].map(([s, d]) => (
                  <div key={s} className="flex gap-1">
                    <span className="font-bold text-primary shrink-0">{s}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex gap-2">
              <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="flex-1 gap-1.5">
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button onClick={handleShareWhatsApp} size="sm" className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Share2 className="w-4 h-4" /> WhatsApp
              </Button>
            </div>
            {isHalftimeAvailable(game) && (
              <Button
                onClick={() => shareHalftimeWhatsApp(game, { myTeamName })}
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-amber-500/60 text-amber-600 hover:bg-amber-500 hover:text-white dark:text-amber-400"
              >
                <Clock className="w-4 h-4" /> 📊 Compartir Medio Tiempo (Q1+Q2)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveGameReport;
