import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trophy, BarChart3 } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';
import TournamentStandings from '@/components/TournamentStandings';
import AdBannerCarousel from '@/components/AdBannerCarousel';

const TournamentManager: React.FC = () => {
  const { tournaments, addTournament } = useApp();
  const [name, setName] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    addTournament({ name: name.trim(), date: new Date().toISOString() });
    setName('');
  };

  if (selectedTournament) {
    return (
      <TournamentStandings
        tournamentId={selectedTournament.id}
        tournamentName={selectedTournament.name}
        onBack={() => setSelectedTournament(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Torneos</h2>
        <img src={logoHorizontal} alt="BASQUEST+" className="h-8 object-contain" />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nombre del torneo"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Button onClick={handleAdd} size="icon" className="tap-feedback shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {tournaments.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Añade un torneo para organizar partidos
          </p>
        )}
        {tournaments.map(t => (
          <div key={t.id} className="flex items-center bg-card rounded-lg px-3 py-3 gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-foreground">{t.name}</span>
              <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTournament({ id: t.id, name: t.name })}
              className="shrink-0"
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Tabla
            </Button>
          </div>
        ))}
      </div>

      {/* Banner publicitario */}
      <AdBannerCarousel />
    </div>
  );
};

export default TournamentManager;
