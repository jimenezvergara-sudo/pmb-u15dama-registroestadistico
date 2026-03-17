import React, { createContext, useContext, useState, useCallback } from 'react';
import { Player, ShotEvent, Game, QuarterId, Tournament, OpponentScore, Team, GameLeg, Category, ActionType, GameAction } from '@/types/basketball';

interface AppState {
  players: Player[];
  tournaments: Tournament[];
  teams: Team[];
  games: Game[];
  activeGame: Game | null;
  activeCategory: Category;
}

interface AppContextValue extends AppState {
  addPlayer: (p: Omit<Player, 'id'>) => void;
  removePlayer: (id: string) => void;
  removeGame: (id: string) => void;
  addTournament: (t: Omit<Tournament, 'id'>) => void;
  addTeam: (t: Omit<Team, 'id'>) => void;
  removeTeam: (id: string) => void;
  startGame: (opponentName: string, roster: Player[], tournamentId?: string, opponentTeamId?: string, leg?: GameLeg) => void;
  endGame: () => void;
  setQuarter: (q: QuarterId) => void;
  recordShot: (shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>) => void;
  undoLastShot: () => void;
  setActiveGame: (game: Game) => void;
  recordOpponentScore: (points: 1 | 2 | 3) => void;
  undoLastOpponentScore: () => void;
  setActiveCategory: (c: Category) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const genId = () => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = 'basqest';

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        teams: parsed.teams || [],
        activeCategory: parsed.activeCategory || 'U15',
      };
    }
    // Try migrating from old key
    const old = localStorage.getItem('hoopstats');
    if (old) {
      const parsed = JSON.parse(old);
      return {
        ...parsed,
        teams: parsed.teams || [],
        activeCategory: parsed.activeCategory || 'U15',
      };
    }
  } catch {}
  return { players: [], tournaments: [], teams: [], games: [], activeGame: null, activeCategory: 'U15' };
};

const saveState = (s: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadState);

  const update = useCallback((fn: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addPlayer = useCallback((p: Omit<Player, 'id'>) => {
    update(s => ({ ...s, players: [...s.players, { ...p, id: genId() }] }));
  }, [update]);

  const removePlayer = useCallback((id: string) => {
    update(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }, [update]);

  const removeGame = useCallback((id: string) => {
    update(s => ({ ...s, games: s.games.filter(g => g.id !== id) }));
  }, [update]);

  const addTournament = useCallback((t: Omit<Tournament, 'id'>) => {
    update(s => ({ ...s, tournaments: [...s.tournaments, { ...t, id: genId() }] }));
  }, [update]);

  const addTeam = useCallback((t: Omit<Team, 'id'>) => {
    update(s => ({ ...s, teams: [...s.teams, { ...t, id: genId() }] }));
  }, [update]);

  const removeTeam = useCallback((id: string) => {
    update(s => ({ ...s, teams: s.teams.filter(t => t.id !== id) }));
  }, [update]);

  const startGame = useCallback((opponentName: string, roster: Player[], tournamentId?: string, opponentTeamId?: string, leg?: GameLeg) => {
    const game: Game = {
      id: genId(),
      opponentName,
      date: new Date().toISOString(),
      roster,
      shots: [],
      opponentScores: [],
      currentQuarter: 'Q1',
      tournamentId,
      opponentTeamId,
      leg,
      category: state.activeCategory,
    };
    update(s => ({ ...s, activeGame: game }));
  }, [update, state.activeCategory]);

  const endGame = useCallback(() => {
    update(s => {
      if (!s.activeGame) return s;
      return { ...s, games: [...s.games, s.activeGame], activeGame: null };
    });
  }, [update]);

  const setQuarter = useCallback((q: QuarterId) => {
    update(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, currentQuarter: q } };
    });
  }, [update]);

  const recordShot = useCallback((shot: Omit<ShotEvent, 'id' | 'timestamp' | 'quarterId'>) => {
    update(s => {
      if (!s.activeGame) return s;
      const event: ShotEvent = {
        ...shot,
        id: genId(),
        timestamp: Date.now(),
        quarterId: s.activeGame.currentQuarter,
      };
      return { ...s, activeGame: { ...s.activeGame, shots: [...s.activeGame.shots, event] } };
    });
  }, [update]);

  const undoLastShot = useCallback(() => {
    update(s => {
      if (!s.activeGame || s.activeGame.shots.length === 0) return s;
      return { ...s, activeGame: { ...s.activeGame, shots: s.activeGame.shots.slice(0, -1) } };
    });
  }, [update]);

  const setActiveGame = useCallback((game: Game) => {
    update(s => ({ ...s, activeGame: game }));
  }, [update]);

  const recordOpponentScore = useCallback((points: 1 | 2 | 3) => {
    update(s => {
      if (!s.activeGame) return s;
      const score: OpponentScore = {
        id: genId(),
        points,
        quarterId: s.activeGame.currentQuarter,
        timestamp: Date.now(),
      };
      return { ...s, activeGame: { ...s.activeGame, opponentScores: [...(s.activeGame.opponentScores || []), score] } };
    });
  }, [update]);

  const undoLastOpponentScore = useCallback(() => {
    update(s => {
      if (!s.activeGame || !(s.activeGame.opponentScores || []).length) return s;
      return { ...s, activeGame: { ...s.activeGame, opponentScores: s.activeGame.opponentScores.slice(0, -1) } };
    });
  }, [update]);

  const setActiveCategory = useCallback((c: Category) => {
    update(s => ({ ...s, activeCategory: c }));
  }, [update]);

  return (
    <AppContext.Provider value={{
      ...state, addPlayer, removePlayer, removeGame, addTournament,
      addTeam, removeTeam,
      startGame, endGame, setQuarter, recordShot, undoLastShot, setActiveGame,
      recordOpponentScore, undoLastOpponentScore, setActiveCategory,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
