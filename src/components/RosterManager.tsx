import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/types/basketball';
import { Plus, Trash2, Merge, Check, X } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const RosterManager: React.FC = () => {
  const { players, addPlayer, removePlayer, mergePlayers } = useApp();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [mergeDialog, setMergeDialog] = useState<{
    keepId: string;
    removeId: string;
    keepName: string;
    removeName: string;
    keepNumber: number;
    removeNumber: number;
  } | null>(null);
  const [chosenName, setChosenName] = useState('');
  const [chosenNumber, setChosenNumber] = useState<number>(0);

  const handleAdd = () => {
    if (!name.trim() || !number.trim()) return;
    addPlayer({ name: name.trim(), number: parseInt(number) });
    setName('');
    setNumber('');
  };

  const openMergeDialog = (keepId: string, removeId: string) => {
    const keep = players.find(p => p.id === keepId);
    const remove = players.find(p => p.id === removeId);
    if (!keep || !remove) return;
    setMergeDialog({
      keepId, removeId,
      keepName: keep.name, removeName: remove.name,
      keepNumber: keep.number, removeNumber: remove.number,
    });
    setChosenName(keep.name);
    setChosenNumber(keep.number);
  };

  const confirmMerge = async () => {
    if (!mergeDialog) return;
    await mergePlayers(mergeDialog.keepId, mergeDialog.removeId, chosenNumber, chosenName);
    toast.success(`Fusionadas: ${mergeDialog.removeName} → ${chosenName} (#${chosenNumber})`);
    setMergeDialog(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Plantilla</h2>
        <img src={logoHorizontal} alt="BASQUEST+" className="h-8 object-contain" />
      </div>

      <div className="flex gap-2">
        <Input placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} className="flex-1" />
        <Input placeholder="#" type="number" value={number} onChange={e => setNumber(e.target.value)} className="w-16 text-center" />
        <Button onClick={handleAdd} size="icon" className="tap-feedback shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Merge confirmation dialog */}
      {mergeDialog && (
        <div className="rounded-lg border-2 border-[hsl(45,100%,50%)] bg-primary/5 p-3 space-y-3">
          <p className="text-sm font-bold text-foreground">Fusionar jugadoras</p>
          <p className="text-xs text-muted-foreground">
            Los datos de <strong>{mergeDialog.removeName}</strong> se fusionarán con <strong>{mergeDialog.keepName}</strong>.
          </p>
          <div className="space-y-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Nombre a mantener:</span>
              <select
                value={chosenName}
                onChange={e => setChosenName(e.target.value)}
                className="ml-2 h-8 rounded-md border border-input bg-background px-2 text-sm font-bold"
              >
                <option value={mergeDialog.keepName}>{mergeDialog.keepName}</option>
                <option value={mergeDialog.removeName}>{mergeDialog.removeName}</option>
              </select>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Número a mantener:</span>
              <select
                value={chosenNumber}
                onChange={e => setChosenNumber(parseInt(e.target.value))}
                className="ml-2 h-8 rounded-md border border-input bg-background px-2 text-sm font-bold"
              >
                <option value={mergeDialog.keepNumber}>#{mergeDialog.keepNumber} ({mergeDialog.keepName})</option>
                <option value={mergeDialog.removeNumber}>#{mergeDialog.removeNumber} ({mergeDialog.removeName})</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmMerge} size="sm" className="flex-1 gap-2">
              <Check className="w-4 h-4" /> Confirmar
            </Button>
            <Button onClick={() => setMergeDialog(null)} size="sm" variant="destructive" className="flex-1 gap-2">
              <X className="w-4 h-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8 col-span-3">
            Añade jugadoras para empezar
          </p>
        )}
        {[...players].sort((a, b) => a.number - b.number).map((p: Player) => (
          <div
            key={p.id}
            className="relative flex flex-col items-center justify-center rounded-lg p-2 aspect-square bg-card border-2 border-[hsl(45,100%,50%)]"
          >
            {/* Delete button - top right */}
            <button
              onClick={() => removePlayer(p.id)}
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive tap-feedback p-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {/* Merge button - top left */}
            {players.length >= 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="absolute top-1 left-1 text-muted-foreground hover:text-primary tap-feedback p-0.5">
                    <Merge className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[140px]">
                  {players.filter(x => x.id !== p.id).sort((a, b) => a.number - b.number).map(other => (
                    <DropdownMenuItem key={other.id} onClick={() => openMergeDialog(p.id, other.id)}>
                      #{other.number} {other.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <span className="text-2xl font-extrabold text-primary">{p.number}</span>
            <span className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosterManager;
