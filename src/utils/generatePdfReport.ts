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
}

interface BoxScoreRow {
  name: string; number: number; pts: number;
  fgm: number; fga: number; fgPct: number;
  twoM: number; twoA: number; twoPct: number;
  threeM: number; threeA: number; threePct: number;
  ftM: number; ftA: number; ftPct: number;
  reb: number; ast: number; stl: number; pf: number;
}

// ── Brand Palette (from CSS tokens) ──
const PURPLE: [number, number, number] = [122, 38, 225];      // primary 268 76% 52%
const PURPLE_LIGHT: [number, number, number] = [165, 100, 240]; // lighter purple
const PURPLE_DARK: [number, number, number] = [60, 15, 120];    // deep purple
const CYAN: [number, number, number] = [50, 217, 255];         // secondary 190 100% 60%
const GOLD: [number, number, number] = [255, 195, 0];          // accent 45 100% 50%
const SUCCESS: [number, number, number] = [16, 185, 129];      // success 160 84% 39%
const DESTRUCTIVE: [number, number, number] = [217, 72, 72];   // destructive
const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [25, 15, 45];
const BODY_BG: [number, number, number] = [245, 243, 250];     // soft lavender bg
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
  const W = doc.internal.pageSize.getWidth();   // ~215.9
  const H = doc.internal.pageSize.getHeight();  // ~279.4
  const M = 14; // margin
  let y = 0;

  // ═══════════════ HELPERS ═══════════════

  const drawPageBg = () => {
    doc.setFillColor(...BODY_BG);
    doc.rect(0, 0, W, H, 'F');
  };

  const drawHeader = () => {
    // Gradient-like header band with two layers
    doc.setFillColor(...PURPLE_DARK);
    doc.rect(0, 0, W, 42, 'F');
    doc.setFillColor(...PURPLE);
    doc.rect(0, 0, W, 36, 'F');

    // Decorative accent stripe
    doc.setFillColor(...GOLD);
    doc.rect(0, 36, W, 1.5, 'F');

    // Decorative circles (brand flair)
    doc.setFillColor(255, 255, 255);
    // @ts-ignore - GState is available at runtime
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.circle(W - 30, 10, 35, 'F');
    doc.circle(W - 60, 25, 20, 'F');
    // @ts-ignore
    doc.setGState(new doc.GState({ opacity: 1 }));

    // App name
    doc.setTextColor(...WHITE);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BASQEST+', M, 16);

    // Tagline with cyan accent
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CYAN);
    doc.text('Inteligencia Deportiva', M, 23);

    // Team name in gold capsule
    if (options.teamName) {
      const teamText = options.teamName.toUpperCase();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const tw = doc.getTextWidth(teamText);
      const capsuleW = tw + 10;
      const capsuleX = M;
      const capsuleY = 27;
      doc.setFillColor(...GOLD);
      doc.roundedRect(capsuleX, capsuleY, capsuleW, 7, 3.5, 3.5, 'F');
      doc.setTextColor(...NEAR_BLACK);
      doc.text(teamText, capsuleX + 5, capsuleY + 5.2);
    }

    // App logo
    if (options.appLogo) {
      try { doc.addImage(options.appLogo, 'PNG', W - M - 20, 4, 20, 20); } catch { /* skip */ }
    }
    // Team logo
    if (options.teamLogo) {
      try {
        // Circular clip effect: draw white circle bg then image
        doc.setFillColor(...WHITE);
        doc.circle(W - M - 10, 31, 7, 'F');
        doc.addImage(options.teamLogo, 'PNG', W - M - 16, 25, 12, 12);
      } catch { /* skip */ }
    }

    y = 46;
  };

  const drawFooter = (pageNum: number) => {
    // Footer bar
    doc.setFillColor(...PURPLE_DARK);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, H - 12, W, 0.8, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CYAN);
    doc.text('BASQEST+', M, H - 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 175, 200);
    doc.text(`${options.category} · ${new Date().toLocaleDateString()}`, M + 22, H - 4);
    doc.text(`Página ${pageNum}`, W - M, H - 4, { align: 'right' });
  };

  const sectionTitle = (title: string, icon?: string) => {
    doc.setFillColor(...PURPLE);
    doc.roundedRect(M, y, 3, 7, 1.5, 1.5, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEAR_BLACK);
    doc.text(`${icon ? icon + ' ' : ''}${title}`, M + 6, y + 5.5);
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
  doc.text(`📋  ${options.filterLabel}  ·  ${options.gameLabel}`, M + 4, y + 5);
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
    { label: 'RÉCORD', value: `${wins}-${losses}`, color: GOLD },
    { label: 'PTS/PARTIDO', value: ppg, color: CYAN },
    { label: 'PTS/CONTRA', value: oppPpg, color: PURPLE_LIGHT },
  ];
  cards.forEach((c, i) => {
    const cx = M + i * (cardW + 4);
    // Card bg
    doc.setFillColor(...WHITE);
    doc.roundedRect(cx, y, cardW, 26, 4, 4, 'F');
    // Top accent line
    doc.setFillColor(...c.color);
    doc.roundedRect(cx + 8, y, cardW - 16, 2, 1, 1, 'F');
    // Label
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, cx + cardW / 2, y + 10, { align: 'center' });
    // Value
    doc.setFontSize(20);
    doc.setTextColor(...NEAR_BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text(c.value, cx + cardW / 2, y + 22, { align: 'center' });
  });
  y += 32;

  // ── Season leaders ──
  const allShots = filteredGames.flatMap(g => g.shots);
  const allActions = filteredGames.flatMap(g => g.actions || []);
  const rosterMap = new Map<string, Player>();
  filteredGames.forEach(g => g.roster.forEach(p => rosterMap.set(p.id, p)));
  const roster = Array.from(rosterMap.values());

  const playerStats = roster.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const pts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    return {
      ...p, pts,
      triplesMade: shots.filter(s => s.points === 3 && s.made).length,
      triplesAtt: shots.filter(s => s.points === 3).length,
      doblesMade: shots.filter(s => s.points === 2 && s.made).length,
      doblesAtt: shots.filter(s => s.points === 2).length,
      ftMade: shots.filter(s => s.points === 1 && s.made).length,
      ftAtt: shots.filter(s => s.points === 1).length,
      reb: allActions.filter(a => a.playerId === p.id && a.type === 'rebound').length,
      ast: allActions.filter(a => a.playerId === p.id && a.type === 'assist').length,
      stl: allActions.filter(a => a.playerId === p.id && a.type === 'steal').length,
    };
  });

  const topScorer = [...playerStats].sort((a, b) => b.pts - a.pts)[0];
  const topThrees = [...playerStats].filter(p => p.triplesMade > 0).sort((a, b) => b.triplesMade - a.triplesMade)[0];
  const topDoubles = [...playerStats].filter(p => p.doblesMade > 0).sort((a, b) => b.doblesMade - a.doblesMade)[0];
  const topReb = [...playerStats].filter(p => p.reb > 0).sort((a, b) => b.reb - a.reb)[0];
  const topAst = [...playerStats].filter(p => p.ast > 0).sort((a, b) => b.ast - a.ast)[0];
  const topStl = [...playerStats].filter(p => p.stl > 0).sort((a, b) => b.stl - a.stl)[0];

  sectionTitle('Líderes de Temporada');

  const leaderItems = [
    { label: 'PUNTOS', player: topScorer, value: topScorer?.pts, accent: GOLD },
    { label: 'TRIPLES', player: topThrees, value: topThrees?.triplesMade, accent: CYAN },
    { label: 'DOBLES', player: topDoubles, value: topDoubles?.doblesMade, accent: PURPLE_LIGHT },
    { label: 'REBOTES', player: topReb, value: topReb?.reb, accent: SUCCESS },
    { label: 'ASISTENCIAS', player: topAst, value: topAst?.ast, accent: CYAN },
    { label: 'ROBOS', player: topStl, value: topStl?.stl, accent: GOLD },
  ];

  const lColW = (W - M * 2 - 8) / 3;
  leaderItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = M + col * (lColW + 4);
    const ly = y + row * 22;

    // Card
    doc.setFillColor(...WHITE);
    doc.roundedRect(lx, ly, lColW, 19, 3, 3, 'F');
    // Left accent bar
    doc.setFillColor(...item.accent);
    doc.roundedRect(lx, ly + 3, 2.5, 13, 1.2, 1.2, 'F');

    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, lx + 6, ly + 6);

    if (item.player) {
      doc.setFontSize(8.5);
      doc.setTextColor(...NEAR_BLACK);
      doc.setFont('helvetica', 'bold');
      doc.text(`#${item.player.number} ${item.player.name}`, lx + 6, ly + 12.5);
      // Value badge
      doc.setFillColor(...item.accent);
      const valStr = `${item.value}`;
      const valW = Math.max(doc.getTextWidth(valStr) + 5, 10);
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

  // ── Results table ──
  if (filteredGames.length > 0) {
    sectionTitle('Resultados');

    const gameRows = filteredGames.map(g => {
      const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
      const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
      const won = teamPts > oppPts;
      const legLabel = g.leg ? ` (${g.leg === 'ida' ? 'Ida' : 'Vuelta'})` : '';
      const homeLabel = g.isHome === true ? ' (L)' : g.isHome === false ? ' (V)' : '';
      const teamCol = `${options.teamName || 'BASQEST+'}${homeLabel}`;
      const oppCol = `${g.opponentName}${g.isHome === true ? ' (V)' : g.isHome === false ? ' (L)' : ''}${legLabel}`;
      return [new Date(g.date).toLocaleDateString(), teamCol, oppCol, `${teamPts} - ${oppPts}`, won ? 'V' : 'D'];
    });
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
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  drawFooter(pageNum);

  // ═══════════════ PAGE 2: Box Score ═══════════════
  doc.addPage();
  drawPageBg();
  pageNum++;
  drawHeader();

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
    const pActions = allActions.filter(a => a.playerId === player.id);
    return {
      name: player.name, number: player.number, pts, fgm, fga,
      fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
      twoM, twoA, twoPct: twoA > 0 ? Math.round((twoM / twoA) * 100) : 0,
      threeM, threeA, threePct: threeA > 0 ? Math.round((threeM / threeA) * 100) : 0,
      ftM, ftA, ftPct: ftA > 0 ? Math.round((ftM / ftA) * 100) : 0,
      reb: pActions.filter(a => a.type === 'rebound').length,
      ast: pActions.filter(a => a.type === 'assist').length,
      stl: pActions.filter(a => a.type === 'steal').length,
      pf: pActions.filter(a => a.type === 'foul').length,
    };
  }).sort((a, b) => b.pts - a.pts);

  const tableBody = boxRows.map(r => [
    `#${r.number} ${r.name}`,
    `${r.fgm}/${r.fga}`, `${r.fgPct}%`,
    `${r.twoM}/${r.twoA}`, `${r.twoPct}%`,
    `${r.threeM}/${r.threeA}`, `${r.threePct}%`,
    `${r.ftM}/${r.ftA}`, `${r.ftPct}%`,
    `${r.pts}`, `${r.reb}`, `${r.ast}`, `${r.stl}`, `${r.pf}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Jugadora', 'TC', '%', '2PT', '%', '3PT', '%', 'TL', '%', 'PTS', 'REB', 'AST', 'STL', 'PF']],
    body: tableBody,
    margin: { left: M, right: M },
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica', lineColor: TABLE_BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: TABLE_ALT },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      9: { fontStyle: 'bold', halign: 'center', fillColor: [245, 240, 255] },
      1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
      5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' },
      10: { halign: 'center' }, 11: { halign: 'center' }, 12: { halign: 'center' }, 13: { halign: 'center' },
    },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body') {
        const ci = data.column.index;
        const val = parseInt(data.cell.raw as string);
        if ([2, 4, 6, 8].includes(ci) && !isNaN(val)) {
          if (ci === 6 && val >= 40) data.cell.styles.textColor = [...SUCCESS];
          else if (ci === 6 && val < 25 && val > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
          else if ([2, 4].includes(ci) && val >= 50) data.cell.styles.textColor = [...SUCCESS];
          else if ([2, 4].includes(ci) && val < 30 && val > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
          else if (ci === 8 && val >= 75) data.cell.styles.textColor = [...SUCCESS];
          else if (ci === 8 && val < 50 && val > 0) data.cell.styles.textColor = [...DESTRUCTIVE];
        }
        // Highlight PTS column
        if (ci === 9) data.cell.styles.textColor = [...PURPLE];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Team totals ──
  const tt = boxRows.reduce((a, r) => ({
    pts: a.pts + r.pts, fgm: a.fgm + r.fgm, fga: a.fga + r.fga,
    twoM: a.twoM + r.twoM, twoA: a.twoA + r.twoA,
    threeM: a.threeM + r.threeM, threeA: a.threeA + r.threeA,
    ftM: a.ftM + r.ftM, ftA: a.ftA + r.ftA,
    reb: a.reb + r.reb, ast: a.ast + r.ast, stl: a.stl + r.stl, pf: a.pf + r.pf,
  }), { pts: 0, fgm: 0, fga: 0, twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0, reb: 0, ast: 0, stl: 0, pf: 0 });

  // Totals bar
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
  ];
  const totW = (W - M * 2) / totItems.length;
  totItems.forEach((t, i) => {
    const tx = M + i * totW;
    doc.setFontSize(5.5);
    doc.setTextColor(180, 170, 210);
    doc.setFont('helvetica', 'bold');
    doc.text(t.l, tx + totW / 2, y + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(...t.c);
    doc.text(t.v, tx + totW / 2, y + 14, { align: 'center' });
  });

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

    // Chart background card
    doc.setFillColor(...WHITE);
    doc.roundedRect(chartX, y, chartW, chartH + 22, 5, 5, 'F');
    // Subtle inner shadow
    doc.setDrawColor(...TABLE_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(chartX, y, chartW, chartH + 22, 5, 5, 'S');

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const gy = y + 8 + (chartH * (1 - i / 4));
      doc.setDrawColor(235, 232, 245);
      doc.setLineWidth(0.15);
      doc.line(chartX + 14, gy, chartX + chartW - 8, gy);
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.text(`${Math.round(maxVal * i / 4)}`, chartX + 4, gy + 1.5);
    }

    // Bars with gradient effect
    qData.forEach((d, i) => {
      const groupX = chartX + 18 + i * barGroupW;
      const barBaseY = y + 8 + chartH;

      // Team bar (purple with lighter top)
      const teamH = Math.max((d.pts / maxVal) * chartH, 0.5);
      doc.setFillColor(...PURPLE);
      doc.roundedRect(groupX, barBaseY - teamH, barW, teamH, 1.5, 1.5, 'F');
      if (teamH > 4) {
        doc.setFillColor(...PURPLE_LIGHT);
        doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
        doc.roundedRect(groupX + 1, barBaseY - teamH, barW - 2, teamH * 0.4, 1, 1, 'F');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }

      if (d.pts > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...PURPLE);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.pts}`, groupX + barW / 2, barBaseY - teamH - 2, { align: 'center' });
      }

      // Opponent bar (coral/red)
      const oppH = Math.max((d.opp / maxVal) * chartH, 0.5);
      doc.setFillColor(...DESTRUCTIVE);
      doc.roundedRect(groupX + barW + gap, barBaseY - oppH, barW, oppH, 1.5, 1.5, 'F');

      if (d.opp > 0) {
        doc.setFontSize(7);
        doc.setTextColor(...DESTRUCTIVE);
        doc.text(`${d.opp}`, groupX + barW + gap + barW / 2, barBaseY - oppH - 2, { align: 'center' });
      }

      // Quarter label
      doc.setFontSize(9);
      doc.setTextColor(...NEAR_BLACK);
      doc.setFont('helvetica', 'bold');
      doc.text(d.label, groupX + barW + gap / 2, barBaseY + 7, { align: 'center' });
    });

    // Legend
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

    // Stats badges
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

    // Court
    const courtW = 130;
    const courtH = 121;
    const courtX = (W - courtW) / 2;
    const courtY = y;

    // Court outer card
    doc.setFillColor(...WHITE);
    doc.roundedRect(courtX - 5, courtY - 5, courtW + 10, courtH + 10, 5, 5, 'F');

    // Court surface
    doc.setFillColor(225, 200, 165); // hardwood tone
    doc.rect(courtX, courtY, courtW, courtH, 'F');

    // Court markings
    doc.setDrawColor(190, 165, 130);
    doc.setLineWidth(0.6);
    doc.rect(courtX, courtY, courtW, courtH); // outline

    const sx = (v: number) => courtX + (v / 300) * courtW;
    const sy = (v: number) => courtY + (v / 280) * courtH;

    // Paint
    doc.setFillColor(215, 185, 150);
    const paintX = sx(100);
    const paintY = sy(200);
    const paintW = (100 / 300) * courtW;
    const paintH = (80 / 280) * courtH;
    doc.rect(paintX, paintY, paintW, paintH, 'F');
    doc.rect(paintX, paintY, paintW, paintH);

    // FT circle
    doc.circle(sx(150), sy(200), (40 / 300) * courtW);

    // 3PT lines
    doc.line(sx(40), sy(280), sx(40), sy(170));
    doc.line(sx(260), sy(280), sx(260), sy(170));

    // 3PT arc
    for (let angle = 0; angle <= 180; angle += 8) {
      const rad = (angle * Math.PI) / 180;
      const rad2 = ((angle + 8) * Math.PI) / 180;
      const x1 = 150 + 110 * Math.cos(rad), y1 = 220 - 110 * Math.sin(rad);
      const x2 = 150 + 110 * Math.cos(rad2), y2 = 220 - 110 * Math.sin(rad2);
      doc.line(sx(x1), sy(y1), sx(x2), sy(y2));
    }

    // Basket
    doc.setFillColor(...GOLD);
    doc.circle(sx(150), sy(270), 2, 'F');
    doc.setDrawColor(...GOLD);
    doc.circle(sx(150), sy(270), 3.5);

    // Plot shots
    shotsForChart.forEach(s => {
      const px = courtX + (s.x / 100) * courtW;
      const py = courtY + (s.y / 100) * courtH;

      if (s.made) {
        doc.setFillColor(...SUCCESS);
        doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
        doc.circle(px, py, 2.2, 'F');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
        // White inner dot
        doc.setFillColor(...WHITE);
        doc.circle(px, py, 0.7, 'F');
      } else {
        doc.setDrawColor(...DESTRUCTIVE);
        doc.setLineWidth(0.6);
        const d = 1.6;
        doc.line(px - d, py - d, px + d, py + d);
        doc.line(px - d, py + d, px + d, py - d);
      }
    });

    y = courtY + courtH + 10;

    // Legend
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

    // Shot type breakdown
    const twoS = shotsForChart.filter(s => s.points === 2);
    const threeS = shotsForChart.filter(s => s.points === 3);
    const ftS = shotsForChart.filter(s => s.points === 1);

    const breakdown = [
      ['2PT', `${twoS.filter(s => s.made).length}/${twoS.length}`, `${twoS.length > 0 ? Math.round((twoS.filter(s => s.made).length / twoS.length) * 100) : 0}%`],
      ['3PT', `${threeS.filter(s => s.made).length}/${threeS.length}`, `${threeS.length > 0 ? Math.round((threeS.filter(s => s.made).length / threeS.length) * 100) : 0}%`],
      ['TL', `${ftS.filter(s => s.made).length}/${ftS.length}`, `${ftS.length > 0 ? Math.round((ftS.filter(s => s.made).length / ftS.length) * 100) : 0}%`],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Aciertos / Intentos', 'Eficiencia']],
      body: breakdown,
      margin: { left: M + 20, right: M + 20 },
      styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', halign: 'center', lineColor: TABLE_BORDER, lineWidth: 0.2 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold' },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: TABLE_ALT },
      theme: 'grid',
    });
  }

  drawFooter(pageNum);

  // Save
  const fileName = `BASQEST_Report_${options.teamName || 'Stats'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
