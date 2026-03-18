import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Game, Player, QuarterId, QUARTER_LABELS } from '@/types/basketball';

interface ReportOptions {
  teamName: string;
  teamLogo: string; // base64
  appLogo: string; // base64 from import
  category: string;
  filterLabel: string; // e.g. "Todos los torneos" or tournament name
  gameLabel: string; // e.g. "Todos los partidos (5)" or specific game
  quarterFilter: QuarterId | 'ALL';
  playerFilter: string; // 'ALL' or player id
}

interface BoxScoreRow {
  name: string;
  number: number;
  pts: number;
  fgm: number; fga: number; fgPct: number;
  twoM: number; twoA: number; twoPct: number;
  threeM: number; threeA: number; threePct: number;
  ftM: number; ftA: number; ftPct: number;
  reb: number; ast: number; stl: number; pf: number;
  courtTimePct: number;
}

const PRIMARY_COLOR: [number, number, number] = [122, 38, 225]; // #7A26E1
const DARK_BG: [number, number, number] = [30, 20, 50];
const GOLD: [number, number, number] = [255, 195, 0]; // #FFC300
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [240, 240, 245];

export async function generatePdfReport(
  games: Game[],
  filteredGames: Game[],
  allPlayers: Player[],
  options: ReportOptions
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // ── Helper: draw header band on each page ──
  const drawHeader = () => {
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageW, 38, 'F');

    // App name
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BASQEST+', margin, 18);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Inteligencia Deportiva', margin, 25);

    // Team name capsule
    if (options.teamName) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(options.teamName, margin, 34);
    }

    // App logo
    if (options.appLogo) {
      try { doc.addImage(options.appLogo, 'PNG', pageW - margin - 18, 5, 18, 18); } catch { }
    }
    // Team logo
    if (options.teamLogo) {
      try { doc.addImage(options.teamLogo, 'PNG', pageW - margin - 18, 22, 12, 12); } catch { }
    }

    y = 44;
  };

  // ── Helper: footer ──
  const drawFooter = (pageNum: number) => {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`BASQEST+ · ${options.category} · ${new Date().toLocaleDateString()}`, margin, pageH - 8);
    doc.text(`Página ${pageNum}`, pageW - margin, pageH - 8, { align: 'right' });
  };

  // ═══════════════ PAGE 1: Overview ═══════════════
  drawHeader();
  let pageNum = 1;

  // Filter info
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.setFont('helvetica', 'normal');
  doc.text(`Filtro: ${options.filterLabel} · ${options.gameLabel}`, margin, y);
  y += 6;

  // ── Team summary ──
  const totalGames = filteredGames.length;
  const wins = filteredGames.filter(g => {
    const team = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const opp = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
    return team > opp;
  }).length;
  const losses = totalGames - wins;

  const totalTeamPts = filteredGames.reduce(
    (sum, g) => sum + g.shots.filter(s => s.made).reduce((a, s) => a + s.points, 0), 0
  );
  const totalOppPts = filteredGames.reduce(
    (sum, g) => sum + (g.opponentScores || []).reduce((a, s) => a + s.points, 0), 0
  );
  const ppg = totalGames > 0 ? (totalTeamPts / totalGames).toFixed(1) : '0';
  const oppPpg = totalGames > 0 ? (totalOppPts / totalGames).toFixed(1) : '0';

  // Summary cards
  doc.setFillColor(...LIGHT_GRAY);
  const cardW = (pageW - margin * 2 - 10) / 3;
  const cards = [
    { label: 'RÉCORD', value: `${wins}-${losses}` },
    { label: 'PTS/P', value: ppg },
    { label: 'PTS/C', value: oppPpg },
  ];
  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + 5);
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(cx, y, cardW, 22, 3, 3, 'F');
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 140);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, cx + cardW / 2, y + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(30, 20, 50);
    doc.text(c.value, cx + cardW / 2, y + 19, { align: 'center' });
  });
  y += 28;

  // ── Season leaders ──
  const allShots = filteredGames.flatMap(g => g.shots);
  const allActions = filteredGames.flatMap(g => g.actions || []);
  const rosterMap = new Map<string, Player>();
  filteredGames.forEach(g => g.roster.forEach(p => rosterMap.set(p.id, p)));
  const roster = Array.from(rosterMap.values());

  const playerStats = roster.map(p => {
    const shots = allShots.filter(s => s.playerId === p.id);
    const pts = shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
    const triplesMade = shots.filter(s => s.points === 3 && s.made).length;
    const triplesAtt = shots.filter(s => s.points === 3).length;
    const doblesMade = shots.filter(s => s.points === 2 && s.made).length;
    const doblesAtt = shots.filter(s => s.points === 2).length;
    const ftMade = shots.filter(s => s.points === 1 && s.made).length;
    const ftAtt = shots.filter(s => s.points === 1).length;
    const reb = allActions.filter(a => a.playerId === p.id && a.type === 'rebound').length;
    const ast = allActions.filter(a => a.playerId === p.id && a.type === 'assist').length;
    const stl = allActions.filter(a => a.playerId === p.id && a.type === 'steal').length;
    return { ...p, pts, triplesMade, triplesAtt, doblesMade, doblesAtt, ftMade, ftAtt, reb, ast, stl };
  });

  const topScorer = [...playerStats].sort((a, b) => b.pts - a.pts)[0];
  const topThrees = [...playerStats].filter(p => p.triplesMade > 0).sort((a, b) => b.triplesMade - a.triplesMade)[0];
  const topDoubles = [...playerStats].filter(p => p.doblesMade > 0).sort((a, b) => b.doblesMade - a.doblesMade)[0];
  const topReb = [...playerStats].filter(p => p.reb > 0).sort((a, b) => b.reb - a.reb)[0];
  const topAst = [...playerStats].filter(p => p.ast > 0).sort((a, b) => b.ast - a.ast)[0];
  const topStl = [...playerStats].filter(p => p.stl > 0).sort((a, b) => b.stl - a.stl)[0];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_BG);
  doc.text('Líderes de Temporada', margin, y + 4);
  y += 10;

  const leaderItems = [
    { label: 'Puntos', player: topScorer, value: topScorer?.pts },
    { label: 'Triples', player: topThrees, value: topThrees?.triplesMade },
    { label: 'Dobles', player: topDoubles, value: topDoubles?.doblesMade },
    { label: 'Rebotes', player: topReb, value: topReb?.reb },
    { label: 'Asistencias', player: topAst, value: topAst?.ast },
    { label: 'Robos', player: topStl, value: topStl?.stl },
  ];

  const colW = (pageW - margin * 2 - 10) / 3;
  leaderItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = margin + col * (colW + 5);
    const ly = y + row * 20;

    doc.setFillColor(245, 242, 255);
    doc.roundedRect(lx, ly, colW, 17, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label.toUpperCase(), lx + 4, ly + 6);

    if (item.player) {
      doc.setFontSize(9);
      doc.setTextColor(...DARK_BG);
      doc.text(`#${item.player.number} ${item.player.name}`, lx + 4, ly + 12);
      doc.setFontSize(14);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(`${item.value}`, lx + colW - 4, ly + 12, { align: 'right' });
    } else {
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 170);
      doc.text('—', lx + 4, ly + 12);
    }
  });
  y += Math.ceil(leaderItems.length / 3) * 20 + 6;

  // ── Games results list ──
  if (filteredGames.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BG);
    doc.text('Resultados', margin, y + 4);
    y += 8;

    const gameRows = filteredGames.map(g => {
      const teamPts = g.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
      const oppPts = (g.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
      const won = teamPts > oppPts;
      const legLabel = g.leg ? ` (${g.leg === 'ida' ? 'Ida' : 'Vuelta'})` : '';
      return [
        new Date(g.date).toLocaleDateString(),
        `vs ${g.opponentName}${legLabel}`,
        `${teamPts} - ${oppPts}`,
        won ? 'V' : 'D',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Partido', 'Score', 'R']],
      body: gameRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        3: {
          halign: 'center',
          fontStyle: 'bold',
        },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = val === 'V' ? [34, 139, 34] : [200, 50, 50];
        }
      },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  drawFooter(pageNum);

  // ═══════════════ PAGE 2: Box Score ═══════════════
  doc.addPage();
  pageNum++;
  drawHeader();

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_BG);
  doc.text('Box Score', margin, y + 4);
  if (options.quarterFilter !== 'ALL') {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Filtro: ${QUARTER_LABELS[options.quarterFilter]}`, margin + 28, y + 4);
  }
  y += 8;

  // Build box score data
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
    const reb = pActions.filter(a => a.type === 'rebound').length;
    const ast = pActions.filter(a => a.type === 'assist').length;
    const stl = pActions.filter(a => a.type === 'steal').length;
    const pf = pActions.filter(a => a.type === 'foul').length;

    return {
      name: player.name, number: player.number,
      pts, fgm, fga, fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
      twoM, twoA, twoPct: twoA > 0 ? Math.round((twoM / twoA) * 100) : 0,
      threeM, threeA, threePct: threeA > 0 ? Math.round((threeM / threeA) * 100) : 0,
      ftM, ftA, ftPct: ftA > 0 ? Math.round((ftM / ftA) * 100) : 0,
      reb, ast, stl, pf, courtTimePct: 0,
    };
  }).sort((a, b) => b.pts - a.pts);

  const tableBody = boxRows.map(r => [
    `#${r.number} ${r.name}`,
    `${r.fgm}/${r.fga}`, `${r.fgPct}%`,
    `${r.twoM}/${r.twoA}`, `${r.twoPct}%`,
    `${r.threeM}/${r.threeA}`, `${r.threePct}%`,
    `${r.ftM}/${r.ftA}`, `${r.ftPct}%`,
    `${r.pts}`,
    `${r.reb}`, `${r.ast}`, `${r.stl}`, `${r.pf}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Jugadora', 'TC', '%', '2PT', '%', '3PT', '%', 'TL', '%', 'PTS', 'REB', 'AST', 'STL', 'PF']],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.5, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 32 },
      9: { fontStyle: 'bold', halign: 'center' },
      10: { halign: 'center' },
      11: { halign: 'center' },
      12: { halign: 'center' },
      13: { halign: 'center' },
      1: { halign: 'center' }, 2: { halign: 'center' },
      3: { halign: 'center' }, 4: { halign: 'center' },
      5: { halign: 'center' }, 6: { halign: 'center' },
      7: { halign: 'center' }, 8: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body') {
        // Color % columns based on thresholds
        const colIdx = data.column.index;
        const val = parseInt(data.cell.raw as string);
        if ([2, 4, 6, 8].includes(colIdx) && !isNaN(val)) {
          if (colIdx === 6 && val >= 40) data.cell.styles.textColor = [34, 139, 34]; // 3PT
          else if (colIdx === 6 && val < 25 && val > 0) data.cell.styles.textColor = [200, 50, 50];
          else if ([2, 4].includes(colIdx) && val >= 50) data.cell.styles.textColor = [34, 139, 34];
          else if ([2, 4].includes(colIdx) && val < 30 && val > 0) data.cell.styles.textColor = [200, 50, 50];
          else if (colIdx === 8 && val >= 75) data.cell.styles.textColor = [34, 139, 34];
          else if (colIdx === 8 && val < 50 && val > 0) data.cell.styles.textColor = [200, 50, 50];
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Team totals row ──
  const teamTotals = boxRows.reduce((acc, r) => ({
    pts: acc.pts + r.pts, fgm: acc.fgm + r.fgm, fga: acc.fga + r.fga,
    twoM: acc.twoM + r.twoM, twoA: acc.twoA + r.twoA,
    threeM: acc.threeM + r.threeM, threeA: acc.threeA + r.threeA,
    ftM: acc.ftM + r.ftM, ftA: acc.ftA + r.ftA,
    reb: acc.reb + r.reb, ast: acc.ast + r.ast, stl: acc.stl + r.stl, pf: acc.pf + r.pf,
  }), { pts: 0, fgm: 0, fga: 0, twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0, reb: 0, ast: 0, stl: 0, pf: 0 });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_BG);
  doc.text('Totales del Equipo', margin, y);
  y += 5;

  const totalsData = [
    ['PTS', `${teamTotals.pts}`],
    ['TC', `${teamTotals.fgm}/${teamTotals.fga} (${teamTotals.fga > 0 ? Math.round((teamTotals.fgm / teamTotals.fga) * 100) : 0}%)`],
    ['2PT', `${teamTotals.twoM}/${teamTotals.twoA} (${teamTotals.twoA > 0 ? Math.round((teamTotals.twoM / teamTotals.twoA) * 100) : 0}%)`],
    ['3PT', `${teamTotals.threeM}/${teamTotals.threeA} (${teamTotals.threeA > 0 ? Math.round((teamTotals.threeM / teamTotals.threeA) * 100) : 0}%)`],
    ['TL', `${teamTotals.ftM}/${teamTotals.ftA} (${teamTotals.ftA > 0 ? Math.round((teamTotals.ftM / teamTotals.ftA) * 100) : 0}%)`],
    ['REB', `${teamTotals.reb}`],
    ['AST', `${teamTotals.ast}`],
    ['STL', `${teamTotals.stl}`],
    ['PF', `${teamTotals.pf}`],
  ];

  autoTable(doc, {
    startY: y,
    body: totalsData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: PRIMARY_COLOR, cellWidth: 20 },
      1: { fontStyle: 'bold' },
    },
    theme: 'plain',
  });

  drawFooter(pageNum);

  // ── Points per quarter breakdown (if multi-quarter data) ──
  const ALL_QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];
  const activeQuarters = ALL_QUARTERS.filter(q => allShots.some(s => s.quarterId === q));

  if (activeQuarters.length > 1) {
    doc.addPage();
    pageNum++;
    drawHeader();

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BG);
    doc.text('Puntos por Cuarto', margin, y + 4);
    y += 8;

    const qData = activeQuarters.map(q => {
      const qShots = allShots.filter(s => s.quarterId === q);
      const pts = qShots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
      const opp = filteredGames.flatMap(g => g.opponentScores || []).filter(s => s.quarterId === q).reduce((sum, s) => sum + s.points, 0);
      const att = qShots.length;
      const made = qShots.filter(s => s.made).length;
      const pct = att > 0 ? Math.round((made / att) * 100) : 0;
      return [QUARTER_LABELS[q], `${pts}`, `${opp}`, `${made}/${att}`, `${pct}%`];
    });

    autoTable(doc, {
      startY: y,
      head: [['Cuarto', 'Equipo', 'Rival', 'Tiros', '% TC']],
      body: qData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', halign: 'center' },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 255] },
      theme: 'grid',
    });

    drawFooter(pageNum);
  }

  // Save
  const fileName = `BASQEST_Report_${options.teamName || 'Stats'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
