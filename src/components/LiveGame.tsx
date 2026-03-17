import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { QuarterId, QUARTER_LABELS } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import logoBasqest from '@/assets/logo-basqest.png';

const QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const LiveGame: React.FC = () => {
  const { activeGame, setQuarter, recordShot, undoLastShot, endGame, recordOpponentScore, undoLastOpponentScore } = useApp();
  const [pendingShot, setPendingShot] = useState<{ x: number; y: number; points: 1 | 2 | 3 } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  if (!activeGame) return null;

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    setPendingShot(null);
  };

  const handleZoneTap = (zone: { x: number; y: number; points: 1 | 2 | 3 }) => {
    if (!selectedPlayer) {
      toast('Selecciona una jugadora primero', { duration: 1500 });
      return;
    }
    setPendingShot(zone);
  };

  const handleResult = (made: boolean) => {
    if (!pendingShot || !selectedPlayer) return;
    recordShot({
      playerId: selectedPlayer,
      x: pendingShot.x,
      y: pendingShot.y,
      made,
      points: pendingShot.points,
    });
    const player = activeGame.roster.find(p => p.id === selectedPlayer);
    const pts = made ? `+${pendingShot.points}` : 'Fallo';
    toast(`#${player?.number} ${player?.name}: ${pts}`, {
      duration: 1500,
      action: { label: 'Deshacer', onClick: undoLastShot },
    });
    setPendingShot(null);
  };

  const handleUndo = () => {
    undoLastShot();
    toast('Último tiro deshecho', { duration: 1000 });
  };

  const teamScore = activeGame.shots
    .filter(s => s.made)
    .reduce((sum, s) => sum + s.points, 0);

  const opponentTotal = (activeGame.opponentScores || [])
    .reduce((sum, s) => sum + s.points, 0);

  const quarterScore = activeGame.shots
    .filter(s => s.made && s.quarterId === activeGame.currentQuarter)
    .reduce((sum, s) => sum + s.points, 0);

  const opponentQuarterScore = (activeGame.opponentScores || [])
    .filter(s => s.quarterId === activeGame.currentQuarter)
    .reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header: Scoreboard */}
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 flex flex-col items-center">
            <img src={logoBasqest} alt="BASQEST+" className="w-6 h-6 mb-0.5" />
            <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">BASQEST+</p>
            <p className="text-4xl font-black text-primary-foreground leading-none">{teamScore}</p>
          </div>
          <div className="text-center px-3">
            <p className="text-[10px] text-primary-foreground/50 font-bold">VS</p>
            <p className="text-xs text-primary-foreground/60 font-medium mt-0.5">Q: {quarterScore}-{opponentQuarterScore}</p>
          </div>
          <div className="text-center flex-1 flex flex-col items-center">
            <div className="w-6 h-6 mb-0.5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground/70">VS</span>
            </div>
            <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold truncate">{activeGame.opponentName}</p>
            <p className="text-4xl font-black text-primary-foreground/80 leading-none">{opponentTotal}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {QUARTERS.slice(0, 4).map(q => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`px-2 py-1 rounded text-xs font-bold tap-feedback ${
                  activeGame.currentQuarter === q
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-primary-foreground/20 text-primary-foreground/70'
                }`}
              >
                {QUARTER_LABELS[q]}
              </button>
            ))}
            <button
              onClick={() => {
                const otQuarters = QUARTERS.filter(q => q.startsWith('OT'));
                const currentOt = otQuarters.indexOf(activeGame.currentQuarter as any);
                const next = otQuarters[currentOt >= 0 ? Math.min(currentOt + 1, otQuarters.length - 1) : 0];
                setQuarter(next);
              }}
              className={`px-2 py-1 rounded text-xs font-bold tap-feedback ${
                activeGame.currentQuarter.startsWith('OT')
                  ? 'bg-primary-foreground text-primary'
                  : 'bg-primary-foreground/20 text-primary-foreground/70'
              }`}
            >
              OT
            </button>
          </div>
        </div>
      </div>

      {/* Rival scoring */}
      <div className="bg-destructive/10 px-3 py-2 flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-destructive mr-auto uppercase tracking-wider">Rival</span>
        {([1, 2, 3] as const).map(pts => (
          <Button
            key={pts}
            size="sm"
            variant="outline"
            className="h-8 w-12 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground tap-feedback"
            onClick={() => {
              recordOpponentScore(pts);
              toast(`Rival: +${pts}`, { duration: 1000 });
            }}
          >
            +{pts}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-1.5 text-destructive"
          onClick={() => {
            undoLastOpponentScore();
            toast('Último punto rival deshecho', { duration: 1000 });
          }}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Player grid FIRST */}
      <div className="px-3 pt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {!selectedPlayer ? '1. Selecciona jugadora' : pendingShot ? '3. ¿Canasta o Fallo?' : '2. Toca zona en cancha'}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {activeGame.roster.map(player => (
            <button
              key={player.id}
              onClick={() => handlePlayerSelect(player.id)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg tap-feedback min-h-[52px] transition-colors ${
                selectedPlayer === player.id
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                  : 'bg-card text-card-foreground hover:bg-accent'
              }`}
            >
              <span className="text-lg font-extrabold leading-none">{player.number}</span>
              <span className="text-[10px] font-medium leading-tight mt-0.5 truncate w-full text-center">{player.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Free throw button */}
      <div className="flex justify-center px-2 pt-4 mb-1">
        <button
          onClick={() => handleZoneTap({ x: 50, y: 75, points: 1 })}
          className={`px-4 py-2 rounded-lg text-sm font-bold tap-feedback border-2 ${
            pendingShot?.points === 1
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-card-foreground border-border hover:border-primary'
          }`}
        >
          🏀 Tiro Libre (1pt)
        </button>
      </div>

      {/* Court */}
      <div className="px-2 flex-1 overflow-hidden">
        <CourtDiagram
          onZoneTap={handleZoneTap}
          shots={activeGame.shots.map(s => ({ x: s.x, y: s.y, made: s.made, points: s.points }))}
        />
      </div>

      {/* Made / Missed + Actions - always visible at bottom */}
      <div className="relative z-10 bg-background pt-4 mt-4">
        {pendingShot && selectedPlayer && (
          <div className="px-3 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleResult(true)}
                className="h-12 text-lg font-bold tap-feedback bg-success text-success-foreground hover:bg-success/90"
              >
                ✓ Canasta
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResult(false)}
                className="h-12 text-lg font-bold tap-feedback"
              >
                ✗ Fallo
              </Button>
            </div>
          </div>
        )}
        <div className="flex gap-2 px-3 pb-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleUndo} className="flex-1 gap-1">
            <Undo2 className="w-4 h-4" /> Deshacer
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('¿Finalizar partido?')) endGame();
            }}
            className="flex-1"
          >
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveGame;
