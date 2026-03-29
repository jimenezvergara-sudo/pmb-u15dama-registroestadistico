import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/types/basketball';
import { Plus, Trash2, Merge, Check, X } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';
import { toast } from 'sonner';

const RosterManager: React.FC = () => {
  const { players, addPlayer, removePlayer, mergePlayers } = useApp();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeKeep, setMergeKeep] = useState<string | null>(null);
  const [mergeRemove, setMergeRemove] = useState<string | null>(null);
  const [mergeNumber, setMergeNumber] = useState<number | null>(null);

  const handleAdd = () => {
    if (!name.trim() || !number.trim()) return;
    addPlayer({ name: name.trim(), number: parseInt(number) });
    setName('');
    setNumber('');
  };

  const handleMergeTap = (id: string) => {
    if (!mergeKeep) {
      setMergeKeep(id);
      const p = players.find(x => x.id === id);
      if (p) setMergeNumber(p.number);
    } else if (id === mergeKeep) {
      setMergeKeep(null);
      setMergeNumber(null);
    } else {
      setMergeRemove(id);
    }
  };

  const confirmMerge = async () => {
    if (!mergeKeep || !mergeRemove || mergeNumber == null) return;
    const keepP = players.find(p => p.id === mergeKeep);
    const removeP = players.find(p => p.id === mergeRemove);
    await mergePlayers(mergeKeep, mergeRemove, mergeNumber);
    toast.success(`Fusionadas: ${removeP?.name} → ${keepP?.name} (#${mergeNumber})`);
    resetMerge();
  };

  const resetMerge = () => {
    setMergeMode(false);
    setMergeKeep(null);
    setMergeRemove(null);
    setMergeNumber(null);
  };

  const keepPlayer = mergeKeep ? players.find(p => p.id === mergeKeep) : null;
  const removePlayer2 = mergeRemove ? players.find(p => p.id === mergeRemove) : null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Plantilla</h2>
        <img src={logoHorizontal} alt="BASQUEST+" className="h-8 object-contain" />
      </div>

      {!mergeMode && (
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
      )}

      {players.length >= 2 && (
        <Button
          variant={mergeMode ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => mergeMode ? resetMerge() : setMergeMode(true)}
          className="w-full gap-2"
        >
          {mergeMode ? <><X className="w-4 h-4" /> Cancelar fusión</> : <><Merge className="w-4 h-4" /> Fusionar jugadoras</>}
        </Button>
      )}

      {mergeMode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-primary">
            {!mergeKeep
              ? '1. Toca la jugadora que quieras MANTENER'
              : !mergeRemove
              ? '2. Toca la jugadora que quieras ELIMINAR (sus stats se fusionarán)'
              : '3. Elige el número y confirma'}
          </p>
          {mergeKeep && mergeRemove && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-foreground">{removePlayer2?.name} (#{removePlayer2?.number})</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-bold text-primary">{keepPlayer?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Número final:</span>
                <select
                  value={mergeNumber ?? ''}
                  onChange={e => setMergeNumber(parseInt(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm font-bold"
                >
                  <option value={keepPlayer?.number}>#{keepPlayer?.number} ({keepPlayer?.name})</option>
                  <option value={removePlayer2?.number}>#{removePlayer2?.number} ({removePlayer2?.name})</option>
                </select>
              </div>
              <Button onClick={confirmMerge} size="sm" className="w-full gap-2">
                <Check className="w-4 h-4" /> Confirmar fusión
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8 col-span-3">
            Añade jugadoras para empezar
          </p>
        )}
        {[...players].sort((a, b) => a.number - b.number).map((p: Player) => {
          const isKeep = mergeKeep === p.id;
          const isRemove = mergeRemove === p.id;
          return (
            <div
              key={p.id}
              onClick={() => mergeMode ? handleMergeTap(p.id) : undefined}
              className={`relative flex flex-col items-center justify-center rounded-lg p-2 aspect-square transition-colors ${
                mergeMode ? 'cursor-pointer' : ''
              } ${
                isKeep ? 'bg-primary/20 ring-2 ring-primary' :
                isRemove ? 'bg-destructive/20 ring-2 ring-destructive' :
                'bg-card'
              }`}
            >
              <span className={`text-2xl font-extrabold ${
                isKeep ? 'text-primary' : isRemove ? 'text-destructive' : 'text-primary'
              }`}>{p.number}</span>
              <span className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">{p.name.split(' ')[0]}</span>
              {isKeep && <span className="text-[8px] text-primary font-bold">mantener</span>}
              {isRemove && <span className="text-[8px] text-destructive font-bold">eliminar</span>}
              {!mergeMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                  className="absolute top-1 right-1 text-muted-foreground hover:text-destructive tap-feedback p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RosterManager;
