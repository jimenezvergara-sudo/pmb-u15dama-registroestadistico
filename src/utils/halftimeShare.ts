import { Game } from '@/types/basketball';

const isRebound = (type: string) =>
  type === 'rebound' || type === 'offensive_rebound' || type === 'defensive_rebound';

const HALFTIME_QUARTERS = new Set(['Q1', 'Q2']);

export interface HalftimeShareOptions {
  myTeamName?: string;
}

/**
 * Build the WhatsApp halftime summary message.
 * Includes: scoreboard (Q1+Q2 only), per-quarter parcial, shooting %, team REB/AST/STL,
 * and the top 3 scorers up to halftime.
 */
export function buildHalftimeMessage(game: Game, opts: HalftimeShareOptions = {}): string {
  const { myTeamName } = opts;

  const halfShots = game.shots.filter(s => HALFTIME_QUARTERS.has(s.quarterId));
  const halfActions = (game.actions || []).filter(a => HALFTIME_QUARTERS.has(a.quarterId));
  const halfOpp = (game.opponentScores || []).filter(s => HALFTIME_QUARTERS.has(s.quarterId));

  const teamScore = halfShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const oppScore = halfOpp.reduce((sum, s) => sum + s.points, 0);

  const q1Team = halfShots.filter(s => s.made && s.quarterId === 'Q1').reduce((a, s) => a + s.points, 0);
  const q2Team = halfShots.filter(s => s.made && s.quarterId === 'Q2').reduce((a, s) => a + s.points, 0);
  const q1Opp = halfOpp.filter(s => s.quarterId === 'Q1').reduce((a, s) => a + s.points, 0);
  const q2Opp = halfOpp.filter(s => s.quarterId === 'Q2').reduce((a, s) => a + s.points, 0);

  const twoA = halfShots.filter(s => s.points === 2).length;
  const twoM = halfShots.filter(s => s.points === 2 && s.made).length;
  const threeA = halfShots.filter(s => s.points === 3).length;
  const threeM = halfShots.filter(s => s.points === 3 && s.made).length;
  const ftA = halfShots.filter(s => s.points === 1).length;
  const ftM = halfShots.filter(s => s.points === 1 && s.made).length;

  const pct = (m: number, a: number) => (a > 0 ? Math.round((m / a) * 100) : 0);

  const reb = halfActions.filter(a => isRebound(a.type)).length;
  const ast = halfActions.filter(a => a.type === 'assist').length;
  const stl = halfActions.filter(a => a.type === 'steal').length;

  const topScorers = game.roster
    .map(p => ({
      ...p,
      pts: halfShots
        .filter(s => s.playerId === p.id && s.made)
        .reduce((sum, s) => sum + s.points, 0),
    }))
    .filter(p => p.pts > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  const teamLabel = myTeamName || 'Mi Equipo';
  const lines = [
    `📊 *Medio Tiempo — BASQUEST+*`,
    `${teamLabel} *${teamScore}* vs *${oppScore}* ${game.opponentName}`,
    `Parcial: Q1 ${q1Team}-${q1Opp} | Q2 ${q2Team}-${q2Opp}`,
    ``,
    `🎯 *Tiros (1ª mitad)*`,
    `2PT: ${twoM}/${twoA} (${pct(twoM, twoA)}%)`,
    `3PT: ${threeM}/${threeA} (${pct(threeM, threeA)}%)`,
    `TL: ${ftM}/${ftA} (${pct(ftM, ftA)}%)`,
    ``,
    `📈 *Equipo*: REB ${reb} | AST ${ast} | STL ${stl}`,
  ];

  if (topScorers.length > 0) {
    lines.push('', '🏀 *Top anotadoras*');
    topScorers.forEach((p, i) => {
      const medal = ['🥇', '🥈', '🥉'][i];
      lines.push(`${medal} #${p.number} ${p.name}: ${p.pts} pts`);
    });
  }

  lines.push('', '_Generado por BASQUEST+ — Inteligencia Deportiva_');
  return lines.join('\n');
}

export function shareHalftimeWhatsApp(game: Game, opts: HalftimeShareOptions = {}) {
  const text = buildHalftimeMessage(game, opts);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

/** True once Q2 has happened (i.e. we're at Q3 or later, or in Q2 itself). */
export function isHalftimeAvailable(game: Game): boolean {
  if (game.currentQuarter === 'Q1') return false;
  // Available from Q2 onwards (covers Q2, Q3, Q4, OTs)
  return true;
}
