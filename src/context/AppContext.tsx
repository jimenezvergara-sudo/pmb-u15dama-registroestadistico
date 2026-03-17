import React, { createContext, useContext, useState, useCallback } from 'react';
import { Player, ShotEvent, Game, QuarterId, Tournament, OpponentScore, Team, GameLeg, Category, ActionType, GameAction, SubstitutionEvent } from '@/types/basketball';

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
  recordAction: (playerId: string, type: ActionType) => void;
  setOnCourtPlayers: (playerIds: string[]) => void;
  recordSubstitution: (playerIn: string, playerOut: string) => void;
  snapshotCourtTime: () => void;
  startGameTimer: () => void;
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

/** Flush accumulated court-time for on-court players */
const flushCourtTime = (game: Game): Game => {
  const now = Date.now();
  const last = game.lastTimerSnapshot || game.gameStartTimestamp || now;
  const elapsed = now - last;
  if (elapsed <= 0) return { ...game, lastTimerSnapshot: now };
  const courtTimeMs = { ...game.courtTimeMs };
  game.onCourtPlayerIds.forEach(pid => {
    courtTimeMs[pid] = (courtTimeMs[pid] || 0) + elapsed;
  });
  return { ...game, courtTimeMs, lastTimerSnapshot: now };
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
      actions: [],
      substitutions: [],
      currentQuarter: 'Q1',
      tournamentId,
      opponentTeamId,
      leg,
      category: state.activeCategory,
      onCourtPlayerIds: [],
      courtTimeMs: {},
    };
    update(s => ({ ...s, activeGame: game }));
  }, [update, state.activeCategory]);

  const endGame = useCallback(() => {
    update(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);
      return { ...s, games: [...s.games, flushed], activeGame: null };
    });
  }, [update]);

  const setQuarter = useCallback((q: QuarterId) => {
    update(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);
      return { ...s, activeGame: { ...flushed, currentQuarter: q } };
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

  const recordAction = useCallback((playerId: string, type: ActionType) => {
    update(s => {
      if (!s.activeGame) return s;
      const action: GameAction = {
        id: genId(),
        playerId,
        quarterId: s.activeGame.currentQuarter,
        type,
        timestamp: Date.now(),
      };
      return { ...s, activeGame: { ...s.activeGame, actions: [...(s.activeGame.actions || []), action] } };
    });
  }, [update]);

  const setOnCourtPlayers = useCallback((playerIds: string[]) => {
    update(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: { ...s.activeGame, onCourtPlayerIds: playerIds } };
    });
  }, [update]);

  const recordSubstitution = useCallback((playerIn: string, playerOut: string) => {
    update(s => {
      if (!s.activeGame) return s;
      const flushed = flushCourtTime(s.activeGame);
      const sub: SubstitutionEvent = {
        id: genId(),
        playerIn,
        playerOut,
        quarterId: flushed.currentQuarter,
        timestamp: Date.now(),
      };
      const newOnCourt = flushed.onCourtPlayerIds.filter(id => id !== playerOut).concat(playerIn);
      return {
        ...s,
        activeGame: {
          ...flushed,
          substitutions: [...(flushed.substitutions || []), sub],
          onCourtPlayerIds: newOnCourt,
        },
      };
    });
  }, [update]);

  const snapshotCourtTime = useCallback(() => {
    update(s => {
      if (!s.activeGame) return s;
      return { ...s, activeGame: flushCourtTime(s.activeGame) };
    });
  }, [update]);

  const startGameTimer = useCallback(() => {
    update(s => {
      if (!s.activeGame) return s;
      const now = Date.now();
      return { ...s, activeGame: { ...s.activeGame, gameStartTimestamp: now, lastTimerSnapshot: now } };
    });
  }, [update]);

  return (
    <AppContext.Provider value={{
      ...state, addPlayer, removePlayer, removeGame, addTournament,
      addTeam, removeTeam,
      startGame, endGame, setQuarter, recordShot, undoLastShot, setActiveGame,
      recordOpponentScore, undoLastOpponentScore, setActiveCategory, recordAction,
      setOnCourtPlayers, recordSubstitution, snapshotCourtTime, startGameTimer,
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
