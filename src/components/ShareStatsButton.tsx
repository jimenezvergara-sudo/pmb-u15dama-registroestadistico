import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const ShareStatsButton: React.FC = () => {
  const { user, profile } = useAuth();
  const { games, players, myTeamName, myTeamLogo, activeCategory } = useApp();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!user || !profile) return;
    setLoading(true);

    const snapshot = {
      teamName: myTeamName,
      teamLogo: myTeamLogo,
      category: activeCategory,
      games: games.map(g => ({
        id: g.id,
        opponentName: g.opponentName,
        date: g.date,
        shots: g.shots,
        opponentScores: g.opponentScores || [],
        actions: g.actions || [],
        roster: g.roster,
      })),
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
      })),
      sharedAt: new Date().toISOString(),
      sharedBy: profile.full_name || 'Usuario',
    };

    const { data, error } = await supabase
      .from('shared_stats')
      .insert({
        user_id: user.id,
        club_id: profile.club_id,
        title: `${myTeamName || 'Mi Equipo'} — ${activeCategory}`,
        data: snapshot as any,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Error al crear enlace de compartir');
      setLoading(false);
      return;
    }

    const url = `${window.location.origin}/public/${data.id}`;
    setShareUrl(url);
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Enlace copiado');
  };

  const shareWhatsApp = () => {
    if (!shareUrl) return;
    const text = `📊 Mira las estadísticas de ${myTeamName || 'mi equipo'} en BASQUEST+:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShareUrl(null); setCopied(false); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Share2 className="w-3.5 h-3.5" />
          Compartir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Compartir Estadísticas</DialogTitle>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Genera un enlace público para que cualquier persona pueda ver tus estadísticas sin necesidad de cuenta. El enlace expira en 30 días.
            </p>
            <Button onClick={handleShare} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Generar enlace
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 font-semibold">Tu enlace:</p>
              <p className="text-xs text-foreground break-all font-mono">{shareUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="flex-1 gap-2 text-xs">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button onClick={shareWhatsApp} className="flex-1 gap-2 text-xs bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,30%)]">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Cualquier persona con este enlace podrá ver tus estadísticas
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareStatsButton;
