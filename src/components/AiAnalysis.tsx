import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    const blob = new Blob([analysis], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis-ia-${gameLabel.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          `#${r.number} ${r.playerName} | ${r.pts} | ${r.fgm}/${r.fga} (${r.fgPct}%) | ${r.twoM}/${r.twoA} (${r.twoPct}%) | ${r.threeM}/${r.threeA} (${r.threePct}%) | ${r.ftM}/${r.ftA} (${r.ftPct}%) | ${r.reb} | ${r.ast} | ${r.stl} | ${r.pf} | ${r.courtTimePct}%`
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
