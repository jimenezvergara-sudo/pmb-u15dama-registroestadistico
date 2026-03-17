import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/types/basketball';
import { Plus, Trash2 } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';

const RosterManager: React.FC = () => {
  const { players, addPlayer, removePlayer } = useApp();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !number.trim()) return;
    addPlayer({ name: name.trim(), number: parseInt(number) });
    setName('');
    setNumber('');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Plantilla</h2>
        <img src={logoHorizontal} alt="BASQEST+" className="h-8 object-contain" />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="#"
          type="number"
          value={number}
          onChange={e => setNumber(e.target.value)}
          className="w-16 text-center"
        />
        <Button onClick={handleAdd} size="icon" className="tap-feedback shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            Añade jugadoras para empezar
          </p>
        )}
        {players.map((p: Player) => (
          <div key={p.id} className="flex items-center bg-card rounded-lg px-3 py-3 gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-extrabold text-sm">{p.number}</span>
            </div>
            <span className="flex-1 font-semibold text-foreground">{p.name}</span>
            <button onClick={() => removePlayer(p.id)} className="text-muted-foreground hover:text-destructive tap-feedback p-2">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosterManager;
