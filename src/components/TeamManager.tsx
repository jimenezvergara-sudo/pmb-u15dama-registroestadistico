import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Shield } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';

const TeamManager: React.FC = () => {
  const { teams, addTeam, removeTeam } = useApp();
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
      <h2 className="text-xl font-extrabold text-foreground">Equipos Rivales</h2>

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
