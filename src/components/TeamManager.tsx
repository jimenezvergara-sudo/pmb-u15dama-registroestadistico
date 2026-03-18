import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Shield, Camera } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';

const TeamManager: React.FC = () => {
  const { teams, addTeam, removeTeam, myTeamName, setMyTeamName, myTeamLogo, setMyTeamLogo } = useApp();
  const [editingMyTeam, setEditingMyTeam] = useState(false);
  const [myTeamInput, setMyTeamInput] = useState(myTeamName);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setMyTeamLogo(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };
  const [clubName, setClubName] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');

  const handleAdd = () => {
    if (!clubName.trim()) return;
    addTeam({ clubName: clubName.trim(), city: city.trim(), region: region.trim() });
    setClubName('');
    setCity('');
    setRegion('');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-extrabold text-foreground">Equipos</h2>
        <img src={logoHorizontal} alt="BASQEST+" className="h-8 object-contain" />
      </div>

      {/* Mi equipo */}
      <div className="bg-card rounded-xl px-4 py-4 border-2 border-primary/30 space-y-3">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Mi Equipo</p>
        
        <div className="flex items-center gap-4">
          {/* Logo upload */}
          <label className="relative cursor-pointer group shrink-0">
            <input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
            {myTeamLogo ? (
              <img src={myTeamLogo} alt="Logo" className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/40 group-hover:ring-primary transition-all" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex flex-col items-center justify-center ring-2 ring-dashed ring-primary/30 group-hover:ring-primary transition-all">
                <Camera className="w-5 h-5 text-primary/60" />
                <span className="text-[8px] text-primary/60 font-bold mt-0.5">LOGO</span>
              </div>
            )}
          </label>

          {/* Name */}
          {editingMyTeam ? (
            <div className="flex-1 flex gap-2">
              <Input
                value={myTeamInput}
                onChange={e => setMyTeamInput(e.target.value)}
                placeholder="Nombre de mi equipo"
                className="h-9 text-sm"
                autoFocus
              />
              <Button size="sm" className="h-9" onClick={() => {
                setMyTeamName(myTeamInput.trim());
                setEditingMyTeam(false);
              }}>OK</Button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setMyTeamInput(myTeamName); setEditingMyTeam(true); }}>
              <p className="font-bold text-foreground text-lg truncate">{myTeamName || 'Toca para definir...'}</p>
              <p className="text-[10px] text-muted-foreground">Toca el nombre para editar · el círculo para subir logo</p>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-muted-foreground mt-4 mb-2">Equipos Rivales</h3>

      <div className="space-y-2">
        <Input placeholder="Nombre del Club" value={clubName} onChange={e => setClubName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Ciudad" value={city} onChange={e => setCity(e.target.value)} />
          <Input placeholder="Región" value={region} onChange={e => setRegion(e.target.value)} />
        </div>
        <Button onClick={handleAdd} disabled={!clubName.trim()} className="w-full tap-feedback gap-2">
          <Plus className="w-4 h-4" /> Añadir Equipo
        </Button>
      </div>

      <div className="space-y-2">
        {teams.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Añade equipos rivales para usarlos al crear partidos
          </p>
        )}
        {teams.map(t => (
          <div key={t.id} className="flex items-center bg-card rounded-lg px-3 py-3 gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{t.clubName}</p>
              <p className="text-xs text-muted-foreground">{t.city}{t.region ? `, ${t.region}` : ''}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive shrink-0"
              onClick={() => {
                if (confirm(`¿Eliminar ${t.clubName}?`)) removeTeam(t.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManager;
