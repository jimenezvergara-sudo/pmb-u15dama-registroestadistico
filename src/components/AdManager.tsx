import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Loader2, Image, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'url' | 'upload'>('upload');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `banner_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('ad-banners')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (error) {
      toast.error('Error al subir imagen');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('ad-banners')
      .getPublicUrl(fileName);

    setImageUrl(urlData.publicUrl);
    setUploadedPreview(URL.createObjectURL(file));
    setUploading(false);
    toast.success('Imagen subida correctamente');
  };

  const handleAdd = async () => {
    if (!imageUrl.trim()) {
      toast.error(mode === 'url' ? 'Pega el link de la imagen' : 'Sube una imagen primero');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('global_ads').insert({
      image_url: imageUrl.trim(),
      destination_link: destLink.trim(),
      priority,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear anuncio'); return; }
    toast.success('Anuncio creado');
    setImageUrl(''); setDestLink(''); setPriority(0); setUploadedPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const previewSrc = uploadedPreview || (mode === 'url' && imageUrl ? imageUrl : '');

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
        <Image className="w-4 h-4" />
        Banners Publicitarios
      </h3>

      {/* Add form */}
      <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nuevo anuncio</p>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as 'url' | 'upload'); setImageUrl(''); setUploadedPreview(''); }}>
          <TabsList className="w-full h-9">
            <TabsTrigger value="upload" className="flex-1 text-xs gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Subir imagen
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 text-xs gap-1.5">
              <Image className="w-3.5 h-3.5" /> Desde URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3 space-y-2">
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Toca para seleccionar imagen
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    PNG, JPG o WEBP · Máx 5MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileUpload}
            />
          </TabsContent>

          <TabsContent value="url" className="mt-3">
            <Input
              placeholder="URL de la imagen del banner"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="text-sm"
            />
          </TabsContent>
        </Tabs>

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
        {previewSrc && (
          <img src={previewSrc} alt="Preview" className="w-full h-24 object-cover rounded-lg border border-border" />
        )}
        <Button onClick={handleAdd} disabled={saving || uploading} size="sm" className="w-full gap-1.5">
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
