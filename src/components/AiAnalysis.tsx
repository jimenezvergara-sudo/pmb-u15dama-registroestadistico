import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import type { Rama } from '@/utils/genderTerms';

interface BoxScoreRow {
  playerName: string;
  number: number;
  pts: number;
  fgm: number;
  fga: number;
  fgPct: number;
  twoM: number;
  twoA: number;
  twoPct: number;
  threeM: number;
  threeA: number;
  threePct: number;
  ftM: number;
  ftA: number;
  ftPct: number;
  reb: number;
  ast: number;
  stl: number;
  pf: number;
  courtTimePct: number;
}

interface ChartDataPoint {
  quarter: string;
  points: number;
  rival: number;
  pct: number;
}

interface AiAnalysisProps {
  boxScore: BoxScoreRow[];
  chartData: ChartDataPoint[];
  totalPoints: number;
  totalOpponent: number;
  numGames: number;
  gameLabel: string;
}

const AiAnalysis: React.FC<AiAnalysisProps> = ({
  boxScore,
  chartData,
  totalPoints,
  totalOpponent,
  numGames,
  gameLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // ============================================================
  // PDF text sanitizer - removes emojis, non-ASCII corrupt chars,
  // and any sequences jsPDF's Helvetica (WinAnsi) can't render.
  // Preserves Spanish accents/ñ which ARE supported by WinAnsi.
  // ============================================================
  const stripForPdf = (raw: string): string => {
    if (!raw) return '';
    let s = raw;
    // Remove all emoji & symbol blocks (BMP + supplementary)
    s = s.replace(/[\u{1F000}-\u{1FFFF}]/gu, '');
    s = s.replace(/[\u{2600}-\u{27BF}]/gu, '');   // misc symbols & dingbats
    s = s.replace(/[\u{2300}-\u{23FF}]/gu, '');   // misc technical
    s = s.replace(/[\u{2B00}-\u{2BFF}]/gu, '');   // arrows etc
    s = s.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // variation selectors
    s = s.replace(/[\u{200D}\u{200B}\u{200C}]/gu, ''); // ZWJ/ZWSP
    // Replace fancy punctuation with ASCII equivalents
    s = s.replace(/[\u2018\u2019\u201A\u2032]/g, "'");
    s = s.replace(/[\u201C\u201D\u201E\u2033]/g, '"');
    s = s.replace(/[\u2013\u2014]/g, '-');
    s = s.replace(/\u2026/g, '...');
    s = s.replace(/\u00B7|\u2022/g, '-');
    // Remove known corrupt sequences from prior bad encodings
    s = s.replace(/Ø[=<>][\u00A0-\uFFFF]?/g, '');
    s = s.replace(/&¡/g, '');
    s = s.replace(/[ØÞßÝÜàáâ]=[A-Za-z]?/g, '');
    // Drop any remaining char outside WinAnsi-safe range
    // Keep: ASCII printable + common Latin-1 (accents, ñ, ¿, ¡)
    s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A1-\u00FF]/g, '');
    return s;
  };

  // Final safety net: detect and remove any leftover corruption markers
  const finalScrub = (s: string): string =>
    s.replace(/Ø[^\s]{0,3}/g, '').replace(/&¡/g, '').trim();

  const safeText = (s: string) => finalScrub(stripForPdf(s));

  const handleDownload = () => {
    if (!analysis) return;

    const PURPLE: [number, number, number] = [122, 38, 225];
    const PURPLE_DARK: [number, number, number] = [60, 15, 120];
    const CYAN: [number, number, number] = [50, 217, 255];
    const GOLD: [number, number, number] = [255, 195, 0];
    const WHITE: [number, number, number] = [255, 255, 255];
    const NEAR_BLACK: [number, number, number] = [25, 15, 45];
    const BODY_BG: [number, number, number] = [245, 243, 250];
    const MUTED: [number, number, number] = [140, 130, 160];
    const LIGHT_PURPLE: [number, number, number] = [235, 225, 250];

    const cleanAnalysis = stripForPdf(analysis);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setFont('helvetica', 'normal');
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 20; // 20mm side margin for comfortable reading
    const contentW = W - M * 2;
    let y = 0;
    let pageNum = 1;

    const drawPageBg = () => {
      doc.setFillColor(...BODY_BG);
      doc.rect(0, 0, W, H, 'F');
    };

    const drawHeader = () => {
      doc.setFillColor(...PURPLE_DARK);
      doc.rect(0, 0, W, 38, 'F');
      doc.setFillColor(...PURPLE);
      doc.rect(0, 0, W, 32, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(0, 32, W, 1.5, 'F');

      doc.setTextColor(...WHITE);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('BASQUEST+', M, 14);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CYAN);
      doc.text('Inteligencia Deportiva', M, 20);

      doc.setFillColor(...GOLD);
      doc.roundedRect(M, 23, 42, 6, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEAR_BLACK);
      doc.text('ANALISIS IA', M + 21, 27, { align: 'center' });

      y = 42;
    };

    const drawFooter = () => {
      doc.setFillColor(...PURPLE_DARK);
      doc.rect(0, H - 10, W, 10, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(0, H - 10, W, 0.6, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...CYAN);
      doc.text('BASQUEST+', M, H - 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 175, 200);
      doc.text(safeText(`${new Date().toLocaleDateString()} - ${gameLabel}`), M + 22, H - 3.5);
      doc.text(`Pag ${pageNum}`, W - M, H - 3.5, { align: 'right' });
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > H - 14) {
        drawFooter();
        doc.addPage();
        drawPageBg();
        pageNum++;
        drawHeader();
      }
    };

    // ── First page ──
    drawPageBg();
    drawHeader();

    // ── Score Hero Card ──
    const heroH = 28;
    doc.setFillColor(...PURPLE_DARK);
    doc.roundedRect(M, y, contentW, heroH, 5, 5, 'F');
    doc.setFillColor(...GOLD);
    doc.roundedRect(M, y, contentW, 2, 1, 1, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CYAN);
    doc.text(safeText(gameLabel).toUpperCase(), W / 2, y + 7, { align: 'center' });

    // Big score
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    const scoreText = `${totalPoints}  -  ${totalOpponent}`;
    doc.text(scoreText, W / 2, y + 18, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 175, 220);
    doc.text(`EQUIPO        RIVAL    -    ${numGames} partido(s)`, W / 2, y + 24, { align: 'center' });

    y += heroH + 6;

    // ============================================================
    // Render markdown-like content from cleaned analysis
    // ============================================================
    const renderInlineBold = (
      text: string,
      x: number,
      yPos: number,
      maxW: number,
      normalColor: [number, number, number],
      boldColor: [number, number, number],
      fontSize: number
    ): number => {
      doc.setFontSize(fontSize);
      const cleaned = safeText(text);
      const parts = cleaned.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
      // Build segments
      type Seg = { text: string; bold: boolean };
      const segs: Seg[] = parts.map(p =>
        p.startsWith('**') && p.endsWith('**')
          ? { text: p.slice(2, -2), bold: true }
          : { text: p, bold: false }
      );

      // Word-wrap across segments. Line-height 1.6 (pt -> mm: pt*0.3528*1.6)
      const lineH = fontSize * 0.3528 * 1.6;
      let cx = x;
      let cy = yPos;
      const startX = x;

      segs.forEach(seg => {
        doc.setFont('helvetica', seg.bold ? 'bold' : 'normal');
        doc.setTextColor(...(seg.bold ? boldColor : normalColor));
        const words = seg.text.split(/(\s+)/);
        words.forEach(word => {
          if (!word) return;
          const w = doc.getTextWidth(word);
          if (cx + w > startX + maxW && word.trim() !== '') {
            cy += lineH;
            cx = startX;
            if (word.match(/^\s+$/)) return;
          }
          doc.text(word, cx, cy);
          cx += w;
        });
      });
      return cy + lineH;
    };

    const lines = cleanAnalysis.split('\n');

    lines.forEach((rawLine) => {
      const line = safeText(rawLine);
      const trimmed = line.trim();

      if (trimmed === '' || trimmed === '---') {
        y += 3;
        return;
      }

      // ### Section heading -> purple bg box (13pt)
      if (/^#{1,3}\s+/.test(trimmed)) {
        const headingText = trimmed.replace(/^#{1,3}\s+/, '');
        ensureSpace(20);
        y += 6; // 16px gap before each section (~5.6mm)
        doc.setFillColor(...PURPLE);
        doc.roundedRect(M, y, contentW, 11, 2.5, 2.5, 'F');
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(safeText(headingText), M + 5, y + 7.6);
        y += 15;
        return;
      }

      // Whole-line bold **...** -> sub-heading (12pt)
      if (/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
        const txt = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
        ensureSpace(10);
        y += 2;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PURPLE);
        const wrapped = doc.splitTextToSize(safeText(txt), contentW);
        doc.text(wrapped, M, y + 5);
        y += wrapped.length * 6 + 3;
        return;
      }

      // Numbered list (tactical recs) - 11pt body
      const numMatch = trimmed.match(/^(\d+)[.)]\s*(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const text = numMatch[2];
        ensureSpace(14);
        y += 3.5; // ~10px separation between items

        doc.setFillColor(...PURPLE);
        doc.circle(M + 4, y + 4, 3.5, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(num, M + 4, y + 5.3, { align: 'center' });

        const endY = renderInlineBold(text, M + 11, y + 5, contentW - 12, NEAR_BLACK, PURPLE, 11);
        y = Math.max(y + 9, endY + 1);
        return;
      }

      // Bullet list ( * or - ) - 11pt body, square purple bullet ~4px (1.4mm)
      if (/^[*\-]\s+/.test(trimmed)) {
        const text = trimmed.replace(/^[*\-]\s+/, '');
        ensureSpace(10);
        y += 3.5; // 10px separation between bullets

        doc.setFillColor(...PURPLE);
        doc.rect(M + 1, y + 2.5, 1.4, 1.4, 'F');

        const endY = renderInlineBold(text, M + 6, y + 5, contentW - 7, NEAR_BLACK, PURPLE, 11);
        y = Math.max(y + 7, endY + 1);
        return;
      }

      // Normal paragraph - 11pt
      ensureSpace(10);
      y += 1.5;
      const endY = renderInlineBold(trimmed, M, y + 5, contentW, NEAR_BLACK, PURPLE, 11);
      y = endY + 2;
    });

    // ── Signature ──
    ensureSpace(22);
    y += 8;
    doc.setFillColor(...WHITE);
    doc.roundedRect(M, y, contentW, 16, 4, 4, 'F');
    doc.setFillColor(...GOLD);
    doc.roundedRect(M + 4, y, contentW - 8, 1.5, 0.7, 0.7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PURPLE);
    doc.text('Generado por BASQUEST+ - Inteligencia Deportiva con IA', W / 2, y + 10.5, { align: 'center' });

    drawFooter();

    const fileName = `BASQUEST_Analisis_IA_${gameLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);
    toast.success('PDF descargado');
  };

  const handleAnalyze = async () => {
    setOpen(true);
    if (analysis) return; // already cached

    setLoading(true);
    try {
      // Build stats payload as structured text
      const lines: string[] = [];
      lines.push(`📊 Contexto: ${gameLabel} | ${numGames} partido(s)`);
      lines.push(`Puntos equipo: ${totalPoints} | Puntos rival: ${totalOpponent}`);
      lines.push('');

      lines.push('--- Puntos por Cuarto ---');
      chartData.forEach(d => {
        lines.push(`${d.quarter}: Equipo ${d.points} pts (${d.pct}% TC) | Rival ${d.rival} pts`);
      });
      lines.push('');

      lines.push('--- Box Score ---');
      lines.push('Jugador | PTS | TC (%) | 2PT (%) | 3PT (%) | TL (%) | REB | AST | STL | PF | MIN%');
      boxScore.forEach(r => {
        lines.push(
          `${r.playerName} | ${r.pts} | ${r.fgm}/${r.fga} (${r.fgPct}%) | ${r.twoM}/${r.twoA} (${r.twoPct}%) | ${r.threeM}/${r.threeA} (${r.threePct}%) | ${r.ftM}/${r.ftA} (${r.ftPct}%) | ${r.reb} | ${r.ast} | ${r.stl} | ${r.pf} | ${r.courtTimePct}%`
        );
      });

      const { data, error } = await supabase.functions.invoke('analyze-stats', {
        body: { statsPayload: lines.join('\n') },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setAnalysis(null);
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo generar el análisis');
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-like rendering
  const renderAnalysis = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-extrabold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="text-sm font-bold text-foreground mt-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="text-sm text-muted-foreground ml-4 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      // Handle inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-sm text-muted-foreground">
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs font-bold"
        onClick={handleAnalyze}
      >
        <Sparkles className="w-4 h-4" />
        Análisis IA
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setAnalysis(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
              <Sparkles className="w-5 h-5 text-primary" />
              Análisis Inteligente
            </DialogTitle>
            {analysis && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
            )}
          </DialogHeader>
          <ScrollArea className="px-4 pb-4 max-h-[70vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-semibold">Analizando estadísticas...</p>
              </div>
            ) : analysis ? (
              <div className="space-y-0.5">{renderAnalysis(analysis)}</div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No se pudo generar el análisis.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AiAnalysis;
