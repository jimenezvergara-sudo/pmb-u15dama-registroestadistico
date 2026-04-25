import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Game, Player, QuarterId, QUARTER_LABELS } from '@/types/basketball';

interface ReportOptions {
  teamName: string;
  teamLogo: string;
  appLogo: string;
  category: string;
  filterLabel: string;
  gameLabel: string;
  quarterFilter: QuarterId | 'ALL';
  playerFilter: string;
  premiumBannerUrl?: string;
  premiumBannerLink?: string;
}

interface BoxScoreRow {
  name: string; number: number; pts: number;
  fgm: number; fga: number; fgPct: number;
  twoM: number; twoA: number; twoPct: number;
  threeM: number; threeA: number; threePct: number;
  ftM: number; ftA: number; ftPct: number;
  reb: number; oReb: number; dReb: number; ast: number; stl: number; tov: number; pf: number;
  eFG: number; ts: number;
}

// ── Brand Palette (from CSS tokens) ──
const PURPLE: [number, number, number] = [122, 38, 225];
const PURPLE_LIGHT: [number, number, number] = [165, 100, 240];
const PURPLE_DARK: [number, number, number] = [60, 15, 120];
const CYAN: [number, number, number] = [50, 217, 255];
const GOLD: [number, number, number] = [255, 195, 0];
const SUCCESS: [number, number, number] = [16, 185, 129];
const DESTRUCTIVE: [number, number, number] = [217, 72, 72];
const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [25, 15, 45];
const BODY_BG: [number, number, number] = [245, 243, 250];
const CARD_BG: [number, number, number] = [237, 234, 245];
const MUTED: [number, number, number] = [140, 130, 160];
const TABLE_ALT: [number, number, number] = [248, 245, 255];
const TABLE_BORDER: [number, number, number] = [215, 210, 230];

export async function generatePdfReport(
  games: Game[],
  filteredGames: Game[],
  allPlayers: Player[],
  options: ReportOptions
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 0;

  // ═══════════════ HELPERS ═══════════════

  const drawPageBg = () => {
    doc.setFillColor(...BODY_BG);
    doc.rect(0, 0, W, H, 'F');
  };

  const drawHeader = () => {
    doc.setFillColor(...PURPLE_DARK);
    doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 36, 'F');

    doc.setFillColor(...GOLD);
    doc.rect(0, 36, W, 1.5, 'F');

    doc.setFillColor(255, 255, 255);
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.circle(W - 30, 10, 35, 'F');
    doc.circle(W - 60, 25, 20, 'F');
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setTextColor(...WHITE);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BASQUEST+', M, 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CYAN);
    doc.text('Inteligencia Deportiva', M, 23);

    if (options.teamName) {
      const teamText = options.teamName.toUpperCase();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const tw = doc.getTextWidth(teamText);
      const capsuleW = tw + 10;
      doc.setFillColor(...GOLD);
      doc.roundedRect(M, 27, capsuleW, 7, 3.5, 3.5, 'F');
      doc.setTextColor(...NEAR_BLACK);
      doc.text(teamText, M + 5, 32.2);
    }

    if (options.appLogo) {
      try { doc.addImage(options.appLogo, 'PNG', W - M - 20, 4, 20, 20); } catch { /* skip */ }
    }
    if (options.teamLogo) {
      try {
        doc.setFillColor(...WHITE);
        doc.circle(W - M - 10, 31, 7, 'F');
        doc.addImage(options.teamLogo, 'PNG', W - M - 16, 25, 12, 12);
      } catch { /* skip */ }
    }

    y = 46;
  };

  const drawFooter = (pageNum: number) => {
    doc.setFillColor(...PURPLE_DARK);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, H - 12, W, 0.8, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CYAN);
    doc.text('BASQUEST+', M, H - 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 175, 200);
    doc.text(`${options.category} · ${new Date().toLocaleDateString()}`, M + 22, H - 4);
    doc.text(`Página ${pageNum}`, W - M, H - 4, { align: 'right' });
  };

  const sectionTitle = (title: string) => {
    doc.setFillColor(...PURPLE);
    doc.roundedRect(M, y, 3, 7, 1.5, 1.5, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEAR_BLACK);
    doc.text(title, M + 6, y + 5.5);
    y += 10;
  };

  // ═══════════════ PAGE 1: Overview ═══════════════
  drawPageBg();
  drawHeader();
  let pageNum = 1;

  // Filter badge
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(M, y, W - M * 2, 7, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(`${options.filterLabel}  ·  ${options.gameLabel}`, M + 4, y + 5);
  y += 12;

  // ── Team summary cards ──
  const totalGames = filteredGames.length;
  const wins = filteredGames.filter(g => {
    const team = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const opp = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
    return team > opp;
  }).length;
  const losses = totalGames - wins;
  const totalTeamPts = filteredGames.reduce((sum, g) => sum + g.shots.filter(s => s.made).reduce((a, s) => a + s.points, 0), 0);
  const totalOppPts = filteredGames.reduce((sum, g) => sum + (g.opponentScores || []).reduce((a, s) => a + s.points, 0), 0);
  const ppg = totalGames > 0 ? (totalTeamPts / totalGames).toFixed(1) : '0';
  const oppPpg = totalGames > 0 ? (totalOppPts / totalGames).toFixed(1) : '0';

  const cardW = (W - M * 2 - 8) / 3;
  const cards = [
    { label: 'RECORD', value: `${wins}-${losses}`, color: GOLD },
    { label: 'PTS/PARTIDO', value: ppg, color: CYAN },
    { label: 'PTS/CONTRA', value: oppPpg, color: PURPLE_LIGHT },
  ];
  cards.forEach((c, i) => {
    const cx = M + i * (cardW + 4);
    doc.setFillColor(...WHITE);
    doc.roundedRect(cx, y, cardW, 26, 4, 4, 'F');
    doc.setFillColor(...c.color);
    doc.roundedRect(cx + 8, y, cardW - 16, 2, 1, 1, 'F');
    // Colored dot instead of emoji
    doc.setFillColor(...c.color);
    doc.circle(cx + cardW / 2, y + 7, 2.5, 'F');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, cx + cardW / 2, y + 14, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(...NEAR_BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text(c.value, cx + cardW / 2, y + 23, { align: 'center' });
  });
  y += 32;

  // ── Productivity cards ──
  sectionTitle('Productividad del Equipo');

  const allShotsGlobal = filteredGames.flatMap(g => g.shots);
  const allActionsGlobal = filteredGames.flatMap(g => g.actions || []);
  const totalShotsCount = allShotsGlobal.length;
  const madeCount = allShotsGlobal.filter(s => s.made).length;
  const pctPossession = totalShotsCount > 0 ? Math.round((madeCount / totalShotsCount) * 100) : 0;
  const dblAtt = allShotsGlobal.filter(s => s.points === 2).length;
  const dblMade = allShotsGlobal.filter(s => s.points === 2 && s.made).length;
  const pctDbl = dblAtt > 0 ? Math.round((dblMade / dblAtt) * 100) : 0;
  const tplAtt = allShotsGlobal.filter(s => s.points === 3).length;
  const tplMade = allShotsGlobal.filter(s => s.points === 3 && s.made).length;
  const pctTpl = tplAtt > 0 ? Math.round((tplMade / tplAtt) * 100) : 0;
  const ftAtt2 = allShotsGlobal.filter(s => s.points === 1).length;
  const ftMade2 = allShotsGlobal.filter(s => s.points === 1 && s.made).length;
  const pctFt = ftAtt2 > 0 ? Math.round((ftMade2 / ftAtt2) * 100) : 0;
  const fga2 = allShotsGlobal.filter(s => s.points >= 2).length;
  const eFgVal = fga2 > 0 ? Math.round(((dblMade + 0.5 * tplMade) / fga2) * 100) : 0;
  const ptsTot = allShotsGlobal.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const tsDen = 2 * (fga2 + 0.44 * ftAtt2);
  const tsVal = tsDen > 0 ? Math.round((ptsTot / tsDen) * 100) : 0;

  // Team-level action totals
  const totalRebGlobal = allActionsGlobal.filter(a => a.type === 'rebound' || a.type === 'offensive_rebound' || a.type === 'defensive_rebound').length;
  const totalAstGlobal = allActionsGlobal.filter(a => a.type === 'assist').length;
  const totalStlGlobal = allActionsGlobal.filter(a => a.type === 'steal').length;
  const totalTovGlobal = allActionsGlobal.filter(a => a.type === 'turnover').length;

  const prodCards = [
    { label: 'EF. POSESION', value: `${pctPossession}%`, color: GOLD },
    { label: 'eFG%', value: `${eFgVal}%`, color: CYAN },
    { label: 'TS%', value: `${tsVal}%`, color: PURPLE_LIGHT },
    { label: 'EF. DOBLES', value: `${pctDbl}%`, color: GOLD },
    { label: 'EF. TL', value: `${pctFt}%`, color: CYAN },
    { label: 'EF. TRIPLES', value: `${pctTpl}%`, color: PURPLE_LIGHT },
    { label: 'REBOTES', value: `${totalRebGlobal}`, color: SUCCESS },
    { label: 'ASISTENCIAS', value: `${totalAstGlobal}`, color: CYAN },
    { label: 'ROBOS / PB', value: `${totalStlGlobal} / ${totalTovGlobal}`, color: GOLD },
  ];

  const pCardW = (W - M * 2 - 10) / 3;
  prodCards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = M + col * (pCardW + 5);
    const cy = y + row * 22;
    doc.setFillColor(...WHITE);
    doc.roundedRect(cx, cy, pCardW, 19, 3, 3, 'F');
    doc.setFillColor(...c.color);
    doc.roundedRect(cx + 6, cy, pCardW - 12, 1.5, 0.7, 0.7, 'F');
    // Colored dot instead of emoji
    doc.setFillColor(...c.color);
    doc.circle(cx + 5, cy + 6, 1.8, 'F');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, cx + pCardW / 2 + 3, cy + 8, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(...NEAR_BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text(c.value, cx + pCardW / 2, cy + 16, { align: 'center' });
  });
  y += Math.ceil(prodCards.length / 3) * 22 + 6;

  // ── Season leaders ──
  const allShots = filteredGames.flatMap(g => g.shots);
  const allActions = filteredGames.flatMap(g => g.actions || []);
  const rosterMap = new Map<string, Player>();
  filteredGames.forEach(g => g.roster.forEach(p => rosterMap.set(p.id, p)));
  const roster = Array.from(rosterMap.values());

  // Volume threshold for efficiency leaders (20% of max attempts)
  const maxFga = Math.max(...roster.map(p => allShots.filter(s => s.playerId === p.id && s.points >= 2).length), 1);
  const volThreshold = Math.max(Math.round(maxFga * 0.2), 1);

  const playerStats = roster.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const pts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const pActions = allActions.filter(a => a.playerId === p.id);
    const oReb = pActions.filter(a => a.type === 'offensive_rebound').length;
    const dReb = pActions.filter(a => a.type === 'defensive_rebound' || a.type === 'rebound').length;
    const fgaP = shots.filter(s => s.points >= 2).length;
    const twoM = shots.filter(s => s.points === 2 && s.made).length;
    const threeM = shots.filter(s => s.points === 3 && s.made).length;
    const ftA = shots.filter(s => s.points === 1).length;
    const ftM = shots.filter(s => s.points === 1 && s.made).length;
    const eFGp = fgaP > 0 ? Math.round(((twoM + 0.5 * threeM) / fgaP) * 100) : 0;
    const tsDenP = 2 * (fgaP + 0.44 * ftA);
    const tsP = tsDenP > 0 ? Math.round((pts / tsDenP) * 100) : 0;
    return {
      ...p, pts, oReb, dReb,
      reb: oReb + dReb,
      triplesMade: threeM,
      triplesAtt: shots.filter(s => s.points === 3).length,
      doblesMade: twoM,
      doblesAtt: shots.filter(s => s.points === 2).length,
      ftMade: ftM, ftAtt: ftA, fgaP,
      ast: pActions.filter(a => a.type === 'assist').length,
      stl: pActions.filter(a => a.type === 'steal').length,
      tov: pActions.filter(a => a.type === 'turnover').length,
      eFG: eFGp, ts: tsP,
    };
  });

  const topScorer = [...playerStats].sort((a, b) => b.pts - a.pts)[0];
  const topThrees = [...playerStats].filter(p => p.triplesMade > 0).sort((a, b) => b.triplesMade - a.triplesMade)[0];
  const topDoubles = [...playerStats].filter(p => p.doblesMade > 0).sort((a, b) => b.doblesMade - a.doblesMade)[0];
  const topReb = [...playerStats].filter(p => p.reb > 0).sort((a, b) => b.reb - a.reb)[0];
  const topOReb = [...playerStats].filter(p => p.oReb > 0).sort((a, b) => b.oReb - a.oReb)[0];
  const topDReb = [...playerStats].filter(p => p.dReb > 0).sort((a, b) => b.dReb - a.dReb)[0];
  const topAst = [...playerStats].filter(p => p.ast > 0).sort((a, b) => b.ast - a.ast)[0];
  const topStl = [...playerStats].filter(p => p.stl > 0).sort((a, b) => b.stl - a.stl)[0];
  const topEfg = [...playerStats].filter(p => p.fgaP >= volThreshold).sort((a, b) => b.eFG - a.eFG)[0];
  const topTs = [...playerStats].filter(p => p.fgaP >= volThreshold).sort((a, b) => b.ts - a.ts)[0];

  sectionTitle('Lideres de Temporada');

  const leaderItems = [
    { label: 'PUNTOS', player: topScorer, value: topScorer?.pts, accent: GOLD },
    { label: 'TRIPLES', player: topThrees, value: topThrees?.triplesMade, accent: CYAN },
    { label: 'DOBLES', player: topDoubles, value: topDoubles?.doblesMade, accent: PURPLE_LIGHT },
    { label: 'REBOTES', player: topReb, value: topReb?.reb, accent: SUCCESS },
    { label: 'REB.OFENSIVO', player: topOReb, value: topOReb?.oReb, accent: GOLD },
    { label: 'REB.DEFENSIVO', player: topDReb, value: topDReb?.dReb, accent: CYAN },
    { label: 'ASISTENCIAS', player: topAst, value: topAst?.ast, accent: CYAN },
    { label: 'ROBOS', player: topStl, value: topStl?.stl, accent: GOLD },
    { label: 'eFG%', player: topEfg, value: topEfg ? `${topEfg.eFG}%` : undefined, accent: PURPLE_LIGHT },
    { label: 'TS%', player: topTs, value: topTs ? `${topTs.ts}%` : undefined, accent: SUCCESS },
  ];

  const lColW = (W - M * 2 - 8) / 3;
  leaderItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = M + col * (lColW + 4);
    const ly = y + row * 22;

    // Check page overflow
    if (ly + 19 > H - 16) return;

    doc.setFillColor(...WHITE);
    doc.roundedRect(lx, ly, lColW, 19, 3, 3, 'F');
    doc.setFillColor(...item.accent);
    doc.roundedRect(lx, ly + 3, 2.5, 13, 1.2, 1.2, 'F');

    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, lx + 6, ly + 6);

    if (item.player) {
      doc.setFontSize(8);
      doc.setTextColor(...NEAR_BLACK);
      doc.setFont('helvetica', 'bold');
      doc.text(filteredGames.length === 1 ? `#${item.player.number} ${item.player.name}` : item.player.name, lx + 6, ly + 12.5);
      const valStr = `${item.value}`;
      const valW = Math.max(doc.getTextWidth(valStr) + 5, 10);
      doc.setFillColor(...item.accent);
      doc.roundedRect(lx + lColW - valW - 3, ly + 8, valW, 8, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...(item.accent === GOLD ? NEAR_BLACK : WHITE));
      doc.text(valStr, lx + lColW - valW / 2 - 0.5, ly + 14, { align: 'center' });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text('Sin datos', lx + 6, ly + 13);
    }
  });
  y += Math.ceil(leaderItems.length / 3) * 22 + 6;

  drawFooter(pageNum);

  // ═══════════════ PAGE 2: Results + Box Score ═══════════════
  doc.addPage();
  drawPageBg();
  pageNum++;
  drawHeader();

  // ── Results table ──
  if (filteredGames.length > 0) {
    sectionTitle('Resultados');

    const gameRows = filteredGames.map(g => {
      const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
      const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
      const won = teamPts > oppPts;
      const legLabel = g.leg ? ` (${g.leg === 'ida' ? 'Ida' : 'Vuelta'})` : '';
      const homeLabel = g.isHome === true ? ' (L)' : g.isHome === false ? ' (V)' : '';
      const teamCol = `${options.teamName || 'BASQUEST+'}${homeLabel}`;
      const oppCol = `${g.opponentName}${g.isHome === true ? ' (V)' : g.isHome === false ? ' (L)' : ''}${legLabel}`;
      return [new Date(g.date).toLocaleDateString(), teamCol, oppCol, `${teamPts} - ${oppPts}`, won ? 'V' : 'D'];
    });
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Mi Equipo', 'Rival', 'Score', '']],
      body: gameRows,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', lineColor: TABLE_BORDER, lineWidth: 0.3 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: { 4: { halign: 'center', fontStyle: 'bold', cellWidth: 12 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = val === 'V' ? [...SUCCESS] : [...DESTRUCTIVE];
        }
      },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Box Score ──
  sectionTitle('Box Score');

  if (options.quarterFilter !== 'ALL') {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`Filtro de cuarto: ${QUARTER_LABELS[options.quarterFilter]}`, M + 6, y - 4);
  }

  const filteredShots = allShots.filter(s => {
    if (options.quarterFilter !== 'ALL' && s.quarterId !== options.quarterFilter) return false;
    if (options.playerFilter !== 'ALL' && s.playerId !== options.playerFilter) return false;
    return true;
  });

  const filteredActions = allActions.filter(a => {
    if (options.quarterFilter !== 'ALL' && a.quarterId !== options.quarterFilter) return false;
    if (options.playerFilter !== 'ALL' && a.playerId !== options.playerFilter) return false;
    return true;
  });

  const boxRows: BoxScoreRow[] = roster.map(player => {
    const pShots = filteredShots.filter(s => s.playerId === player.id);
    const fieldShots = pShots.filter(s => s.points >= 2);
    const fga = fieldShots.length;
    const fgm = fieldShots.filter(s => s.made).length;
    const pts = pShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const twoA = pShots.filter(s => s.points === 2).length;
    const twoM = pShots.filter(s => s.points === 2 && s.made).length;
    const threeA = pShots.filter(s => s.points === 3).length;
    const threeM = pShots.filter(s => s.points === 3 && s.made).length;
    const ftA = pShots.filter(s => s.points === 1).length;
    const ftM = pShots.filter(s => s.points === 1 && s.made).length;
    const pActions = filteredActions.filter(a => a.playerId === player.id);
    const oReb = pActions.filter(a => a.type === 'offensive_rebound').length;
    const dReb = pActions.filter(a => a.type === 'defensive_rebound' || a.type === 'rebound').length;
    const eFG = fga > 0 ? Math.round(((twoM + 0.5 * threeM) / fga) * 100) : 0;
    const tsDenom = 2 * (fga + 0.44 * ftA);
    const ts = tsDenom > 0 ? Math.round((pts / tsDenom) * 100) : 0;
    return {
      name: player.name, number: player.number, pts, fgm, fga,
      fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
      twoM, twoA, twoPct: twoA > 0 ? Math.round((twoM / twoA) * 100) : 0,
      threeM, threeA, threePct: threeA > 0 ? Math.round((threeM / threeA) * 100) : 0,
      ftM, ftA, ftPct: ftA > 0 ? Math.round((ftM / ftA) * 100) : 0,
      oReb, dReb,
      reb: oReb + dReb,
      ast: pActions.filter(a => a.type === 'assist').length,
      stl: pActions.filter(a => a.type === 'steal').length,
      tov: pActions.filter(a => a.type === 'turnover').length,
      pf: pActions.filter(a => a.type === 'foul').length,
      eFG, ts,
    };
  }).sort((a, b) => b.pts - a.pts);

  const isSingleGame = filteredGames.length === 1;

  // Helper: render the box score body in chunks of 12 across multiple pages if needed
  const renderBoxScoreChunk = (rows: BoxScoreRow[], startY: number) => {
    const tableBody = rows.map(r => [
      isSingleGame ? `#${r.number} ${r.name}` : r.name,
      r.fga > 0 ? `${r.fgm}/${r.fga} (${r.fgPct}%)` : '—',
      r.twoA > 0 ? `${r.twoM}/${r.twoA} (${r.twoPct}%)` : '—',
      r.threeA > 0 ? `${r.threeM}/${r.threeA} (${r.threePct}%)` : '—',
      r.ftA > 0 ? `${r.ftM}/${r.ftA} (${r.ftPct}%)` : '—',
      `${r.pts}`,
      `${r.oReb}`, `${r.dReb}`, `${r.reb}`,
      `${r.ast}`, `${r.stl}`, `${r.tov}`, `${r.pf}`,
      r.fga > 0 ? `${r.eFG}%` : '—',
      r.fga > 0 ? `${r.ts}%` : '—',
    ]);

    autoTable(doc, {
      startY,
      head: [['Jugadora', 'TC', '2PT', '3PT', 'TL', 'PTS', 'RO', 'RD', 'REB', 'AST', 'STL', 'TOV', 'PF', 'eFG%', 'TS%']],
      body: tableBody,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 2.2, font: 'helvetica', lineColor: TABLE_BORDER, lineWidth: 0.2, valign: 'middle' },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: TABLE_ALT },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold', halign: 'left' },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { fontStyle: 'bold', halign: 'center', fillColor: [245, 240, 255], cellWidth: 11 },
        6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' },
        9: { halign: 'center' }, 10: { halign: 'center' }, 11: { halign: 'center' }, 12: { halign: 'center' },
        13: { halign: 'center' }, 14: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body') {
          const ci = data.column.index;
          const raw = String(data.cell.raw ?? '');
          const pctMatch = raw.match(/\((\d+)%\)/);
          // Color-code shooting cells (TC, 2PT, 3PT, TL) by their %
          if ([1, 2, 3, 4].includes(ci) && pctMatch) {
            const v = parseInt(pctMatch[1]);
            const isFt = ci === 4;
            const isThree = ci === 3;
            if (isFt) {
              if (v >= 75) data.cell.styles.textColor = [...SUCCESS];
              else if (v < 50 && v > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
            } else if (isThree) {
              if (v >= 40) data.cell.styles.textColor = [...SUCCESS];
              else if (v < 25 && v > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
            } else {
              if (v >= 50) data.cell.styles.textColor = [...SUCCESS];
              else if (v < 30 && v > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
            }
          }
          // eFG% / TS%
          if ([13, 14].includes(ci)) {
            const v = parseInt(raw);
            if (!isNaN(v)) {
              if (v >= 55) data.cell.styles.textColor = [...SUCCESS];
              else if (v < 40 && v > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
            }
          }
          // TOV highlight
          if (ci === 11 && parseInt(raw) >= 4) data.cell.styles.textColor = [...DESTRUCTIVE];
          // PTS column always purple bold
          if (ci === 5) data.cell.styles.textColor = [...PURPLE];
        }
      },
    });
  };

  // Split into chunks of 12 — one chunk per page if needed
  const chunkSize = 12;
  for (let i = 0; i < boxRows.length; i += chunkSize) {
    if (i > 0) {
      drawFooter(pageNum);
      doc.addPage();
      drawPageBg();
      pageNum++;
      drawHeader();
      sectionTitle(`Box Score (cont. ${Math.floor(i / chunkSize) + 1})`);
    }
    renderBoxScoreChunk(boxRows.slice(i, i + chunkSize), y);
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Team totals ──
  const tt = boxRows.reduce((a, r) => ({
    pts: a.pts + r.pts, fgm: a.fgm + r.fgm, fga: a.fga + r.fga,
    twoM: a.twoM + r.twoM, twoA: a.twoA + r.twoA,
    threeM: a.threeM + r.threeM, threeA: a.threeA + r.threeA,
    ftM: a.ftM + r.ftM, ftA: a.ftA + r.ftA,
    reb: a.reb + r.reb, oReb: a.oReb + r.oReb, dReb: a.dReb + r.dReb,
    ast: a.ast + r.ast, stl: a.stl + r.stl, tov: a.tov + r.tov, pf: a.pf + r.pf,
  }), { pts: 0, fgm: 0, fga: 0, twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0, reb: 0, oReb: 0, dReb: 0, ast: 0, stl: 0, tov: 0, pf: 0 });

  // Totals bar
  if (y + 18 < H - 16) {
    doc.setFillColor(...PURPLE_DARK);
    doc.roundedRect(M, y, W - M * 2, 18, 4, 4, 'F');
    const totItems = [
      { l: 'PTS', v: `${tt.pts}`, c: GOLD },
      { l: 'TC', v: `${tt.fga > 0 ? Math.round((tt.fgm / tt.fga) * 100) : 0}%`, c: WHITE },
      { l: '2PT', v: `${tt.twoA > 0 ? Math.round((tt.twoM / tt.twoA) * 100) : 0}%`, c: WHITE },
      { l: '3PT', v: `${tt.threeA > 0 ? Math.round((tt.threeM / tt.threeA) * 100) : 0}%`, c: CYAN },
      { l: 'TL', v: `${tt.ftA > 0 ? Math.round((tt.ftM / tt.ftA) * 100) : 0}%`, c: WHITE },
      { l: 'REB', v: `${tt.reb}`, c: WHITE },
      { l: 'AST', v: `${tt.ast}`, c: WHITE },
      { l: 'STL', v: `${tt.stl}`, c: WHITE },
      { l: 'TOV', v: `${tt.tov}`, c: DESTRUCTIVE },
    ];
    const totW = (W - M * 2) / totItems.length;
    totItems.forEach((t, i) => {
      const tx = M + i * totW;
      doc.setFontSize(5);
      doc.setTextColor(180, 170, 210);
      doc.setFont('helvetica', 'bold');
      doc.text(t.l, tx + totW / 2, y + 6, { align: 'center' });
      doc.setFontSize(11);
      doc.setTextColor(...t.c);
      doc.text(t.v, tx + totW / 2, y + 14, { align: 'center' });
    });
  }

  drawFooter(pageNum);

  // ═══════════════ PAGE 3: Charts ═══════════════
  const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];
  const activeQuarters = ALL_QUARTERS.filter(q => allShots.some(s => s.quarterId === q));

  doc.addPage();
  drawPageBg();
  pageNum++;
  drawHeader();

  // ── Points per Quarter bar chart ──
  if (activeQuarters.length > 1) {
    sectionTitle('Puntos por Cuarto');

    const qData = activeQuarters.map(q => {
      const qShots = allShots.filter(s => s.quarterId === q);
      const pts = qShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
      const opp = filteredGames.flatMap(g => g.opponentScores || []).filter(s => s.quarterId === q).reduce((sum, s) => sum + s.points, 0);
      return { label: QUARTER_LABELS[q], pts, opp };
    });

    const chartX = M;
    const chartW = W - M * 2;
    const chartH = 58;
    const maxVal = Math.max(...qData.map(d => Math.max(d.pts, d.opp)), 1);
    const barGroupW = chartW / qData.length;
    const barW = barGroupW * 0.28;
    const gap = 4;

    doc.setFillColor(...WHITE);
    doc.roundedRect(chartX, y, chartW, chartH + 22, 5, 5, 'F');
    doc.setDrawColor(...TABLE_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(chartX, y, chartW, chartH + 22, 5, 5, 'S');

    for (let i = 0; i <= 4; i++) {
      const gy = y + 8 + (chartH * (1 - i / 4));
      doc.setDrawColor(235, 232, 245);
      doc.setLineWidth(0.15);
      doc.line(chartX + 14, gy, chartX + chartW - 8, gy);
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(`${Math.round(maxVal * i / 4)}`, chartX + 4, gy + 1.5);
    }

    qData.forEach((d, i) => {
      const groupX = chartX + 18 + i * barGroupW;
      const barBaseY = y + 8 + chartH;

      const teamH = Math.max((d.pts / maxVal) * chartH, 0.5);
      doc.setFillColor(...PURPLE);
      doc.roundedRect(groupX, barBaseY - teamH, barW, teamH, 1.5, 1.5, 'F');
      if (teamH > 4) {
        doc.setFillColor(...PURPLE_LIGHT);
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.3 }));
        doc.roundedRect(groupX + 1, barBaseY - teamH, barW - 2, teamH * 0.4, 1, 1, 'F');
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 1 }));
      }

      if (d.pts > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...PURPLE);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.pts}`, groupX + barW / 2, barBaseY - teamH - 2, { align: 'center' });
      }

      const oppH = Math.max((d.opp / maxVal) * chartH, 0.5);
      doc.setFillColor(...DESTRUCTIVE);
      doc.roundedRect(groupX + barW + gap, barBaseY - oppH, barW, oppH, 1.5, 1.5, 'F');

      if (d.opp > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...DESTRUCTIVE);
        doc.text(`${d.opp}`, groupX + barW + gap + barW / 2, barBaseY - oppH - 2, { align: 'center' });
      }

      doc.setFontSize(9);
      doc.setTextColor(...NEAR_BLACK);
      doc.setFont('helvetica', 'bold');
      doc.text(d.label, groupX + barW + gap / 2, barBaseY + 7, { align: 'center' });
    });

    const legendY = y + chartH + 14;
    doc.setFillColor(...PURPLE);
    doc.roundedRect(chartX + chartW - 60, legendY, 5, 5, 1.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...NEAR_BLACK);
    doc.setFont('helvetica', 'normal');
    doc.text('Equipo', chartX + chartW - 53, legendY + 4);
    doc.setFillColor(...DESTRUCTIVE);
    doc.roundedRect(chartX + chartW - 28, legendY, 5, 5, 1.5, 1.5, 'F');
    doc.text('Rival', chartX + chartW - 21, legendY + 4);

    y += chartH + 28;

    // Quarter comparison table
    const qTableData = qData.map(d => {
      const diff = d.pts - d.opp;
      return [d.label, `${d.pts}`, `${d.opp}`, `${diff > 0 ? '+' : ''}${diff}`];
    });

    autoTable(doc, {
      startY: y,
      head: [['Cuarto', 'Equipo', 'Rival', 'Diferencia']],
      body: qTableData,
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', halign: 'center', lineColor: TABLE_BORDER, lineWidth: 0.2 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: TABLE_ALT },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = parseInt(data.cell.raw as string);
          data.cell.styles.textColor = val > 0 ? [...SUCCESS] : val < 0 ? [...DESTRUCTIVE] : [...MUTED];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Shot Chart ──
  const shotsForChart = filteredShots.filter(s => options.playerFilter === 'ALL' || s.playerId === options.playerFilter);

  if (shotsForChart.length > 0) {
    if (y > H - 130) {
      drawFooter(pageNum);
      doc.addPage();
      drawPageBg();
      pageNum++;
      drawHeader();
    }

    sectionTitle('Shot Chart');

    const totalAtt = shotsForChart.length;
    const totalMade = shotsForChart.filter(s => s.made).length;
    const totalPct = totalAtt > 0 ? Math.round((totalMade / totalAtt) * 100) : 0;

    const statBadges = [
      { l: 'Intentos', v: `${totalAtt}`, c: PURPLE },
      { l: 'Aciertos', v: `${totalMade}`, c: SUCCESS },
      { l: 'Eficiencia', v: `${totalPct}%`, c: GOLD },
    ];
    statBadges.forEach((b, i) => {
      const bx = M + i * 35;
      doc.setFillColor(...WHITE);
      doc.roundedRect(bx, y, 32, 14, 3, 3, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'bold');
      doc.text(b.l, bx + 16, y + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(...b.c);
      doc.text(b.v, bx + 16, y + 12, { align: 'center' });
    });
    y += 18;

    // Court — half-court layout matching app SVG (viewBox 0 0 300 280)
    const courtW = 140;
    const courtH = (280 / 300) * courtW; // preserve aspect ratio
    const courtX = (W - courtW) / 2;
    const courtY = y;

    // Outer card (white frame)
    doc.setFillColor(...WHITE);
    doc.roundedRect(courtX - 5, courtY - 5, courtW + 10, courtH + 10, 5, 5, 'F');

    // Court floor (wood color)
    doc.setFillColor(225, 200, 165);
    doc.rect(courtX, courtY, courtW, courtH, 'F');

    // Coordinate mappers — domain matches app SVG (300×280)
    const sx = (v: number) => courtX + (v / 300) * courtW;
    const sy = (v: number) => courtY + (v / 280) * courtH;
    const scaleX = courtW / 300;
    const scaleY = courtH / 280;

    // Outer boundary
    doc.setDrawColor(190, 165, 130);
    doc.setLineWidth(0.6);
    doc.rect(courtX, courtY, courtW, courtH);

    // Painted area (key) — app: rect 100,200,100,80
    doc.setFillColor(215, 185, 150);
    doc.rect(sx(100), sy(200), 100 * scaleX, 80 * scaleY, 'F');
    doc.rect(sx(100), sy(200), 100 * scaleX, 80 * scaleY);

    // Free-throw circle — app: cx=150 cy=200 r=30
    doc.setLineWidth(0.5);
    doc.ellipse(sx(150), sy(200), 30 * scaleX, 30 * scaleY);

    // 3-point arc — app path: M 40,170 L 40,280 (sideline) and arc Q 150,40 260,170 then L 260,280
    // Sidelines (corner triple lines)
    doc.setLineWidth(0.5);
    doc.line(sx(40), sy(170), sx(40), sy(280));
    doc.line(sx(260), sy(170), sx(260), sy(280));

    // 3-pt arc — sample the quadratic Bezier Q(150,40) from (40,170) to (260,170)
    const arcSteps = 36;
    let prevX = 40, prevY = 170;
    for (let i = 1; i <= arcSteps; i++) {
      const t = i / arcSteps;
      // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const u = 1 - t;
      const cx = u * u * 40 + 2 * u * t * 150 + t * t * 260;
      const cy = u * u * 170 + 2 * u * t * 40 + t * t * 170;
      doc.line(sx(prevX), sy(prevY), sx(cx), sy(cy));
      prevX = cx; prevY = cy;
    }

    // Half-court line (app draws it at y=0 — top of the half court)
    doc.setLineWidth(0.6);
    doc.line(sx(0), sy(0), sx(300), sy(0));

    // Hoop + backboard — app: hoop circle cx=150 cy=265 r=5; backboard line 140,270 → 160,270
    doc.setDrawColor(...GOLD);
    doc.setFillColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.circle(sx(150), sy(265), 5 * scaleX);
    doc.line(sx(140), sy(270), sx(160), sy(270));

    // Shot markers — coords are stored as 0-100 percentages of the 300×280 viewBox
    shotsForChart.forEach(s => {
      const px = courtX + (s.x / 100) * courtW;
      const py = courtY + (s.y / 100) * courtH;

      if (s.made) {
        doc.setFillColor(...SUCCESS);
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.85 }));
        doc.circle(px, py, 1.8, 'F');
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 1 }));
        doc.setFillColor(...WHITE);
        doc.circle(px, py, 0.5, 'F');
      } else {
        doc.setDrawColor(...DESTRUCTIVE);
        doc.setLineWidth(0.55);
        const d = 1.4;
        doc.line(px - d, py - d, px + d, py + d);
        doc.line(px - d, py + d, px + d, py - d);
      }
    });

    y = courtY + courtH + 10;

    doc.setFillColor(...SUCCESS);
    doc.circle(M + 4, y + 1.5, 2.2, 'F');
    doc.setFillColor(...WHITE);
    doc.circle(M + 4, y + 1.5, 0.7, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...NEAR_BLACK);
    doc.setFont('helvetica', 'normal');
    doc.text('Acierto', M + 9, y + 3);

    doc.setDrawColor(...DESTRUCTIVE);
    doc.setLineWidth(0.6);
    doc.line(M + 28, y, M + 31.5, y + 3);
    doc.line(M + 28, y + 3, M + 31.5, y);
    doc.text('Fallo', M + 35, y + 3);

    y += 8;

    const twoS = shotsForChart.filter(s => s.points === 2);
    const threeS = shotsForChart.filter(s => s.points === 3);
    const ftS = shotsForChart.filter(s => s.points === 1);

    const breakdown = [
      ['2PT', `${twoS.filter(s => s.made).length}/${twoS.length}`, `${twoS.length > 0 ? Math.round((twoS.filter(s => s.made).length / twoS.length) * 100) : 0}%`],
      ['3PT', `${threeS.filter(s => s.made).length}/${threeS.length}`, `${threeS.length > 0 ? Math.round((threeS.filter(s => s.made).length / threeS.length) * 100) : 0}%`],
      ['TL',  `${ftS.filter(s => s.made).length}/${ftS.length}`,     `${ftS.length > 0 ? Math.round((ftS.filter(s => s.made).length / ftS.length) * 100) : 0}%`],
    ];

    // Color tag for each shot type (no emojis — jsPDF Unicode is unreliable)
    const typeColors: [number, number, number][] = [PURPLE, CYAN, GOLD];

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Aciertos / Intentos', 'Eficiencia']],
      body: breakdown,
      margin: { left: M + 20, right: M + 20 },
      styles: { fontSize: 10, cellPadding: 4, font: 'helvetica', halign: 'center', lineColor: TABLE_BORDER, lineWidth: 0.2 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: TABLE_ALT },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const c = typeColors[data.row.index] || NEAR_BLACK;
          data.cell.styles.textColor = [...c];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  drawFooter(pageNum);

  // ═══════════════ GLOSSARY PAGE ═══════════════
  doc.addPage();
  drawPageBg();
  pageNum++;
  drawHeader();

  sectionTitle('Glosario de Abreviaturas');

  const glossary: [string, string, string][] = [
    ['PTS', 'Puntos', 'Total de puntos anotados por la jugadora.'],
    ['2PT', 'Tiros de 2 puntos', 'Lanzamientos realizados dentro del arco de tres puntos (valen 2 puntos cada uno).'],
    ['3PT', 'Tiros de 3 puntos', 'Lanzamientos realizados fuera del arco de tres puntos (valen 3 puntos cada uno).'],
    ['TL', 'Tiros Libres', 'Lanzamientos desde la linea de tiro libre tras una falta (valen 1 punto cada uno).'],
    ['TC', 'Tiros de Campo', 'Incluye todos los lanzamientos de 2 y 3 puntos (excluye tiros libres).'],
    ['FGM / FGA', 'Field Goals Made / Attempted', 'Tiros de campo anotados sobre intentados.'],
    ['REB', 'Rebotes Totales', 'Suma de rebotes ofensivos y defensivos capturados.'],
    ['RO', 'Rebotes Ofensivos', 'Rebotes recuperados bajo el aro rival tras un tiro fallado del propio equipo.'],
    ['RD', 'Rebotes Defensivos', 'Rebotes recuperados bajo el aro propio tras un tiro fallado del rival.'],
    ['AST', 'Asistencias', 'Pases que derivan directamente en una canasta anotada por una companera.'],
    ['STL', 'Robos (Steals)', 'Recuperaciones de balon por intercepcion o arrebato al rival.'],
    ['TOV', 'Perdidas (Turnovers)', 'Perdidas de posesion sin lanzar al aro (pase errado, violacion, etc.).'],
    ['PF', 'Faltas Personales', 'Infracciones cometidas por contacto ilegal con una rival.'],
    ['eFG%', 'Effective Field Goal %', 'Mide eficiencia de tiro ponderando triples: (2PT anotados + 0.5 x 3PT anotados) / TC intentados.'],
    ['TS%', 'True Shooting %', 'Eficiencia real incluyendo tiros libres: Puntos / (2 x (TC intentados + 0.44 x TL intentados)).'],
    ['AST/TOV', 'Ratio Asistencias/Perdidas', 'Relacion entre asistencias y perdidas. Valores altos indican buen cuidado del balon.'],
    ['MIN%', 'Porcentaje de Minutos', 'Porcentaje del tiempo total de juego que la jugadora estuvo en cancha.'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Sigla', 'Nombre', 'Definicion']],
    body: glossary,
    margin: { left: M, right: M },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      font: 'helvetica',
      lineColor: TABLE_BORDER,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: TABLE_ALT },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold', halign: 'center', textColor: PURPLE },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
    },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  drawFooter(pageNum);

  // ═══════════════ PREMIUM BANNER ═══════════════
  if (options.premiumBannerUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = options.premiumBannerUrl!;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      const bannerW = W - M * 2;
      const bannerH = Math.min(30, (img.naturalHeight / img.naturalWidth) * bannerW);

      const spaceNeeded = bannerH + 14;
      const availableSpace = H - 16 - y;

      if (availableSpace < spaceNeeded) {
        doc.addPage();
        drawPageBg();
        pageNum++;
        drawHeader();
        y = 46;
      }

      doc.setFillColor(...GOLD);
      doc.roundedRect(M, y, 28, 5, 1, 1, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEAR_BLACK);
      doc.text('PREMIUM', M + 14, y + 3.5, { align: 'center' });
      y += 7;

      doc.addImage(dataUrl, 'JPEG', M, y, bannerW, bannerH);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.5);
      doc.roundedRect(M, y, bannerW, bannerH, 2, 2, 'S');

      drawFooter(pageNum);
    } catch {
      // silently skip if image fails to load
    }
  }

  const fileName = `BASQUEST_Report_${options.teamName || 'Stats'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
