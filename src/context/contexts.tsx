/**
 * Sliced contexts for the app domain.
 *
 * The single source of truth still lives in AppContext (one store).
 * These selector contexts expose narrow slices to consumers so that
 * mutations in one domain (e.g. activeGame during a live game) do
 * not re-render components subscribed to other domains (e.g. Dashboard).
 *
 * Order in the tree (outer → inner): Auth → Roster → Dashboard → ActiveGame.
 */
import React, { createContext, useContext, useMemo } from 'react';
import type {
  Player, ShotEvent, Game, QuarterId, Tournament, OpponentScore,
  Team, GameLeg, Category, ActionType,
} from '@/types/basketball';
import { useApp } from '@/context/AppContext';

// ====== ROSTER (plantilla, equipos, torneos, mi equipo, categoría activa) ======
export interface RosterContextValue {
  players: Player[];
  teams: Team[];
  tournaments: Tournament[];
  myTeamName: string;
  myTeamLogo: string;
  activeCategory: Category;
  assignedCategory: string | null;
  isReadOnlyView: boolean;
  loading: boolean;
  setActiveCategory: (c: Category) => void;
  setMyTeamName: (name: string) => void;
  setMyTeamLogo: (logo: string) => void;
  addPlayer: (p: Omit<Player, 'id'>) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, name: string, number: number, propagateToHistory: boolean) => Promise<void>;
  mergePlayers: (keepId: string, removeId: string, keepNumber: number, keepName: string) => Promise<void>;
  addTournament: (t: Omit<Tournament, 'id'>) => void;
  removeTournament: (id: string) => void;
  addTeam: (t: Omit<Team, 'id'>) => void;
  removeTeam: (id: string) => void;
}
const RosterContext = createContext<RosterContextValue | null>(null);

export const RosterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const a = useApp();
  const value = useMemo<RosterContextValue>(() => ({
    players: a.players,
    teams: a.teams,
    tournaments: a.tournaments,
    myTeamName: a.myTeamName,
    myTeamLogo: a.myTeamLogo,
    activeCategory: a.activeCategory,
    assignedCategory: a.assignedCategory,
    isReadOnlyView: a.isReadOnlyView,
    loading: a.loading,
    setActiveCategory: a.setActiveCategory,
    setMyTeamName: a.setMyTeamName,
    setMyTeamLogo: a.setMyTeamLogo,
    addPlayer: a.addPlayer,
    removePlayer: a.removePlayer,
    updatePlayer: a.updatePlayer,
    mergePlayers: a.mergePlayers,
    addTournament: a.addTournament,
    removeTournament: a.removeTournament,
    addTeam: a.addTeam,
    removeTeam: a.removeTeam,
  }), [
    a.players, a.teams, a.tournaments, a.myTeamName, a.myTeamLogo,
    a.activeCategory, a.assignedCategory, a.isReadOnlyView, a.loading,
    a.setActiveCategory, a.setMyTeamName, a.setMyTeamLogo,
    a.addPlayer, a.removePlayer, a.updatePlayer, a.mergePlayers,
    a.addTournament, a.removeTournament, a.addTeam, a.removeTeam,
  ]);
  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
};
export const useRoster = (): RosterContextValue => {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be inside RosterProvider');
  return ctx;
};

// ====== DASHBOARD (lista de partidos históricos) ======
export interface DashboardContextValue {
  games: Game[];
  removeGame: (id: string) => void;
  updateGame: (game: Game) => void;
}
const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const a = useApp();
  const value = useMemo<DashboardContextValue>(() => ({
    games: a.games,
    removeGame: a.removeGame,
    updateGame: a.updateGame,
  }), [a.games, a.removeGame, a.updateGame]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
export const useDashboard = (): DashboardContextValue => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider');
  return ctx;
};

// ====== ACTIVE GAME (partido en vivo — cambia con cada tiro) ======
export interface ActiveGameContextValue {
  activeGame: Game | null;
  startGame: (opponentName: string, roster: Player[], tournamentId?: string, opponentTeamId?: string, leg?: GameLeg, isHome?: boolean) => void;
  endGame: () => void;
  setQuarter: (q: QuarterId) => void;
  recordShot: (shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>) => void;
  undoLastShot: () => void;
  setActiveGame: (game: Game) => void;
  cancelActiveGame: () => void;
  recordOpponentScore: (points: 1 | 2 | 3) => void;
  undoLastOpponentScore: () => void;
  recordAction: (playerId: string, type: ActionType) => void;
  deleteShot: (shotId: string) => void;
  deleteAction: (actionId: string) => void;
  deleteOpponentScore: (scoreId: string) => void;
  toggleShotResult: (shotId: string) => void;
  setOnCourtPlayers: (playerIds: string[]) => void;
  recordSubstitution: (playerIn: string, playerOut: string) => void;
  snapshotCourtTime: () => void;
  startGameTimer: () => void;
}
const ActiveGameContext = createContext<ActiveGameContextValue | null>(null);

export const ActiveGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const a = useApp();
  const value = useMemo<ActiveGameContextValue>(() => ({
    activeGame: a.activeGame,
    startGame: a.startGame,
    endGame: a.endGame,
    setQuarter: a.setQuarter,
    recordShot: a.recordShot,
    undoLastShot: a.undoLastShot,
    setActiveGame: a.setActiveGame,
    cancelActiveGame: a.cancelActiveGame,
    recordOpponentScore: a.recordOpponentScore,
    undoLastOpponentScore: a.undoLastOpponentScore,
    recordAction: a.recordAction,
    deleteShot: a.deleteShot,
    deleteAction: a.deleteAction,
    deleteOpponentScore: a.deleteOpponentScore,
    toggleShotResult: a.toggleShotResult,
    setOnCourtPlayers: a.setOnCourtPlayers,
    recordSubstitution: a.recordSubstitution,
    snapshotCourtTime: a.snapshotCourtTime,
    startGameTimer: a.startGameTimer,
  }), [
    a.activeGame, a.startGame, a.endGame, a.setQuarter, a.recordShot, a.undoLastShot,
    a.setActiveGame, a.cancelActiveGame, a.recordOpponentScore, a.undoLastOpponentScore,
    a.recordAction, a.deleteShot, a.deleteAction, a.deleteOpponentScore, a.toggleShotResult,
    a.setOnCourtPlayers, a.recordSubstitution, a.snapshotCourtTime, a.startGameTimer,
  ]);
  return <ActiveGameContext.Provider value={value}>{children}</ActiveGameContext.Provider>;
};
export const useActiveGame = (): ActiveGameContextValue => {
  const ctx = useContext(ActiveGameContext);
  if (!ctx) throw new Error('useActiveGame must be inside ActiveGameProvider');
  return ctx;
};

// Types only — re-exported for convenience.
export type {
  Player, ShotEvent, Game, QuarterId, Tournament, OpponentScore,
  Team, GameLeg, Category, ActionType,
};
