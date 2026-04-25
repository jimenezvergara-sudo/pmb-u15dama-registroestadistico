import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
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

      // Decorative
      doc.setFillColor(255, 255, 255);
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.circle(W - 25, 8, 30, 'F');
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: 1 }));

      doc.setTextColor(...WHITE);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('BASQUEST+', M, 14);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CYAN);
      doc.text('Inteligencia Deportiva', M, 20);

      // Analysis badge
      doc.setFillColor(...GOLD);
      doc.roundedRect(M, 23, 42, 6, 3, 3, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NEAR_BLACK);
      doc.text('⚡ ANALISIS IA', M + 21, 27, { align: 'center' });

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
      doc.text(`${new Date().toLocaleDateString()} · ${gameLabel}`, M + 22, H - 3.5);
      doc.text(`Pág ${pageNum}`, W - M, H - 3.5, { align: 'right' });
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

    // Context card
    doc.setFillColor(...WHITE);
    doc.roundedRect(M, y, contentW, 16, 4, 4, 'F');
    doc.setFillColor(...PURPLE);
    doc.roundedRect(M, y, 3, 16, 1.5, 1.5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NEAR_BLACK);
    doc.text(`📊 ${gameLabel}`, M + 7, y + 6.5);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(`${numGames} partido(s) · Equipo ${totalPoints} pts · Rival ${totalOpponent} pts`, M + 7, y + 12.5);
    y += 22;

    // ── Render analysis ──
    const lines = analysis.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed === '') {
        y += 3;
        return;
      }

      // Heading ##
      if (trimmed.startsWith('## ')) {
        ensureSpace(14);
        y += 4;
        // Section divider
        doc.setFillColor(...PURPLE);
        doc.roundedRect(M, y, 3, 7, 1.5, 1.5, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NEAR_BLACK);
        doc.text(trimmed.slice(3), M + 6, y + 5.5);
        y += 11;
        return;
      }

      // Bold line **...**
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        ensureSpace(8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PURPLE);
        const wrapped = doc.splitTextToSize(trimmed.slice(2, -2), contentW - 4);
        doc.text(wrapped, M + 2, y + 4);
        y += wrapped.length * 4.5 + 3;
        return;
      }

      // Bullet point
      if (trimmed.startsWith('- ')) {
        ensureSpace(8);
        const text = trimmed.slice(2);
        // Parse inline bold
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        let xPos = M + 7;

        // Bullet dot
        doc.setFillColor(...GOLD);
        doc.circle(M + 4, y + 3, 1, 'F');

        // Wrap the full text first for spacing
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const plainText = text.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(plainText, contentW - 10);

        if (wrapped.length === 1) {
          // Single line - render with inline bold
          parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...NEAR_BLACK);
              doc.text(part.slice(2, -2), xPos, y + 4);
              xPos += doc.getTextWidth(part.slice(2, -2));
            } else {
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...MUTED);
              doc.text(part, xPos, y + 4);
              xPos += doc.getTextWidth(part);
            }
          });
          y += 6;
        } else {
          // Multi-line - render plain
          doc.setTextColor(...MUTED);
          doc.text(wrapped, M + 7, y + 4);
          y += wrapped.length * 4 + 2;
        }
        return;
      }

      // Numbered list
      if (/^\d+\./.test(trimmed)) {
        ensureSpace(8);
        const num = trimmed.match(/^(\d+)\./)?.[1] || '';
        const text = trimmed.replace(/^\d+\.\s*/, '');
        doc.setFontSize(8);

        // Number badge
        doc.setFillColor(...PURPLE);
        doc.circle(M + 4, y + 3, 2.5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text(num, M + 4, y + 4, { align: 'center' });

        // Text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        const wrapped = doc.splitTextToSize(text.replace(/\*\*/g, ''), contentW - 12);
        doc.text(wrapped, M + 9, y + 4);
        y += wrapped.length * 4 + 3;
        return;
      }

      // Normal paragraph
      ensureSpace(8);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...NEAR_BLACK);
      const plainText = trimmed.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(plainText, contentW - 4);
      doc.text(wrapped, M + 2, y + 4);
      y += wrapped.length * 4 + 2;
    });

    // Signature
    ensureSpace(20);
    y += 6;
    doc.setFillColor(...WHITE);
    doc.roundedRect(M, y, contentW, 14, 4, 4, 'F');
    doc.setFillColor(...GOLD);
    doc.roundedRect(M + 4, y, contentW - 8, 1.5, 0.7, 0.7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('⚡ Generado por BASQUEST+ — Inteligencia Deportiva con IA', W / 2, y + 9, { align: 'center' });

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
