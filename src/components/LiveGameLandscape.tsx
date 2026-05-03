import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, BarChart3, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { QuarterId, QUARTER_LABELS, ActionType, Game, Player } from '@/types/basketball';
import CourtDiagram from '@/components/CourtDiagram';
import SubstitutionDialog from '@/components/SubstitutionDialog';
import LiveActionLog from '@/components/LiveActionLog';
import LiveGameReport from '@/components/LiveGameReport';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const QUARTERS: QuarterId[] = ['Q1', 'Q2', 'Q3', 'Q4', 'OT1', 'OT2', 'OT3'];

interface Props {
  activeGame: Game;
  myTeamName: string;
  t: { player: string; players: string; the: string };
  // State
  selectedPlayer: string | null;
  pendingShot: { x: number; y: number; points: 1 | 2 | 3 } | null;
  isPaused: boolean;
  flash: { playerId: string; color: string } | null;
  courtRotation: number;
  showReport: boolean;
  // Setters / handlers
  setSelectedPlayer: (id: string | null) => void;
  setPendingShot: (s: { x: number; y: number; points: 1 | 2 | 3 } | null) => void;
  setShowReport: (open: boolean) => void;
  setPendingQuarter: (q: QuarterId | null) => void;
  setCourtRotation: React.Dispatch<React.SetStateAction<number>>;
  handlePlayerSelect: (id: string) => void;
  handleQuickAction: (action: ActionType) => void;
  handleResult: (made: boolean) => void;
  handleUndo: () => void;
  handleTogglePause: () => void;
  // Active game ops
  recordOpponentScore: (pts: 1 | 2 | 3) => void;
  undoLastOpponentScore: () => void;
  recordSubstitution: (pIn: string, pOut: string) => void;
  snapshotCourtTime: () => void;
  endGame: () => void;
  deleteShot: (id: string) => void;
  deleteAction: (id: string) => void;
  deleteOpponentScore: (id: string) => void;
  toggleShotResult: (id: string) => void;
}

const LiveGameLandscape: React.FC<Props> = ({
  activeGame, myTeamName, t,
  selectedPlayer, pendingShot, isPaused, flash, courtRotation, showReport,
  setPendingShot, setShowReport, setPendingQuarter, setCourtRotation,
  handlePlayerSelect, handleQuickAction, handleResult, handleUndo, handleTogglePause,
  recordOpponentScore, undoLastOpponentScore, recordSubstitution,
  snapshotCourtTime, endGame,
  deleteShot, deleteAction, deleteOpponentScore, toggleShotResult,
}) => {
  const teamScore = activeGame.shots.filter(s => s.made).reduce((sum, s) => sum + s.points, 0);
  const opponentTotal = (activeGame.opponentScores || []).reduce((sum, s) => sum + s.points, 0);
  const onCourtIds = activeGame.onCourtPlayerIds || [];
  const hasCourtPosition = !!pendingShot;

  const handleLandscapeZoneTap = (zone: { x: number; y: number; points: 1 | 2 | 3 }) => {
    if (!selectedPlayer) {
      toast(`Selecciona ${t.the === 'el' ? 'un' : 'una'} ${t.player} primero`, { duration: 1500 });
      return;
    }
    setPendingShot(zone);
  };

  const handleFreeThrow = () => {
    if (!selectedPlayer) {
      toast(`Selecciona ${t.the === 'el' ? 'un' : 'una'} ${t.player} primero`, { duration: 1500 });
      return;
    }
    setPendingShot({ x: 50, y: 75, points: 1 });
  };

  const statusMsg = !selectedPlayer
    ? `1. Selecciona ${t.player}`
    : hasCourtPosition
      ? '3. ¿Canasta o Fallo?'
      : '2. Toca la cancha o TL';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Compact scoreboard */}
      <div className="bg-primary px-3 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-primary-foreground/70 font-bold uppercase truncate">{myTeamName || 'Local'}</span>
          <span className="text-2xl font-black text-primary-foreground leading-none">{teamScore}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {QUARTERS.slice(0, 4).map(q => (
            <button
              key={q}
              onClick={() => { if (q !== activeGame.currentQuarter) setPendingQuarter(q); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tap-feedback ${
                activeGame.currentQuarter === q ? 'bg-primary-foreground text-primary' : 'bg-primary-foreground/20 text-primary-foreground/70'
              }`}
            >{QUARTER_LABELS[q]}</button>
          ))}
          <button
            onClick={handleTogglePause}
            aria-label={isPaused ? 'Reanudar' : 'Pausa'}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tap-feedback flex items-center ${
              isPaused ? 'bg-success text-success-foreground animate-pulse' : 'bg-primary-foreground/20 text-primary-foreground'
            }`}
          >{isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}</button>
          <button
            onClick={() => setShowReport(true)}
            aria-label="Informe en vivo"
            className="px-1.5 py-0.5 rounded text-[10px] font-bold tap-feedback bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-0.5"
          >
            <BarChart3 className="w-3 h-3" /> 📊
          </button>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-2xl font-black text-primary-foreground/80 leading-none">{opponentTotal}</span>
          <span className="text-[10px] text-primary-foreground/70 font-bold uppercase truncate">{activeGame.opponentName}</span>
        </div>
      </div>

      {/* Rival quick row */}
      <div className="bg-destructive/10 px-2 py-1 flex items-center gap-1 flex-shrink-0">
        <span className="text-[9px] font-bold text-destructive uppercase">Rival</span>
        {([1, 2, 3] as const).map(pts => (
          <Button
            key={pts}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] font-bold border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => { recordOpponentScore(pts); toast(`Rival: +${pts}`, { duration: 800 }); }}
          >+{pts}</Button>
        ))}
        <Button size="sm" variant="ghost" className="h-6 px-1 text-destructive" onClick={() => undoLastOpponentScore()}>
          <Undo2 className="w-3 h-3" />
        </Button>
        <span className="text-[10px] font-bold text-foreground ml-auto truncate">{statusMsg}</span>
      </div>

      {/* Split */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT 40% */}
        <div className="basis-[40%] flex flex-col gap-1.5 px-2 py-1.5 overflow-y-auto border-r border-border/60">
          {/* Player grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {activeGame.roster.map((player: Player) => {
              const isOnCourt = onCourtIds.includes(player.id);
              const fouls = (activeGame.actions || []).filter(a => a.playerId === player.id && a.type === 'foul').length;
              const isSelected = selectedPlayer === player.id;
              const isFlashing = flash?.playerId === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player.id)}
                  style={isFlashing ? { backgroundColor: flash!.color, color: '#fff' } : undefined}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg tap-feedback min-h-[56px] transition-all relative border-2 ${
                    isFlashing
                      ? 'scale-105 border-accent shadow-lg'
                      : isSelected
                        ? 'bg-card text-card-foreground border-accent ring-2 ring-accent scale-[1.03]'
                        : 'bg-card text-card-foreground border-transparent hover:border-primary/50'
                  } ${!isOnCourt ? 'opacity-40' : ''}`}
                >
                  <span className={`text-2xl font-black leading-none ${isSelected || isFlashing ? 'text-accent' : 'text-foreground'}`}>
                    {player.number}
                  </span>
                  <span className="text-[10px] font-semibold leading-tight mt-0.5 truncate w-full text-center text-muted-foreground">
                    {player.name.split(' ')[0]}
                  </span>
                  {isOnCourt && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-success ring-1 ring-background" />}
                  {fouls > 0 && (
                    <span className={`absolute top-0.5 left-0.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-black flex items-center justify-center px-0.5 ${
                      fouls >= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : fouls === 4 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>{fouls}F</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TL */}
          <button
            onClick={handleFreeThrow}
            disabled={!selectedPlayer}
            className={`w-full min-h-[44px] rounded-lg text-xs font-bold tap-feedback border-2 flex items-center justify-center gap-1.5 ${
              !selectedPlayer
                ? 'bg-muted text-muted-foreground border-border opacity-50'
                : pendingShot?.points === 1
                  ? 'bg-accent text-accent-foreground border-accent ring-2 ring-accent'
                  : 'bg-card text-card-foreground border-border hover:border-primary'
            }`}
          >
            🏀 Tiro Libre
          </button>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: 'offensive_rebound' as ActionType, label: 'Reb OF', emoji: '💪' },
              { key: 'defensive_rebound' as ActionType, label: 'Reb DEF', emoji: '🛡️' },
              { key: 'assist' as ActionType, label: 'Asist.', emoji: '🤝' },
              { key: 'steal' as ActionType, label: 'Robo', emoji: '⚡' },
              { key: 'turnover' as ActionType, label: 'Pérd.', emoji: '💨' },
              { key: 'foul' as ActionType, label: 'Falta', emoji: '✋' },
            ]).map(a => (
              <button
                key={a.key}
                onClick={() => handleQuickAction(a.key)}
                disabled={!selectedPlayer}
                className={`min-h-[48px] rounded-lg text-xs font-bold tap-feedback border-2 flex flex-col items-center justify-center gap-0.5 ${
                  !selectedPlayer
                    ? 'bg-muted text-muted-foreground border-border opacity-50'
                    : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                }`}
              >
                <span className="text-base leading-none">{a.emoji}</span>
                <span className="text-[10px] leading-none">{a.label}</span>
              </button>
            ))}
          </div>

          <SubstitutionDialog
            roster={activeGame.roster}
            onCourtIds={onCourtIds}
            onSubstitute={(pIn, pOut) => {
              recordSubstitution(pIn, pOut);
              const nameIn = activeGame.roster.find(p => p.id === pIn);
              const nameOut = activeGame.roster.find(p => p.id === pOut);
              toast(`Cambio: #${nameIn?.number} ↔ #${nameOut?.number}`, { duration: 1500 });
            }}
          />

          <div className="grid grid-cols-2 gap-1.5 mt-auto">
            <Button variant="outline" onClick={handleUndo} className="h-9 text-[11px] font-bold rounded-lg">
              <Undo2 className="w-3.5 h-3.5 mr-1" /> Deshacer
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" className="h-9 text-[11px] font-bold rounded-lg">⏹ Finalizar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Finalizar el partido?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción guardará el partido con todas las estadísticas registradas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>NO, Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { snapshotCourtTime(); endGame(); }}>SÍ, Finalizar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* RIGHT 60% */}
        <div className="relative flex-1 basis-[60%] min-w-0 px-1 py-1 flex flex-col">
          <div className="relative flex-1 min-h-0 flex items-center justify-center">
            <CourtDiagram
              onZoneTap={handleLandscapeZoneTap}
              shots={activeGame.shots.map(s => ({ x: s.x, y: s.y, made: s.made, points: s.points }))}
              rotation={courtRotation}
              onRotate={() => setCourtRotation(r => (r + 90) % 360)}
            />
            {selectedPlayer && !hasCourtPosition && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-[11px] font-black uppercase tracking-wider shadow-lg pointer-events-none">
                Toca la cancha (2pt / 3pt) o usa TL
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 px-1 pt-1.5 flex-shrink-0">
            <Button
              onClick={() => handleResult(true)}
              disabled={!pendingShot || !selectedPlayer}
              className="h-11 text-sm font-bold bg-success text-success-foreground hover:bg-success/90 disabled:opacity-40"
            >
              ✓ Canasta {pendingShot ? `(${pendingShot.points}pt)` : ''}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResult(false)}
              disabled={!pendingShot || !selectedPlayer}
              className="h-11 text-sm font-bold disabled:opacity-40"
            >
              ✗ Fallo {pendingShot ? `(${pendingShot.points}pt)` : ''}
            </Button>
          </div>
        </div>
      </div>

      <LiveActionLog
        game={activeGame}
        onDeleteShot={deleteShot}
        onDeleteAction={deleteAction}
        onDeleteOpponentScore={deleteOpponentScore}
        onToggleShotResult={toggleShotResult}
      />

      {showReport && (
        <LiveGameReport game={activeGame} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
};

export default LiveGameLandscape;
