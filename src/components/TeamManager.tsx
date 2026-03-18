import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Shield } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';

const TeamManager: React.FC = () => {
  const { teams, addTeam, removeTeam, myTeamName, setMyTeamName } = useApp();
  const [editingMyTeam, setEditingMyTeam] = useState(false);
  const [myTeamInput, setMyTeamInput] = useState(myTeamName);
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
      <div className="bg-card rounded-lg px-3 py-3 flex items-center gap-3 border-2 border-primary/30">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        {editingMyTeam ? (
          <div className="flex-1 flex gap-2">
            <Input
              value={myTeamInput}
              onChange={e => setMyTeamInput(e.target.value)}
              placeholder="Nombre de mi equipo"
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8" onClick={() => {
              setMyTeamName(myTeamInput.trim());
              setEditingMyTeam(false);
            }}>OK</Button>
          </div>
        ) : (
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setMyTeamInput(myTeamName); setEditingMyTeam(true); }}>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Mi Equipo</p>
            <p className="font-semibold text-foreground truncate">{myTeamName || 'Toca para definir...'}</p>
          </div>
        )}
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
