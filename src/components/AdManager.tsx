import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Loader2, Image, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Ad {
  id: string;
  image_url: string;
  destination_link: string;
  active: boolean;
  priority: number;
}

const AdManager: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [destLink, setDestLink] = useState('');
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchAds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('global_ads')
      .select('*')
      .order('priority', { ascending: false });
    if (data) setAds(data as Ad[]);
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const handleAdd = async () => {
    if (!imageUrl.trim()) { toast.error('Pega el link de la imagen'); return; }
    setSaving(true);
    const { error } = await supabase.from('global_ads').insert({
      image_url: imageUrl.trim(),
      destination_link: destLink.trim(),
      priority,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear anuncio'); return; }
    toast.success('Anuncio creado');
    setImageUrl(''); setDestLink(''); setPriority(0);
    fetchAds();
  };

  const toggleActive = async (ad: Ad) => {
    await supabase.from('global_ads').update({ active: !ad.active }).eq('id', ad.id);
    fetchAds();
  };

  const deleteAd = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio?')) return;
    await supabase.from('global_ads').delete().eq('id', id);
    toast('Anuncio eliminado');
    fetchAds();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
        <Image className="w-4 h-4" />
        Banners Publicitarios
      </h3>

      {/* Add form */}
      <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nuevo anuncio</p>
        <Input
          placeholder="URL de la imagen del banner"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          className="text-sm"
        />
        <Input
          placeholder="Link de destino (ej: https://sponsor.com)"
          value={destLink}
          onChange={e => setDestLink(e.target.value)}
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Prioridad:</label>
          <Input
            type="number"
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="w-20 text-sm"
            min={0}
          />
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-border" />
        )}
        <Button onClick={handleAdd} disabled={saving} size="sm" className="w-full gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar Banner
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : ads.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No hay anuncios</p>
      ) : (
        <div className="space-y-2">
          {ads.map(ad => (
            <div key={ad.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
              <img src={ad.image_url} alt="Ad" className="w-16 h-10 object-cover rounded-md border border-border flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {ad.destination_link || 'Sin enlace'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Prioridad: {ad.priority}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={ad.active} onCheckedChange={() => toggleActive(ad)} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdManager;
