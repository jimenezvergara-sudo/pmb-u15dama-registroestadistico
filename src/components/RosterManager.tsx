import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/types/basketball';
import { Plus, Trash2, Merge, Check, X, AlertTriangle, Pencil } from 'lucide-react';
import logoHorizontal from '@/assets/logo-basqest-horizontal.png';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const RosterManager: React.FC = () => {
  const { players, games, addPlayer, removePlayer, mergePlayers, updatePlayer } = useApp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  // Edit name dialog state
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [propagate, setPropagate] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = (p: Player) => {
    const parts = p.name.trim().split(/\s+/);
    const last = parts.length > 1 ? parts.slice(-1)[0] : '';
    const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '';
    setEditPlayer(p);
    setEditFirst(first);
    setEditLast(last);
    setEditNumber(String(p.number));
    setPropagate(false);
  };

  const historyCount = useMemo(() => {
    if (!editPlayer) return 0;
    return games.filter(g => g.roster.some(r => r.id === editPlayer.id)).length;
  }, [editPlayer, games]);

  const editParsedNumber = editNumber.trim() === '' ? NaN : parseInt(editNumber, 10);
  const editNumberDuplicate = !!editPlayer
    && !isNaN(editParsedNumber)
    && players.some(p => p.id !== editPlayer.id && p.number === editParsedNumber);
  const editNumberValid = !isNaN(editParsedNumber) && editParsedNumber >= 0 && !editNumberDuplicate;

  const confirmEdit = async () => {
    if (!editPlayer) return;
    if (editFirst.trim().length < 2 || editLast.trim().length < 2) {
      toast.error('Nombre y apellido deben tener al menos 2 caracteres');
      return;
    }
    if (!editNumberValid) {
      if (editNumberDuplicate) toast.error(`El número #${editParsedNumber} ya está en uso por otra jugadora`);
      else toast.error('Número de camiseta inválido');
      return;
    }
    const fullName = `${editFirst.trim()} ${editLast.trim()}`.replace(/\s+/g, ' ');
    if (fullName === editPlayer.name && editParsedNumber === editPlayer.number) {
      setEditPlayer(null);
      return;
    }
    setSaving(true);
    try {
      await updatePlayer(editPlayer.id, fullName, editParsedNumber, propagate);
      toast.success(
        propagate
          ? `Actualizada en plantilla y ${historyCount} partido(s) anteriores`
          : 'Actualizada solo para partidos futuros'
      );
      setEditPlayer(null);
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const usedNumbers = useMemo(() => new Set(players.map(p => p.number)), [players]);
  const parsedNumber = number.trim() === '' ? NaN : parseInt(number, 10);
  const numberDuplicate = !isNaN(parsedNumber) && usedNumbers.has(parsedNumber);
  const firstOk = firstName.trim().length >= 2;
  const lastOk = lastName.trim().length >= 2;
  const numberOk = !isNaN(parsedNumber) && parsedNumber >= 0 && !numberDuplicate;
  const canAdd = firstOk && lastOk && numberOk;

  const handleAdd = () => {
    if (!canAdd) {
      if (!firstOk || !lastOk) toast.error('Ingresa nombre y apellido (mín. 2 caracteres cada uno)');
      else if (numberDuplicate) toast.error(`El número #${parsedNumber} ya está en uso`);
      else toast.error('Número inválido');
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ');
    addPlayer({ name: fullName, number: parsedNumber });
    setFirstName('');
    setLastName('');
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

      <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Agregar jugadora</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Nombre"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Input
            placeholder="Apellido"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Nº camiseta"
            type="number"
            inputMode="numeric"
            value={number}
            onChange={e => setNumber(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className={`flex-1 text-center font-bold ${numberDuplicate ? 'border-destructive ring-2 ring-destructive/40' : ''}`}
          />
          <Button onClick={handleAdd} disabled={!canAdd} className="tap-feedback shrink-0 gap-1">
            <Plus className="w-4 h-4" /> Añadir
          </Button>
        </div>
        {numberDuplicate && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> El número #{parsedNumber} ya está asignado
          </p>
        )}
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

            {/* Edit name button - bottom right */}
            <button
              onClick={() => openEdit(p)}
              className="absolute bottom-1 right-1 text-muted-foreground hover:text-primary tap-feedback p-0.5"
              aria-label="Editar nombre"
            >
              <Pencil className="w-3 h-3" />
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

      {/* Edit player name dialog */}
      <Dialog open={!!editPlayer} onOpenChange={(o) => !o && setEditPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar nombre de jugadora</DialogTitle>
            <DialogDescription>
              Modifica el nombre y apellido. El número de camiseta se edita por separado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nombre</label>
                <Input value={editFirst} onChange={e => setEditFirst(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Apellido</label>
                <Input value={editLast} onChange={e => setEditLast(e.target.value)} />
              </div>
            </div>

            {historyCount > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">
                  Esta jugadora aparece en {historyCount} partido(s) anteriores
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!propagate}
                    onChange={() => setPropagate(false)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <strong>Solo partidos futuros</strong> — el historial mantiene el nombre original
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propagate}
                    onChange={() => setPropagate(true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <strong>Propagar al historial</strong> — actualiza el nombre en todos los partidos guardados
                  </span>
                </label>
                {propagate && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Esta acción reescribirá los rosters guardados
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPlayer(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={confirmEdit} disabled={saving} className="gap-2">
              <Check className="w-4 h-4" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RosterManager;
