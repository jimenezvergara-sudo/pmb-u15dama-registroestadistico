import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { QuarterId, QUARTER_LABELS, ActionType } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';

import SubstitutionDialog from '@/components/SubstitutionDialog';
import StartingLineup from '@/components/StartingLineup';
import LiveGameReport from '@/components/LiveGameReport';
import LiveActionLog from '@/components/LiveActionLog';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, BarChart3, Pause, Play } from 'lucide-react';
import { shareHalftimeWhatsApp } from '@/utils/halftimeShare';
import logoBasqest from '@/assets/logo-basqest-new.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

const LiveGame: React.FC = () => {
  const {
    activeGame, setQuarter, recordShot, undoLastShot, endGame,
    recordOpponentScore, undoLastOpponentScore, recordAction,
    setOnCourtPlayers, recordSubstitution, snapshotCourtTime, startGameTimer,
    myTeamName, myTeamLogo,
    deleteShot, deleteAction, deleteOpponentScore, toggleShotResult,
  } = useApp();
  const [pendingShot, setPendingShot] = useState<{ x: number; y: number; points: 1 | 2 | 3 } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [courtRotation, setCourtRotation] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [pendingQuarter, setPendingQuarter] = useState<QuarterId | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(false);

  // Flash visual de confirmación tras registrar una acción
  const [flash, setFlash] = useState<{ playerId: string; color: string } | null>(null);

  const triggerFlash = (playerId: string, color: string) => {
    setFlash({ playerId, color });
    window.setTimeout(() => setFlash(f => (f && f.playerId === playerId ? null : f)), 500);
  };

  // Periodically flush court time every 10s (skip while paused)
  useEffect(() => {
    if (!activeGame || !gameStarted || isPaused) return;
    const interval = setInterval(() => snapshotCourtTime(), 10000);
    return () => clearInterval(interval);
  }, [activeGame, gameStarted, isPaused, snapshotCourtTime]);

  const handleTogglePause = () => {
    if (isPaused) {
      // Resume: reset snapshot baseline so paused gap is not added to court time
      startGameTimer();
      setIsPaused(false);
      toast('▶ Partido reanudado', { duration: 1500 });
    } else {
      // Pause: flush time accumulated up to now, then stop the interval
      snapshotCourtTime();
      setIsPaused(true);
      toast.warning('⏸ Partido pausado — cronómetro detenido', { duration: 2000 });
    }
  };

  // Periodically flush court time every 10s
  useEffect(() => {
    if (!activeGame || !gameStarted) return;
    const interval = setInterval(() => snapshotCourtTime(), 10000);
    return () => clearInterval(interval);
  }, [activeGame, gameStarted, snapshotCourtTime]);

  if (!activeGame) return null;

  // Show starting lineup screen if game hasn't started yet
  if (!gameStarted && (activeGame.onCourtPlayerIds || []).length === 0) {
    return (
      <StartingLineup
        roster={activeGame.roster}
        onConfirm={(starterIds) => {
          setOnCourtPlayers(starterIds);
          startGameTimer();
          setGameStarted(true);
        }}
      />
    );
  }

  // Show lineup selector when changing quarters
  if (pendingQuarter) {
    return (
      <StartingLineup
        roster={activeGame.roster}
        preSelected={activeGame.onCourtPlayerIds || []}
        title={`Quinteto para ${QUARTER_LABELS[pendingQuarter]}`}
        subtitle={`Selecciona las 5 jugadoras que inician el ${QUARTER_LABELS[pendingQuarter]} (seleccionadas/5)`}
        buttonLabel={`Iniciar ${QUARTER_LABELS[pendingQuarter]}`}
        onConfirm={(starterIds) => {
          snapshotCourtTime();
          setOnCourtPlayers(starterIds);
          const incoming = pendingQuarter;
          setQuarter(incoming);
          setPendingQuarter(null);
          setSelectedPlayer(null);
          setPendingShot(null);
          // Suggest sharing the halftime summary when entering Q3
          if (incoming === 'Q3') {
            setTimeout(() => {
              toast('🏀 ¡Medio Tiempo! ¿Compartir resumen?', {
                duration: 8000,
                action: {
                  label: '📊 WhatsApp',
                  onClick: () => shareHalftimeWhatsApp(activeGame, { myTeamName }),
                },
              });
            }, 400);
          }
        }}
      />
    );
  }

  // If coming back to an already-started game
  if (!gameStarted && (activeGame.onCourtPlayerIds || []).length > 0) {
    setGameStarted(true);
  }

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayer(playerId);
    setPendingShot(null);
    setActionsPanelOpen(false); // Cambiar de jugadora cierra el panel
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
    triggerFlash(selectedPlayer, made ? 'hsl(142_72%_38%)' : 'hsl(0_75%_50%)');
    setPendingShot(null);
    setSelectedPlayer(null);
  };

  const handleUndo = () => {
    undoLastShot();
    toast('Último tiro deshecho', { duration: 1000 });
  };

  const handleQuickAction = (action: ActionType) => {
    if (!selectedPlayer) {
      toast('Selecciona una jugadora primero', { duration: 1500 });
      return;
    }
    const playerId = selectedPlayer;
    recordAction(playerId, action);
    const player = activeGame.roster.find(p => p.id === playerId);
    const labels: Record<string, string> = {
      rebound: 'Rebote', offensive_rebound: 'Rebote Ofensivo', defensive_rebound: 'Rebote Defensivo',
      assist: 'Asistencia', steal: 'Robo', turnover: 'Pérdida', foul: 'Falta',
    };
    const colors: Record<string, string> = {
      offensive_rebound: 'hsl(220_15%_25%)',
      defensive_rebound: 'hsl(220_15%_35%)',
      rebound: 'hsl(220_15%_30%)',
      assist: 'hsl(45_95%_50%)',
      steal: 'hsl(142_72%_38%)',
      turnover: 'hsl(0_75%_50%)',
      foul: 'hsl(25_95%_53%)',
    };
    toast(`#${player?.number} ${player?.name}: ${labels[action]}`, { duration: 1500 });
    triggerFlash(playerId, colors[action] || 'hsl(var(--primary))');
    setSelectedPlayer(null);

    if (action === 'foul') {
      const currentFouls = (activeGame.actions || []).filter(
        a => a.playerId === playerId && a.type === 'foul'
      ).length + 1; // +1 for the one just recorded
      if (currentFouls >= 5) {
        toast.error(`⚠️ #${player?.number} ${player?.name} tiene ${currentFouls} faltas!`, {
          duration: 4000,
          style: { background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' },
        });
      } else if (currentFouls === 4) {
        toast.warning(`⚠️ #${player?.number} ${player?.name}: 4 faltas — ¡una más y sale!`, {
          duration: 3000,
        });
      }
    }
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

  const onCourtIds = activeGame.onCourtPlayerIds || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header: Scoreboard */}
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 flex flex-col items-center">
            {myTeamLogo ? (
              <img src={myTeamLogo} alt={myTeamName || 'Local'} className="w-7 h-7 rounded-full object-cover mb-0.5 ring-1 ring-primary-foreground/30" />
            ) : (
              <img src={logoBasqest} alt="BASQUEST+" className="w-6 h-6 mb-0.5" />
            )}
            <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-bold">{myTeamName || 'Local'}</p>
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
                onClick={() => {
                  if (q !== activeGame.currentQuarter) setPendingQuarter(q);
                }}
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
                if (next !== activeGame.currentQuarter) setPendingQuarter(next);
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleTogglePause}
              aria-label={isPaused ? 'Reanudar partido' : 'Pausar partido'}
              className={`px-2 py-1 rounded text-xs font-bold tap-feedback flex items-center gap-1 ${
                isPaused
                  ? 'bg-success text-success-foreground animate-pulse'
                  : 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Reanudar' : 'Pausa'}
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="px-2.5 py-1 rounded text-xs font-bold tap-feedback bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              📊 Informe
            </button>
          </div>
        </div>
        {isPaused && (
          <div className="mt-2 px-2 py-1 rounded bg-warning/20 border border-warning/40 text-center">
            <p className="text-[10px] font-black text-primary-foreground uppercase tracking-widest">
              ⏸ PARTIDO PAUSADO — Cronómetro detenido
            </p>
          </div>
        )}
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

      {/* Player grid - show on-court indicator */}
      <div className="px-3 pt-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          {!selectedPlayer ? '1. Selecciona jugadora' : pendingShot ? '3. ¿Canasta o Fallo?' : '2. Toca zona en cancha'}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {activeGame.roster.map(player => {
            const isOnCourt = onCourtIds.includes(player.id);
            const fouls = (activeGame.actions || []).filter(a => a.playerId === player.id && a.type === 'foul').length;
            const isSelected = selectedPlayer === player.id;
            const isFlashing = flash?.playerId === player.id;
            return (
              <button
                key={player.id}
                onClick={() => handlePlayerSelect(player.id)}
                style={isFlashing ? { backgroundColor: flash!.color, color: '#fff' } : undefined}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl tap-feedback min-h-[64px] transition-all relative border-2 ${
                  isFlashing
                    ? 'scale-105 border-accent shadow-lg'
                    : isSelected
                      ? 'bg-card text-card-foreground border-accent ring-2 ring-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.4)] scale-[1.03]'
                      : 'bg-card text-card-foreground border-transparent hover:border-primary/50'
                } ${!isOnCourt ? 'opacity-40' : ''}`}
              >
                <span
                  className={`text-[28px] font-black leading-none ${
                    isSelected || isFlashing ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {player.number}
                </span>
                <span className="text-[11px] font-semibold leading-tight mt-0.5 truncate w-full text-center text-muted-foreground">
                  {player.name.split(' ')[0]}
                </span>
                {isOnCourt && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-background" />
                )}
                {fouls > 0 && (
                  <span className={`absolute top-1 left-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1 ${
                    fouls >= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : fouls === 4 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {fouls}F
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiro Libre + Cambios */}
      <div className="grid grid-cols-2 gap-2 px-3 pt-3 mb-1">
        <button
          onClick={() => handleZoneTap({ x: 50, y: 75, points: 1 })}
          className={`w-full min-h-[44px] px-2 py-2 rounded-xl text-sm font-bold tap-feedback border-2 flex items-center justify-center gap-1 ${
            pendingShot?.points === 1
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-card-foreground border-border hover:border-primary'
          }`}
        >
          🏀 Tiro Libre
        </button>
        <SubstitutionDialog
          roster={activeGame.roster}
          onCourtIds={onCourtIds}
          onSubstitute={(pIn, pOut) => {
            recordSubstitution(pIn, pOut);
            const nameIn = activeGame.roster.find(p => p.id === pIn);
            const nameOut = activeGame.roster.find(p => p.id === pOut);
            toast(`Cambio: #${nameIn?.number} entra ↔ #${nameOut?.number} sale`, { duration: 2000 });
          }}
        />
      </div>

      {/* Court */}
      <div className="px-2 flex-1 overflow-hidden min-h-[200px]">
        <CourtDiagram
          onZoneTap={handleZoneTap}
          shots={activeGame.shots.map(s => ({ x: s.x, y: s.y, made: s.made, points: s.points }))}
          rotation={courtRotation}
          onRotate={() => setCourtRotation(r => (r + 90) % 360)}
        />
      </div>

      {/* Panel de acciones secundarias — siempre visible, no tapa la cancha */}
      <div className="px-3 pt-2">
        <div className="grid grid-cols-3 gap-1.5" style={{ maxHeight: 120 }}>
          {([
            { key: 'offensive_rebound', label: 'Reb OF', emoji: '⬛', cls: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
            { key: 'defensive_rebound', label: 'Reb DEF', emoji: '⬛', cls: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
            { key: 'assist', label: 'Asistencia', emoji: '💛', cls: 'bg-accent text-accent-foreground hover:bg-accent/90' },
            { key: 'steal', label: 'Robo', emoji: '🖐️', cls: 'bg-primary text-primary-foreground hover:bg-primary/90' },
            { key: 'turnover', label: 'Pérdida', emoji: '❌', cls: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
            { key: 'foul', label: 'Falta', emoji: '🟡', cls: 'bg-accent text-accent-foreground hover:bg-accent/90' },
          ] as const).map(a => (
            <button
              key={a.key}
              onClick={() => handleQuickAction(a.key as ActionType)}
              disabled={!selectedPlayer}
              className={`min-h-[52px] rounded-xl text-sm font-bold tap-feedback flex flex-col items-center justify-center gap-0.5 border-2 transition-all active:scale-95 ${
                !selectedPlayer
                  ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                  : `${a.cls} border-transparent`
              }`}
            >
              <span className="text-base leading-none">{a.emoji}</span>
              <span className="text-xs leading-none">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Made / Missed + Acciones inferiores */}
      <div className="relative z-10 bg-background pt-2 mt-2">
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
        <div className="flex gap-3 px-3 pb-3 pt-2">
          <Button
            variant="outline"
            onClick={handleUndo}
            className="flex-1 gap-2 min-h-[48px] text-sm font-bold rounded-xl"
          >
            <Undo2 className="w-5 h-5" /> Deshacer
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="secondary"
                className="flex-1 min-h-[48px] text-sm font-bold rounded-xl"
              >
                ⏹ Finalizar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de que quieres finalizar el partido?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción guardará el partido con todas las estadísticas registradas. No podrás continuar anotando.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>NO, Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  snapshotCourtTime();
                  endGame();
                }}>SÍ, Finalizar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {/* Live Action Log */}
      <LiveActionLog
        game={activeGame}
        onDeleteShot={deleteShot}
        onDeleteAction={deleteAction}
        onDeleteOpponentScore={deleteOpponentScore}
        onToggleShotResult={toggleShotResult}
      />
      {/* Live Game Report */}
      {showReport && activeGame && (
        <LiveGameReport game={activeGame} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
};

export default LiveGame;
